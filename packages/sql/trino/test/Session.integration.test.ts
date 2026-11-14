import { TrinoClient } from "@effect/sql-trino"
import { assert, it } from "@effect/vitest"
import { Effect, Exit, Layer, Option } from "effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as Reactivity from "effect/reactivity/Reactivity"
import type { Connection } from "effect/sql/SqlConnection"
import { coordinatorUrl, layerTimeout, TrinoContainer } from "./utils.ts"

// Model-based test of the client-side session: a script of
// session-changing statements runs on one reserved connection. After every
// step the connection's own state, the server's view of the session (read
// through the same connection) and a model of Trino's semantics must agree.

const properties = {
  query_max_run_time: { values: ["1h", "2h"], literal: (value: string) => `'${value}'` },
  join_distribution_type: { values: ["BROADCAST", "PARTITIONED"], literal: (value: string) => `'${value}'` },
  task_concurrency: { values: ["4", "8"], literal: (value: string) => value }
} as const
type Property = keyof typeof properties

type Command =
  | { readonly _tag: "Use"; readonly target: string }
  | { readonly _tag: "SetSession"; readonly property: Property; readonly choice: 0 | 1 }
  | { readonly _tag: "ResetSession"; readonly property: Property }
  | { readonly _tag: "Prepare"; readonly name: string; readonly value: number }
  | { readonly _tag: "Deallocate"; readonly name: string }
  | { readonly _tag: "SetPath"; readonly path: string }
  | { readonly _tag: "SetTimeZone"; readonly zone: string }
  | { readonly _tag: "SetAuthorization"; readonly user: string }
  | { readonly _tag: "ResetAuthorization" }
  | { readonly _tag: "StartTransaction" }
  | { readonly _tag: "Commit" }
  | { readonly _tag: "Rollback" }

// Every command once, in a state where Trino accepts it, then the ones it refuses: COMMIT outside a
// transaction, and DEALLOCATE of a statement that is gone, which aborts the open transaction until ROLLBACK.
const script: ReadonlyArray<Command> = [
  { _tag: "Use", target: "tpch.tiny" },
  { _tag: "SetSession", property: "query_max_run_time", choice: 0 },
  { _tag: "SetSession", property: "join_distribution_type", choice: 1 },
  { _tag: "ResetSession", property: "query_max_run_time" },
  { _tag: "Prepare", name: "p1", value: 1 },
  { _tag: "Deallocate", name: "p1" },
  { _tag: "SetPath", path: "system.runtime" },
  { _tag: "SetTimeZone", zone: "Europe/Dublin" },
  { _tag: "SetAuthorization", user: "alice" },
  { _tag: "ResetAuthorization" },
  { _tag: "StartTransaction" },
  { _tag: "Use", target: "memory.default" },
  { _tag: "Commit" },
  { _tag: "Commit" },
  { _tag: "StartTransaction" },
  { _tag: "Deallocate", name: "p1" },
  { _tag: "Commit" }
]

interface Model {
  readonly catalog: string | undefined
  readonly schema: string | undefined
  readonly user: string
  readonly path: string | undefined
  readonly zone: string | undefined
  readonly properties: ReadonlyMap<Property, string>
  readonly prepared: ReadonlyMap<string, string>
  readonly transaction: "none" | "open" | "aborted"
}

const initial: Model = {
  catalog: undefined,
  schema: undefined,
  user: "test",
  path: undefined,
  zone: undefined,
  properties: new Map(),
  prepared: new Map(),
  transaction: "none"
}

const statementOf = (command: Command): string => {
  switch (command._tag) {
    case "Use":
      return `USE ${command.target}`
    case "SetSession": {
      const property = properties[command.property]
      return `SET SESSION ${command.property} = ${property.literal(property.values[command.choice])}`
    }
    case "ResetSession":
      return `RESET SESSION ${command.property}`
    case "Prepare":
      return `PREPARE ${command.name} FROM SELECT ${command.value}`
    case "Deallocate":
      return `DEALLOCATE PREPARE ${command.name}`
    case "SetPath":
      return `SET PATH ${command.path}`
    case "SetTimeZone":
      return `SET TIME ZONE '${command.zone}'`
    case "SetAuthorization":
      return `SET SESSION AUTHORIZATION '${command.user}'`
    case "ResetAuthorization":
      return "RESET SESSION AUTHORIZATION"
    case "StartTransaction":
      return "START TRANSACTION"
    case "Commit":
      return "COMMIT"
    case "Rollback":
      return "ROLLBACK"
  }
}

/** Whether Trino accepts the command in the model's state. */
const accepts = (model: Model, command: Command): boolean => {
  switch (command._tag) {
    case "StartTransaction":
      return model.transaction === "none"
    case "Commit":
    case "Rollback":
      return model.transaction === "open"
    case "Deallocate":
      return model.prepared.has(command.name)
    case "SetAuthorization":
    case "ResetAuthorization":
      return model.transaction === "none"
    default:
      return true
  }
}

/** The model after the command; session changes are client-side and survive ROLLBACK. */
const step = (model: Model, command: Command): Model => {
  if (!accepts(model, command)) {
    return model.transaction === "open" ? { ...model, transaction: "aborted" } : model
  }
  switch (command._tag) {
    case "Use": {
      const [catalog, schema] = command.target.split(".")
      return { ...model, catalog, schema }
    }
    case "SetSession":
      return {
        ...model,
        properties: new Map(model.properties).set(
          command.property,
          properties[command.property].values[command.choice]
        )
      }
    case "ResetSession": {
      const next = new Map(model.properties)
      next.delete(command.property)
      return { ...model, properties: next }
    }
    case "Prepare":
      return { ...model, prepared: new Map(model.prepared).set(command.name, `SELECT ${command.value}`) }
    case "Deallocate": {
      const next = new Map(model.prepared)
      next.delete(command.name)
      return { ...model, prepared: next }
    }
    case "SetPath":
      return { ...model, path: command.path }
    case "SetTimeZone":
      return { ...model, zone: command.zone }
    case "SetAuthorization":
      return { ...model, user: command.user }
    case "ResetAuthorization":
      return { ...model, user: "test" }
    case "StartTransaction":
      return { ...model, transaction: "open" }
    case "Commit":
    case "Rollback":
      return { ...model, transaction: "none" }
  }
}

const unquote = (value: unknown) => typeof value === "string" ? value.replaceAll("\"", "").replaceAll(" ", "") : value

const run = (conn: Connection, sql: string) => conn.executeUnprepared(sql, [], undefined)

/** Compares the connection's state and the server's view of it with the model. */
const verify = Effect.fnUntraced(function*(conn: Connection, model: Model, history: string) {
  const session = Option.getOrThrow(yield* TrinoClient.connectionSession(conn))
  assert.strictEqual(session.catalog, model.catalog, `catalog after ${history}`)
  assert.strictEqual(session.schema, model.schema, `schema after ${history}`)
  assert.strictEqual(session.authorizationUser ?? "test", model.user, `authorization user after ${history}`)
  assert.strictEqual(session.transactionId !== undefined, model.transaction !== "none", `transaction after ${history}`)
  assert.deepStrictEqual(
    [...session.preparedStatements.keys()].sort(),
    [...model.prepared.keys()].sort(),
    `prepared statements after ${history}`
  )
  if (model.transaction === "aborted") {
    // Every statement but ROLLBACK fails until the transaction ends.
    return
  }

  const [truth] = yield* run(
    conn,
    "SELECT current_catalog AS catalog, current_schema AS schema, current_user AS usr, current_path AS path, current_timezone() AS zone"
  )
  assert.strictEqual(truth.catalog ?? undefined, model.catalog, `server catalog after ${history}`)
  assert.strictEqual(truth.schema ?? undefined, model.schema, `server schema after ${history}`)
  assert.strictEqual(truth.usr, model.user, `server user after ${history}`)
  if (model.path !== undefined) {
    assert.strictEqual(unquote(truth.path), model.path, `server path after ${history}`)
  }
  if (model.zone !== undefined) {
    assert.strictEqual(truth.zone, model.zone, `server time zone after ${history}`)
  }

  const shown = yield* run(conn, "SHOW SESSION")
  for (const name of Object.keys(properties) as Array<Property>) {
    const row = shown.find((row) => row.Name === name)
    assert.isDefined(row, `SHOW SESSION lists ${name}`)
    assert.strictEqual(row.Value, model.properties.get(name) ?? row.Default, `${name} after ${history}`)
  }

  for (const name of ["p1", "p2"]) {
    const exists = model.prepared.has(name)
    // A failing statement would abort an open transaction, so only existing
    // statements are probed inside one.
    if (!exists && model.transaction === "open") continue
    const exit = yield* Effect.exit(run(conn, `DESCRIBE OUTPUT ${name}`))
    assert.strictEqual(Exit.isSuccess(exit), exists, `prepared ${name} after ${history}`)
  }
})

const timeout = 120_000

it.layer(TrinoContainer.layerClient.pipe(Layer.provideMerge(TrinoContainer.layer)), {
  timeout: layerTimeout,
  excludeTestServices: true
})("TrinoClient session", (it) => {
  it.effect(
    "keeps the client-side session equal to the server's view and to the model",
    Effect.fnUntraced(function*() {
      const sql = yield* TrinoClient.TrinoClient
      yield* Effect.scoped(Effect.gen(function*() {
        const conn = yield* sql.reserve
        let model = initial
        const history: Array<string> = []
        yield* Effect.gen(function*() {
          for (const scripted of script) {
            // An aborted transaction only takes ROLLBACK.
            const command: Command = model.transaction === "aborted" ? { _tag: "Rollback" } : scripted
            const statement = statementOf(command)
            history.push(statement)
            const exit = yield* Effect.exit(run(conn, statement))
            const accepted = accepts(model, command) || model.transaction === "aborted"
            assert.strictEqual(
              Exit.isSuccess(exit),
              accepted,
              `${statement} ${accepted ? "failed" : "succeeded"} after ${history.join("; ")}: ${
                Exit.isFailure(exit) ? String(exit.cause) : ""
              }`
            )
            model = model.transaction === "aborted" ? { ...model, transaction: "none" } : step(model, command)
            yield* verify(conn, model, history.join("; "))
          }
        }).pipe(
          Effect.ensuring(
            Effect.suspend(() => model.transaction === "none" ? Effect.void : Effect.ignore(run(conn, "ROLLBACK")))
          )
        )
      }))
      // The shared session never sees a reserved connection's changes.
      const shared = yield* sql.session
      assert.strictEqual(shared.catalog, undefined)
      assert.strictEqual(shared.properties.size, 0)
      assert.strictEqual(shared.transactionId, undefined)
    }),
    timeout
  )

  it.effect(
    "keeps a transaction's session changes after COMMIT and in the shared session",
    () =>
      Effect.gen(function*() {
        // Its own client: the shared one is also used by the property above.
        const sql = yield* TrinoClient.make({ url: coordinatorUrl(yield* TrinoContainer), user: "test" }).pipe(
          Effect.provide([FetchHttpClient.layer, Reactivity.layer])
        )
        yield* sql.withTransaction(Effect.gen(function*() {
          yield* sql`USE tpch.tiny`
          yield* sql`SET SESSION query_max_run_time = '2h'`
        }))
        const shared = yield* sql.session
        assert.strictEqual(shared.catalog, "tpch")
        assert.strictEqual(shared.schema, "tiny")
        assert.strictEqual(shared.properties.get("query_max_run_time"), "2h")
        assert.strictEqual(shared.transactionId, undefined)
        const [row] = yield* sql<{ n: bigint }>`SELECT count(*) AS n FROM region`
        assert.strictEqual(row.n, 5n)
      }).pipe(Effect.scoped),
    timeout
  )
})
