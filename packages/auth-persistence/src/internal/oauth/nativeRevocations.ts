import type { LifecycleHooks } from "@effect/auth/Hooks"
import * as OAuth from "@effect/auth/OAuth"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { sqlBatchAssertion } from "../d1Planning.ts"
import { PersistenceMappingError } from "../mappingError.ts"
import type { OAuthConnectedRevocationMapping } from "../models/oauthConnectedModel.ts"
import type { NativeSqlTables } from "../nativeSqlTable.ts"
import { exactSqlText, executeSqlChange } from "../sqlChange.ts"
import {
  appendSqlBatchStatement,
  CurrentSqlCommit,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlPostcondition,
  SqlBatchCommit
} from "../sqlCommit.ts"
import type { SqlExpression, TableModel } from "../tableModel.ts"
import { prepareOAuthNative } from "./nativeSignIn.ts"
import { invalidState, storage, unavailable } from "./state.ts"

// The driver validates physical metadata; schema decoding owns durable values.
export type OAuthNativeRevocationMapping = OAuthConnectedRevocationMapping<
  TableModel,
  TableModel,
  TableModel,
  unknown,
  SqlExpression
>

export const makeNativeOAuthRevocationServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: OAuthNativeRevocationMapping,
  batch?: SqlBatchCommit["Service"]
): Effect.fn.Return<
  { readonly oauthConnectedRevocations: OAuth.OAuthConnectedRevocations["Service"] },
  OAuth.OAuthUnavailable,
  SqlClient.SqlClient | LifecycleHooks
> {
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const external = yield* Effect.serviceOption(CurrentSqlCommit)
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const job = tables(mapping.job.table)
  const j = mapping.job
  const now = tables.expression(mapping.clock.engineNowMillis)
  const stored = storage(OAuth.OAuthConnectedRevocationJob)

  const exact = (key: string, value: unknown) => exactSqlText(sql, job.column(key), job.value(key, value))

  const lock = batch === undefined
    ? sql.onDialectOrElse({ sqlite: () => sql``, orElse: () => sql`for update` })
    : sql``

  const run = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    mode: "transaction" | "statement" = "transaction"
  ) =>
    batch === undefined
      ? executor.run(effect, mode)
      : executor.batch(effect).pipe(Effect.provideService(SqlBatchCommit, batch))

  const change = Effect.fnUntraced(function*(statement: Fragment) {
    if (batch !== undefined) {
      yield* appendSqlBatchStatement(sql`${statement}`)
      yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = 1`))
    } else {
      if (!((yield* executeSqlChange(sql, statement)) === 1)) return yield* invalidState()
    }
  })

  const finish = (condition: Fragment) =>
    batch === undefined
      ? registerSqlPostcondition({
        name: "oauth-revocation",
        check: Effect.gen(function*() {
          if (!((yield* sql`select 1 where ${condition}`).length === 1)) {
            return yield* PersistenceMappingError.make({
              operation: "postcondition",
              cause: invalidState()
            })
          }
        })
      })
      : registerSqlBatchPostcondition({
        name: "oauth-revocation",
        statement: sqlBatchAssertion(sql, condition)
      })

  const service: OAuth.OAuthConnectedRevocations["Service"] = {
    claim: (input, prepare) =>
      run(
        Effect.gen(function*() {
          const moduleId = OAuth.snapshotOAuthSync(OAuth.OAuthModuleId, input.moduleId)
          const claimId = OAuth.snapshotOAuthSync(OAuth.OAuthClaimId, input.claimId)

          if (
            !(
              Number.isSafeInteger(input.lifetimeMillis) &&
              input.lifetimeMillis >= 1000 &&
              input.lifetimeMillis <= 300000
            )
          ) {
            return yield* invalidState()
          }

          const pending = sql.and([
            exact(j.moduleId, moduleId),
            exact(j.state, "Pending"),
            sql`${tables.expression(mapping.clock.toMillis(job.column(j.retentionUntil)))} > ${now}`
          ])

          const rows = yield* sql`select ${
            job.fields("job_")
          }, ${now} as engine_now from ${job.name} where ${pending} order by ${job.column(j.retentionUntil)}, ${
            job.column(j.jobId)
          } limit 1 ${lock}`

          if (rows[0] === undefined) return yield* prepareOAuthNative({ _tag: "Empty" }, prepare)
          const row = job.decode(rows[0], "job_")
          const encoded = row[j.snapshot]

          if (!(Predicate.isString(encoded))) return yield* invalidState()
          const value = stored.decode(encoded)

          if (
            !(
              row[j.jobId] === value.jobId &&
              value.grant.context.moduleId === moduleId &&
              mapping.subjectId.equals(
                row[j.subjectId],
                yield* mapping.subjectId.toNative(value.grant.context.subjectId)
              )
            )
          ) {
            return yield* invalidState()
          }
          const engineNow = yield* Schema.decodeEffect(Schema.Int)(Number(rows[0].engine_now))

          const deadline = engineNow + input.lifetimeMillis

          // A claim always gets its full lifetime; retention extends to cover it so
          // cleanup cannot delete a job while its revocation attempt is live.
          const retention = Math.max(mapping.clock.decodeInstant(row[j.retentionUntil]), deadline)

          const claim = OAuth.snapshotOAuthSync(OAuth.OAuthConnectedRevocationClaim, {
            job: value,
            claimId,
            claimedAtMillis: engineNow,
            claimExpiresAtMillis: deadline
          })

          yield* change(
            sql`${
              job.update({
                [j.state]: "Claimed",
                [j.claimId]: claimId,
                [j.claimedAt]: mapping.clock.encodeInstant(engineNow),
                [j.claimExpiresAt]: mapping.clock.encodeInstant(deadline),
                [j.retentionUntil]: mapping.clock.encodeInstant(retention)
              })
            } where ${pending} and ${exact(j.jobId, value.jobId)} and ${
              exact(j.snapshot, encoded)
            } and ${now} >= ${engineNow} and ${now} < ${deadline}`
          )
          if (Option.isSome(external)) {
            yield* finish(
              sql`exists(select 1 from ${job.name} where ${exact(j.jobId, value.jobId)} and ${
                exact(j.snapshot, encoded)
              } and ${exact(j.claimId, claimId)} and ${exact(j.state, "Claimed")}) and ${now} < ${deadline}`
            )
          }

          return yield* prepareOAuthNative({ _tag: "Claimed", claim }, prepare)
        })
      ),
    settle: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const claim = OAuth.snapshotOAuthSync(OAuth.OAuthConnectedRevocationClaim, original.claim)

          const outcome = yield* Schema.decodeEffect(Schema.Literals(["Confirmed", "Unknown"]))(
            original.outcome
          )

          const target = sql.and([
            exact(j.jobId, claim.job.jobId),
            exact(j.moduleId, claim.job.grant.context.moduleId),
            exact(j.snapshot, stored.encode(claim.job)),
            exact(j.state, "Claimed"),
            exact(j.claimId, claim.claimId),
            sql`${job.column(j.claimedAt)} = ${
              job.value(j.claimedAt, mapping.clock.encodeInstant(claim.claimedAtMillis))
            }`,
            sql`${job.column(j.claimExpiresAt)} = ${
              job.value(j.claimExpiresAt, mapping.clock.encodeInstant(claim.claimExpiresAtMillis))
            }`,
            sql`${now} >= ${claim.claimedAtMillis} and ${now} < ${claim.claimExpiresAtMillis}`
          ])

          const statement = sql`${job.update({ [j.state]: outcome })} where ${target}`

          if (batch !== undefined) {
            const rows = yield* sql`select 1 from ${job.name} where ${target}`

            if (rows.length === 0) return yield* prepareOAuthNative({ settled: false }, prepare)
            if (!(rows.length === 1)) return yield* invalidState()
            yield* change(statement)
          } else if ((yield* executeSqlChange(sql, statement)) !== 1) {
            return yield* prepareOAuthNative({ settled: false }, prepare)
          }
          if (Option.isSome(external)) {
            yield* finish(
              sql`exists(select 1 from ${job.name} where ${exact(j.jobId, claim.job.jobId)} and ${
                exact(j.snapshot, stored.encode(claim.job))
              } and ${exact(j.claimId, claim.claimId)} and ${
                exact(j.state, outcome)
              }) and ${now} < ${claim.claimExpiresAtMillis}`
            )
          }

          return yield* prepareOAuthNative({ settled: true }, prepare)
        }),
        "statement"
      )
  }

  return { oauthConnectedRevocations: service }
})
