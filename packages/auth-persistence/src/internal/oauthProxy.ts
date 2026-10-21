import { FlowContext, Persistence, Record, Unavailable } from "@effect/auth/OAuthProxy"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

import { identifier } from "./sqlTable.ts"
import { requireStandalone } from "./standalone.ts"

export const oauthProxyColumns = {
  namespace: "namespace",
  flowId: "flow_id",
  version: "version",
  stage: "stage",
  context: "context",
  expiresAtMillis: "expires_at_millis",
  handoffExpiresAtMillis: "handoff_expires_at_millis",
  payload: "payload"
} as const

/** Plain text and integer-millisecond storage; adapters supply physical names. */
export interface OAuthProxySqlTable {
  readonly name: string
  readonly schema?: string
  readonly columns: { readonly [K in keyof typeof oauthProxyColumns]: string }
}

const codec = Schema.fromJsonString(Record)
const contextCodec = Schema.fromJsonString(FlowContext)

const Row = Schema.Struct({
  payload: Schema.String,
  version: Schema.String,
  stage: Schema.String,
  context: Schema.String,
  expiry: Schema.String,
  deadline: Schema.NullOr(Schema.String)
})

/** SQLite/D1 and PostgreSQL; apply once through application migrations.
 * Retain terminal records until expires_at_millis, then expired rows may be deleted.
 * Context and stage columns guard each standalone transition without a prior read.
 */
const migration = `CREATE TABLE yielded_oauth_proxy (
  namespace TEXT NOT NULL,
  flow_id TEXT NOT NULL,
  version TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('Pending', 'Exchanging', 'Ready', 'Consumed')),
  context TEXT NOT NULL,
  expires_at_millis BIGINT NOT NULL,
  handoff_expires_at_millis BIGINT,
  payload TEXT NOT NULL,
  PRIMARY KEY (namespace, flow_id),
  CHECK ((stage = 'Ready' AND handoff_expires_at_millis IS NOT NULL)
    OR (stage <> 'Ready' AND handoff_expires_at_millis IS NULL))
)`

export const makeOAuthProxyPersistence = Effect.fnUntraced(function*(table: OAuthProxySqlTable) {
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()

  if (!sql.onDialectOrElse({ sqlite: () => true, pg: () => true, orElse: () => false })) {
    return yield* Unavailable.make({})
  }

  const names = Object.values(table.columns)

  if (
    [table.name, table.schema ?? "main", ...names].some((name) => !name || name.includes("\0")) ||
    new Set(names).size !== names.length
  ) {
    return yield* Unavailable.make({})
  }

  const name = sql.literal(
    (table.schema === undefined ? "" : `${identifier(table.schema)}.`) + identifier(table.name)
  )

  const column = (key: keyof typeof oauthProxyColumns) => sql.literal(identifier(table.columns[key]))

  const standalone = requireStandalone(() => Unavailable.make({}), sql.transactionService)

  const failure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    reportPersistenceFailure(effect, Schema.is(Unavailable), { markReported: true }).pipe(
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
    )

  const clock = sql.onDialectOrElse({
    sqlite: () => sql.literal("CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)"),
    orElse: () => sql.literal("CAST(EXTRACT(EPOCH FROM clock_timestamp()) * 1000 AS BIGINT)")
  })

  return Persistence.of({
    get: Effect.fnUntraced(function*(namespace, id) {
      yield* standalone

      const rows = yield* sql`SELECT ${column("payload")} AS payload,
          ${column("version")} AS version, ${column("stage")} AS stage, ${column("context")} AS context,
          CAST(${column("expiresAtMillis")} AS TEXT) AS expiry,
          CAST(${column("handoffExpiresAtMillis")} AS TEXT) AS deadline
          FROM ${name} WHERE ${column("namespace")} = ${namespace} AND ${column("flowId")} = ${id}`

      if (rows.length === 0) return undefined
      if (rows.length !== 1) return yield* Unavailable.make({})
      const row = yield* Schema.decodeUnknownEffect(Row)(rows[0])
      const record = yield* Schema.decodeEffect(codec)(row.payload)
      const context = yield* Schema.encodeEffect(contextCodec)(record.context)

      if (
        record.context.id !== id ||
        record.version !== row.version ||
        record._tag !== row.stage ||
        context !== row.context ||
        String(record.context.expiresAtMillis) !== row.expiry ||
        (record._tag === "Ready" ? String(record.handoffExpiresAtMillis) : null) !== row.deadline
      ) {
        return yield* Unavailable.make({})
      }

      return record
    }, failure),
    insert: Effect.fnUntraced(function*(namespace, record) {
      yield* standalone
      if (record._tag !== "Pending") return yield* Unavailable.make({})
      const payload = yield* Schema.encodeEffect(codec)(record)
      const context = yield* Schema.encodeEffect(contextCodec)(record.context)

      const rows = yield* sql`INSERT INTO ${name}
          (${column("namespace")}, ${column("flowId")}, ${column("version")}, ${column("stage")},
            ${column("context")}, ${column("expiresAtMillis")}, ${column("payload")})
          SELECT ${namespace}, ${record.context.id}, ${record.version}, ${record._tag},
            ${context}, ${record.context.expiresAtMillis}, ${payload}
          WHERE ${record.context.expiresAtMillis} > ${clock}
          ON CONFLICT (${column("namespace")}, ${column("flowId")}) DO NOTHING
          RETURNING ${column("version")}`

      return rows.length === 1
    }, failure),
    compareAndSet: Effect.fnUntraced(function*(namespace, version, record) {
      yield* standalone
      if (version === record.version || record._tag === "Pending") {
        return yield* Unavailable.make({})
      }

      // Explicitly omit private envelopes from both irreversible marker stages.
      const payload = yield* Schema.encodeEffect(codec)(
        record._tag === "Ready"
          ? record
          : { _tag: record._tag, version: record.version, context: record.context }
      )

      const context = yield* Schema.encodeEffect(contextCodec)(record.context)

      const previous = record._tag === "Exchanging" ? "Pending" : record._tag === "Ready" ? "Exchanging" : "Ready"

      const deadline = record._tag === "Ready" ? record.handoffExpiresAtMillis : null

      const consume = record._tag === "Consumed"
        ? sql`AND ${column("handoffExpiresAtMillis")} > ${clock}`
        : sql.literal("")

      const rows = yield* sql`UPDATE ${name}
          SET ${column("version")} = ${record.version}, ${column("stage")} = ${record._tag},
            ${column("handoffExpiresAtMillis")} = ${deadline}, ${column("payload")} = ${payload}
          WHERE ${column("namespace")} = ${namespace} AND ${column("flowId")} = ${record.context.id}
            AND ${column("version")} = ${version} AND ${column("stage")} = ${previous}
            AND ${column("context")} = ${context}
            AND ${column("expiresAtMillis")} = ${record.context.expiresAtMillis}
            AND ${column("expiresAtMillis")} > ${clock} ${consume}
          RETURNING ${column("version")}`

      return rows.length === 1
    }, failure)
  })
})

const layer = Layer.effect(
  Persistence,
  makeOAuthProxyPersistence({ name: "yielded_oauth_proxy", columns: oauthProxyColumns })
)

export const OAuthProxyPersistence = { migration, layer }
