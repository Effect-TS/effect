import type { OAuthSealedTransaction, OAuthSignInAccess, OAuthSignInTransactionContext } from "@effect/auth/OAuth"
import type { SubjectId } from "@effect/auth/Schema"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import { SqlError } from "effect/sql/SqlError"

import { sqlBatchAssertion } from "../d1Planning.ts"
import { isMappedConstraintConflict, PersistenceMappingError } from "../mappingError.ts"
import type { SubjectIdCodec } from "../models/common.ts"
import type { OAuthClock, OAuthFlowTable } from "../models/oauthModel.ts"
import type { NativeSqlTables } from "../nativeSqlTable.ts"
import { exactSqlText, executeSqlChange } from "../sqlChange.ts"
import { cleanupSqlRows } from "../sqlCleanup.ts"
import {
  appendSqlBatchStatement,
  CurrentSqlCommit,
  registerSqlBatchPostcondition,
  registerSqlPostcondition
} from "../sqlCommit.ts"
import type { SqlExpression, TableModel } from "../tableModel.ts"
import { invalidState, storage } from "./state.ts"

type FlowContext = Omit<OAuthSignInTransactionContext, "namespace" | "returnTarget" | "access">

/** @internal */
export interface OAuthFlowValue {
  readonly context: FlowContext
  readonly sealed: OAuthSealedTransaction
}

/** @internal */
export interface OAuthNativeFlowMapping {
  readonly flow: OAuthFlowTable<TableModel>
  // The physical adapter validates and compiles its expression representation.
  readonly clock: OAuthClock<SqlExpression>
  readonly subjectId: SubjectIdCodec<unknown>
}

/**
 * One immutable row survives only until conditional consumption or expiry.
 *
 * @internal
 */
export const makeOAuthNativeFlow = Effect.fnUntraced(function*<Flow extends OAuthFlowValue>(
  tables: NativeSqlTables,
  mapping: OAuthNativeFlowMapping,
  codec: Schema.Codec<Flow, unknown, never, never>,
  purpose: "sign-in" | "link" | "connect",
  subjectId: (flow: Flow) => SubjectId | undefined,
  batch = false
) {
  const boundOwner = yield* Effect.serviceOption(CurrentSqlCommit)
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const flow = tables(mapping.flow.table)
  const f = mapping.flow
  const persisted = storage(codec)
  const now = tables.expression(mapping.clock.engineNowMillis)
  const mysql = sql.onDialectOrElse({ mysql: () => true, orElse: () => false })
  const millis = (key: string) => tables.expression(mapping.clock.toMillis(flow.column(key)))

  const exact = (key: string, input: unknown) => exactSqlText(sql, flow.column(key), flow.value(key, input))

  const access = Effect.fnUntraced(function*(
    input: OAuthSignInAccess & {
      readonly subjectId?: SubjectId
      readonly formPostSubject?: boolean
    }
  ) {
    const nativeId = input.formPostSubject === true || input.subjectId === undefined
      ? undefined
      : yield* mapping.subjectId.toNative(input.subjectId)

    return sql.and([
      exact(f.moduleId, input.moduleId),
      exact(f.purpose, purpose),
      exact(f.flowId, input.flowId),
      sql`${flow.column(f.generation)} = ${flow.value(f.generation, input.generation)}`,
      exact(f.provider, input.provider),
      exact(f.callbackId, input.callbackId),
      exact(f.stateDigest, input.stateDigest),
      exact(f.binderVerifier, input.requestBindingVerifier),
      sql`${flow.column(f.binderExpiresAt)} = ${
        flow.value(f.binderExpiresAt, mapping.clock.encodeInstant(input.requestBindingExpiresAtMillis))
      }`,
      sql`${millis(f.binderExpiresAt)} > ${now}`,
      sql`${millis(f.expiresAt)} > ${now}`,
      sql`${millis(f.issuedAt)} <= ${now}`,
      input.formPostSubject === true
        ? sql`${flow.column(f.subjectId)} is not null`
        : nativeId === undefined
        ? sql`${flow.column(f.subjectId)} is null`
        : sql`${flow.column(f.subjectId)} = ${flow.value(f.subjectId, nativeId)}`,
      input.responseIssuer === undefined
        ? exact(f.responseIssuerMode, "unsupported")
        : sql.and([exact(f.responseIssuerMode, "required"), exact(f.issuer, input.responseIssuer)])
    ])
  })

  const issue = Effect.fnUntraced(function*(value: Flow) {
    const context = value.context
    const owner = subjectId(value)
    const nativeId = owner === undefined ? null : yield* mapping.subjectId.toNative(owner)

    if (
      context.issuedAtMillis >= context.expiresAtMillis ||
      context.expiresAtMillis > context.requestBindingExpiresAtMillis
    ) {
      return false
    }

    const statement = sql`${
      flow.insert({
        ...f.encodeInsert({ moduleId: context.moduleId, flowId: context.flowId, purpose }),
        [f.moduleId]: context.moduleId,
        [f.flowId]: context.flowId,
        [f.purpose]: purpose,
        [f.generation]: context.generation,
        [f.provider]: context.provider,
        [f.callbackId]: context.callbackId,
        [f.issuer]: context.issuer,
        [f.responseIssuerMode]: context.responseIssuerMode,
        [f.subjectId]: nativeId,
        [f.stateDigest]: context.stateDigest,
        [f.binderVerifier]: context.requestBindingVerifier,
        [f.binderExpiresAt]: mapping.clock.encodeInstant(context.requestBindingExpiresAtMillis),
        [f.issuedAt]: mapping.clock.encodeInstant(context.issuedAtMillis),
        [f.expiresAt]: mapping.clock.encodeInstant(context.expiresAtMillis),
        [f.snapshot]: persisted.encode(value)
      })
    } ${mysql ? sql`` : sql`on conflict do nothing`}`

    return yield* Effect.gen(function*() {
      if (batch) {
        const clock = yield* sql`select ${now} as engine_now`
        const engineNow = yield* Schema.decodeEffect(Schema.Int)(Number(clock[0]?.engine_now))

        if (context.issuedAtMillis > engineNow || context.expiresAtMillis <= engineNow) {
          return false
        }
        yield* appendSqlBatchStatement(
          sqlBatchAssertion(
            sql,
            sql`${now} >= ${context.issuedAtMillis} and ${now} < ${context.expiresAtMillis}`
          )
        )
        yield* appendSqlBatchStatement(statement)
        yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = 1`))

        return true
      }

      const rows = mysql
        ? (yield* executeSqlChange(sql, statement)) === 1
          ? yield* sql`select ${now} as engine_now`
          : []
        : yield* sql`${statement} returning ${now} as engine_now`

      if (rows.length === 0) return false
      if (!(rows.length === 1)) return yield* invalidState()
      const engineNow = yield* Schema.decodeEffect(Schema.Int)(Number(rows[0]!.engine_now))

      return context.issuedAtMillis <= engineNow && context.expiresAtMillis > engineNow
    }).pipe(
      Effect.catchCauseIf(
        (cause) =>
          isMappedConstraintConflict(
            (error) => Schema.is(SqlError)(error) && error.reason._tag === "UniqueViolation",
            cause
          ),
        () => Effect.succeed(false)
      )
    )
  })

  const consumeMatching = Effect.fnUntraced(function*(
    input: OAuthSignInAccess & { readonly subjectId?: SubjectId }
  ) {
    const predicate = yield* access(input)
    const deletion = sql`delete from ${flow.name} where ${predicate}`

    // MySQL has no DELETE RETURNING. Its caller owns one transaction and this
    // locking read; PostgreSQL and SQLite consume in one statement.
    const rows = batch
      ? yield* sql`select ${flow.fields("oauth_flow_")} from ${flow.name} where ${predicate}`
      : mysql
      ? yield* sql`select ${flow.fields("oauth_flow_")} from ${flow.name} where ${predicate} for update`
      : yield* sql`${deletion} returning ${flow.fields("oauth_flow_")}`

    if (rows.length === 0) return undefined
    if (!(rows.length === 1)) return yield* invalidState()
    const row = flow.decode(rows[0]!, "oauth_flow_")
    const encoded = row[f.snapshot]

    if (!(Predicate.isString(encoded))) return yield* invalidState()
    const value = persisted.decode(encoded)
    const context = value.context

    if (
      !(
        context.moduleId === input.moduleId &&
        context.flowId === input.flowId &&
        context.generation === input.generation &&
        context.provider === input.provider &&
        context.callbackId === input.callbackId &&
        context.stateDigest === input.stateDigest &&
        context.requestBindingVerifier === input.requestBindingVerifier &&
        context.requestBindingExpiresAtMillis === input.requestBindingExpiresAtMillis &&
        context.issuedAtMillis === mapping.clock.decodeInstant(row[f.issuedAt]) &&
        context.expiresAtMillis === mapping.clock.decodeInstant(row[f.expiresAt]) &&
        subjectId(value) === input.subjectId &&
        (input.responseIssuer === undefined
          ? context.responseIssuerMode === "unsupported"
          : context.responseIssuerMode === "required" && context.issuer === input.responseIssuer)
      )
    ) {
      return yield* invalidState()
    }

    if (mysql) {
      if (!((yield* executeSqlChange(sql, deletion)) === 1)) return yield* invalidState()
    }

    if (batch) {
      // Planning reads convey no authority. The same access and exact immutable
      // snapshot must still match inside the atomic primary-engine batch.
      yield* appendSqlBatchStatement(sql`${deletion} and ${exact(f.snapshot, encoded)}`)
      yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = 1`))
    }

    if (Option.isSome(boundOwner) && boundOwner.value.mode === "transaction") {
      // Bound application work may follow consumption. Confirm the exact key
      // stays absent at the physical commit; unrelated/new flows remain valid.
      yield* registerSqlPostcondition({
        name: "oauth-consumed-flow-absent",
        check: Effect.gen(function*() {
          const restored = yield* sql`select 1 from ${flow.name}
            where ${exact(f.moduleId, input.moduleId)} and ${exact(f.flowId, input.flowId)} limit 1`

          if (!(restored.length === 0)) {
            return yield* PersistenceMappingError.make({
              operation: "postcondition",
              cause: invalidState()
            })
          }
        })
      })
    }

    if (Option.isSome(boundOwner) && boundOwner.value.mode === "batch") {
      yield* registerSqlBatchPostcondition({
        name: "oauth-consumed-flow-absent",
        statement: sqlBatchAssertion(
          sql,
          sql`not exists(select 1 from ${flow.name} where ${exact(f.moduleId, input.moduleId)} and ${
            exact(f.flowId, input.flowId)
          })`
        )
      })
    }

    return value
  })

  const consume = Effect.fnUntraced(function*(
    input: OAuthSignInAccess & {
      readonly subjectId?: SubjectId
      readonly formPostSubject?: boolean
    }
  ) {
    if (input.formPostSubject !== true) return yield* consumeMatching(input)

    const predicate = yield* access(input)

    const rows = mysql
      ? yield* sql`select ${flow.fields("oauth_flow_")} from ${flow.name} where ${predicate} for update`
      : yield* sql`select ${flow.fields("oauth_flow_")} from ${flow.name} where ${predicate}`

    if (rows.length === 0) return undefined
    if (!(rows.length === 1)) return yield* invalidState()
    const row = flow.decode(rows[0]!, "oauth_flow_")
    const encoded = row[f.snapshot]

    if (!(Predicate.isString(encoded))) return yield* invalidState()
    const value = persisted.decode(encoded)
    const owner = subjectId(value)

    if (value.context.responseMode !== "form_post" || owner === undefined) return undefined

    const { formPostSubject: _formPostSubject, ...matched } = input

    return yield* consumeMatching({ ...matched, subjectId: owner })
  })

  const cleanup = (moduleId: string, limit: number) =>
    cleanupSqlRows(
      [
        {
          table: flow,
          keys: [f.moduleId, f.flowId],
          due: sql.and([
            exact(f.moduleId, moduleId),
            exact(f.purpose, purpose),
            sql`${millis(f.expiresAt)} <= ${now}`
          ]),
          order: [flow.column(f.expiresAt), flow.column(f.flowId)]
        }
      ],
      limit,
      batch
    )

  return { issue, consume, cleanup, mysql }
})
