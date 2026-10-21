import type { LifecycleHooks } from "@effect/auth/Hooks"
import { AuthenticationClock } from "@effect/auth/Operations"
import {
  type AuthenticationAuthority,
  type AuthenticationEvidence,
  type AuthenticationRequirement,
  PendingAuthenticationInvalid,
  type PendingConsumption,
  type SessionUnavailable,
  StaleAuthentication
} from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type { SqlClient } from "effect/sql/SqlClient"

import { sqlBatchAssertion } from "./d1Planning.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import type { AuthenticationAuthorityMapping } from "./models/sessionModel.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { makeNativeSessionPending, prepareNativeSession } from "./sessionNativePending.ts"
import {
  assessSessionAt,
  makeNativeSessionAuthorityState,
  normalizeSessionOperation,
  sameSessionRevision,
  sessionUnavailable
} from "./sessionNativeState.ts"
import { preservesRevision } from "./sessionPolicy.ts"
import {
  appendSqlBatchStatement,
  CurrentSqlCommit,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlPostcondition,
  SqlBatchCommit
} from "./sqlCommit.ts"
import type { AnyTableModel } from "./tableModel.ts"

export type NativeAuthenticationAuthorityMapping<Claims> = AuthenticationAuthorityMapping<
  Claims,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  unknown
>

/** @internal */
export const sessionEvidenceDeadline = Effect.fnUntraced(function*(
  evidence: AuthenticationEvidence,
  requirement: AuthenticationRequirement,
  now: number
) {
  const assessed = yield* assessSessionAt(evidence, requirement, now)

  if (!assessed.satisfied) return yield* StaleAuthentication.make({})

  const boundaries = [
    ...new Set([
      ...evidence.proofs.map(
        (proof) => DateTime.toEpochMillis(proof.verifiedAt) + requirement.maximumAgeMillis
      ),
      ...(evidence.completionExpiresAt === undefined
        ? []
        : [DateTime.toEpochMillis(evidence.completionExpiresAt)])
    ])
  ]
    .filter((n) => n > now)
    .sort((a, b) => a - b)

  for (const boundary of boundaries) {
    const after = yield* assessSessionAt(evidence, requirement, boundary).pipe(Effect.result)

    if (after._tag === "Failure" || !after.success.satisfied) {
      return { assessed, validUntil: boundary }
    }
  }

  return yield* StaleAuthentication.make({})
})

export const makeNativeAuthenticationAuthorityServices = Effect.fnUntraced(function*<Claims>(
  tables: NativeSqlTables,
  mapping: NativeAuthenticationAuthorityMapping<Claims>
): Effect.fn.Return<
  { readonly authenticationAuthority: AuthenticationAuthority["Service"] },
  SessionUnavailable,
  SqlClient | LifecycleHooks | SqlBatchCommit
> {
  const batch = yield* SqlBatchCommit

  const state = yield* normalizeSessionOperation(
    makeNativeSessionAuthorityState(tables, mapping, batch !== undefined)
  )

  const executor = yield* makeSqlCommitExecutor(sessionUnavailable)
  const external = yield* Effect.serviceOption(CurrentSqlCommit)

  const pending = mapping.pending === undefined
    ? undefined
    : yield* makeNativeSessionPending(
      tables,
      { ...mapping, ...mapping.pending },
      batch !== undefined
    )

  const { sql, now } = state

  const readEvidence = Effect.fnUntraced(function*(
    evidence: AuthenticationEvidence,
    locking: boolean
  ) {
    const current = yield* state.read(evidence.revision.subjectId, locking)

    return current !== undefined && sameSessionRevision(current.revision, evidence.revision)
      ? current
      : undefined
  })

  const consume = Effect.fnUntraced(function*(
    input: PendingConsumption,
    evidence: AuthenticationEvidence,
    native: unknown
  ) {
    if (pending === undefined || mapping.pending === undefined) {
      return yield* PendingAuthenticationInvalid.make({})
    }
    const found = yield* pending.read("Login", input.digest)

    if (
      found === undefined ||
      found.record.version !== input.version ||
      found.record.flowId !== input.flowId ||
      found.record.bindingDigest !== input.bindingDigest ||
      found.record.subjectId !== evidence.revision.subjectId
    ) {
      return yield* PendingAuthenticationInvalid.make({})
    }
    const original = yield* mapping.pending.login.decode(found.record.snapshot)

    if (
      original.digest !== input.digest ||
      original.version !== input.version ||
      !preservesRevision(evidence, original.evidence) ||
      DateTime.toEpochMillis(original.expiresAt) !== found.record.expiresAtMillis ||
      original.attemptLimit !== found.record.attemptLimit
    ) {
      return yield* PendingAuthenticationInvalid.make({})
    }
    yield* pending.consume("Login", input, native)

    return found.record.expiresAtMillis
  })

  const native = <A, E, R>(work: Effect.Effect<A, E, R>) =>
    (batch === undefined
      ? executor.operation(normalizeSessionOperation(work))
      : executor
        .operationBatch(normalizeSessionOperation(work))
        .pipe(Effect.provideService(SqlBatchCommit, batch))).pipe(
        Effect.provideService(AuthenticationClock, state.clockPolicy)
      )

  const authenticationAuthority: AuthenticationAuthority["Service"] = {
    capture: (subjectId, credentialIds) =>
      executor
        .read(state.read(subjectId))
        .pipe(
          Effect.flatMap((current) =>
            current === undefined ||
              new Set(credentialIds).size !== credentialIds.length ||
              credentialIds.some(
                (id) => !current.revision.credentials.some((f) => f.credentialId === id)
              )
              ? Effect.fail(StaleAuthentication.make({}))
              : Effect.succeed({ revision: current.revision, requirement: current.requirement })
          )
        ),
    requirements: (evidence) =>
      executor
        .read(readEvidence(evidence, false))
        .pipe(
          Effect.flatMap((current) =>
            current === undefined
              ? Effect.fail(StaleAuthentication.make({}))
              : Effect.succeed(current.requirement)
          )
        ),
    approve: (input, project) =>
      native(
        Effect.gen(function*() {
          const current = yield* readEvidence(input.evidence, true)

          if (current === undefined) return yield* StaleAuthentication.make({})

          const assessment = yield* sessionEvidenceDeadline(
            input.evidence,
            current.requirement,
            current.now
          )

          const issued = DateTime.toEpochMillis(input.issuedAt),
            expires = DateTime.toEpochMillis(input.expiresAt),
            absolute = DateTime.toEpochMillis(input.absoluteExpiresAt)

          if (
            Math.max(issued, DateTime.toEpochMillis(input.now)) - current.now >
              state.clockPolicy.futureToleranceMillis ||
            input.evidence.proofs.some(
              (proof) => DateTime.toEpochMillis(proof.verifiedAt) > issued
            ) ||
            issued >= expires ||
            current.now >= expires ||
            expires > absolute
          ) {
            return yield* StaleAuthentication.make({})
          }

          const pendingExpiry = input.pending === undefined
            ? undefined
            : yield* consume(input.pending, input.evidence, current.native)

          const deadline = Math.min(assessment.validUntil, expires, pendingExpiry ?? Infinity)

          yield* state.guardPolicy(current)
          const condition = sql`${
            state.authorityCondition(current.revision, current.native)
          } and ${now} >= ${current.now} and ${now} < ${deadline}`

          if (batch !== undefined) {
            yield* appendSqlBatchStatement(sqlBatchAssertion(sql, condition))
            yield* registerSqlBatchPostcondition({
              name: "signed-session-issuance-authority",
              statement: sqlBatchAssertion(
                sql,
                input.pending === undefined || pending === undefined
                  ? condition
                  : sql`${condition} and ${pending.consumedCondition("Login", input.pending, current.native)}`
              )
            })
          } else if (Option.isSome(external)) {
            yield* registerSqlPostcondition({
              name: "signed-session-issuance-authority",
              check: Effect.gen(function*() {
                const final = yield* readEvidence(input.evidence, false)

                if (final === undefined || final.now < current.now || final.now >= deadline) {
                  return yield* StaleAuthentication.make({})
                }
                yield* sessionEvidenceDeadline(input.evidence, final.requirement, final.now)
                if (input.pending !== undefined && pending !== undefined) {
                  const rows = yield* sql`select 1 where ${
                    pending.consumedCondition("Login", input.pending, current.native)
                  }`

                  if (rows.length !== 1) return yield* PendingAuthenticationInvalid.make({})
                }
              }).pipe(
                Effect.provideService(AuthenticationClock, state.clockPolicy),
                Effect.catchCause((cause) =>
                  Effect.failCause(
                    Cause.map(cause, (error) => PersistenceMappingError.make({ operation: "decode", cause: error }))
                  )
                )
              )
            })
          } else {
            // A signed credential has no session INSERT that can enforce the
            // original evidence deadline. Check that deadline at this owner.
            const rows = yield* sql`select 1 where ${now} >= ${current.now} and ${now} < ${deadline}`

            if (rows.length !== 1) return yield* StaleAuthentication.make({})
          }

          return yield* prepareNativeSession(undefined, project)
        })
      )
  }

  return { authenticationAuthority }
})
