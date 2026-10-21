import type { LifecycleHooks } from "@effect/auth/Hooks"
import { AuthenticationClock } from "@effect/auth/Operations"
import {
  SessionConflict,
  type SessionStepUpIntent,
  SessionStepUpInvalid,
  type SessionStepUpPersistence,
  type SessionUnavailable,
  StaleAuthentication,
  type StatefulSessionRecord
} from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { sqlBatchAssertion } from "./d1Planning.ts"
import { isMappedConstraintConflict, PersistenceMappingError } from "./mappingError.ts"
import type { SessionStepUpMapping } from "./models/stepUpModel.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { sessionEvidenceDeadline } from "./sessionNativeAuthority.ts"
import { prepareNativeSession, type StoredSessionPending } from "./sessionNativePending.ts"
import { makeNativeSessionPendingReader } from "./sessionNativePendingRead.ts"
import { makeConditionalSqlInsert, makeNativeSessionRecords, sameSessionRecord } from "./sessionNativeRecord.ts"
import {
  invalidSessionState,
  normalizeSessionOperation,
  sameSessionRevision,
  sessionUnavailable
} from "./sessionNativeState.ts"
import { allocateSessionValue } from "./sessionPolicy.ts"
import {
  CurrentSqlCommit,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlPostcondition,
  SqlBatchCommit
} from "./sqlCommit.ts"
import { decodeStepUpIntent, encodeStepUpIntent, stepUpIntentLive, validateStepUpPlan } from "./stepUpState.ts"
import type { AnyTableModel } from "./tableModel.ts"

export type NativeSessionStepUpMapping<Claims> = SessionStepUpMapping<
  Claims,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  unknown,
  unknown
>

export const makeNativeSessionStepUpServices = Effect.fnUntraced(function*<Claims>(
  tables: NativeSqlTables,
  mapping: NativeSessionStepUpMapping<Claims>
): Effect.fn.Return<
  { readonly sessionStepUpPersistence: SessionStepUpPersistence<Claims> },
  SessionUnavailable,
  SqlClient | LifecycleHooks | SqlBatchCommit
> {
  const batch = yield* SqlBatchCommit

  const {
    state,
    pending,
    read: readPending
  } = yield* normalizeSessionOperation(
    makeNativeSessionPendingReader(tables, mapping, batch !== undefined)
  )

  const conditionalInsert = yield* makeConditionalSqlInsert()

  const records = mapping.source.kind === "Stateful"
    ? yield* makeNativeSessionRecords(tables, { ...mapping, ...mapping.source })
    : undefined

  const executor = yield* makeSqlCommitExecutor(sessionUnavailable),
    external = yield* Effect.serviceOption(CurrentSqlCommit)

  const { sql, now } = state

  const native = <A, E, R>(
    work: Effect.Effect<A, E, R>,
    mode: "transaction" | "statement" = "transaction"
  ) =>
    (batch === undefined
      ? executor.operation(normalizeSessionOperation(work), mode)
      : executor
        .operationBatch(normalizeSessionOperation(work))
        .pipe(Effect.provideService(SqlBatchCommit, batch))).pipe(
        Effect.provideService(AuthenticationClock, state.clockPolicy)
      )

  const decode = Effect.fnUntraced(function*(stored: StoredSessionPending) {
    const intent = yield* decodeStepUpIntent(stored.snapshot)

    if (
      !(
        intent.digest === stored.digest &&
        intent.version === stored.version &&
        intent.flowId === stored.flowId &&
        intent.bindingDigest === stored.bindingDigest &&
        intent.revision.subjectId === stored.subjectId &&
        DateTime.toEpochMillis(intent.expiresAt) === stored.expiresAtMillis &&
        intent.attemptLimit === stored.attemptLimit
      )
    ) {
      return yield* invalidSessionState()
    }

    return intent
  })

  const source = Effect.fnUntraced(function*(
    intent: Omit<SessionStepUpIntent, "version">,
    instant: number
  ) {
    if (!(yield* stepUpIntentLive(intent, mapping.source.kind, DateTime.makeUnsafe(instant)))) {
      return undefined
    }
    const subject = yield* mapping.subjectId.toNative(intent.revision.subjectId)

    if (mapping.source.kind === "Stateful") {
      if (!(records !== undefined)) return yield* invalidSessionState()

      const nativeSession = yield* mapping.source.sessionId.toNative(intent.sourceSessionId),
        { s, table } = records

      const rows = yield* sql`select ${table.fields("source_")} from ${table.name} where ${
        state.id(table, s.subjectId, subject)
      } and ${state.id(table, s.sessionId, nativeSession)} and ${records.live(table)} limit 2`

      if (!(rows.length <= 1)) return yield* invalidSessionState()
      if (rows[0] === undefined) return undefined
      const record = yield* records.decode(table.decode(rows[0], "source_"))

      if (
        record.credentialVersion !== intent.sourceCredentialVersion ||
        record.subjectId !== intent.revision.subjectId ||
        record.sessionId !== intent.sourceSessionId ||
        record.securityRevision !== intent.revision.securityRevision ||
        DateTime.toEpochMillis(record.assurance.authenticatedAt) !==
          DateTime.toEpochMillis(intent.sourceAuthenticatedAt) ||
        DateTime.toEpochMillis(record.expiresAt) !==
          DateTime.toEpochMillis(intent.sourceExpiresAt) ||
        DateTime.toEpochMillis(record.absoluteExpiresAt) !==
          DateTime.toEpochMillis(intent.sourceAbsoluteExpiresAt)
      ) {
        return undefined
      }

      return {
        record,
        condition: sql`exists(select 1 from ${table.name} where ${yield* records.owner(record)} and ${
          records.live(table)
        })`
      }
    }
    if (mapping.source.kind === "StateAssistedSigned") {
      const t = mapping.source.tombstone,
        table = tables(t.table),
        session = yield* mapping.source.sessionId.toNative(intent.sourceSessionId)

      const condition = sql`not exists(select 1 from ${table.name} where ${
        state.exact(table, t.moduleId, mapping.moduleId)
      } and ${state.id(table, t.subjectId, subject)} and ${state.id(table, t.sessionId, session)})`

      if ((yield* sql`select 1 where ${condition}`).length !== 1) return undefined

      return { record: undefined, condition }
    }

    return { record: undefined, condition: sql`1 = 1` }
  })

  const final = Effect.fnUntraced(function*(name: string, condition: Fragment) {
    if (batch !== undefined) {
      yield* registerSqlBatchPostcondition({ name, statement: sqlBatchAssertion(sql, condition) })
    } else if (Option.isSome(external)) {
      yield* registerSqlPostcondition({
        name,
        check: Effect.gen(function*() {
          if (!((yield* sql`select 1 where ${condition}`).length === 1)) {
            return yield* invalidSessionState()
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
    }
  })

  const snapshotCondition = (intent: SessionStepUpIntent, snapshot: string) =>
    sql.and([
      state.exact(pending.table, pending.p.snapshot, snapshot),
      sql`${tables.expression(mapping.clock.toMillis(pending.table.column(pending.p.expiresAt)))} = ${
        DateTime.toEpochMillis(intent.expiresAt)
      }`,
      sql`${pending.table.column(pending.p.attemptLimit)} = ${
        pending.table.value(pending.p.attemptLimit, intent.attemptLimit)
      }`
    ])

  const sessionStepUpPersistence: SessionStepUpPersistence<Claims> = {
    create: (input, _now, project) =>
      native(
        Effect.gen(function*() {
          const current = yield* state.read(input.revision.subjectId, true)

          if (current === undefined || !sameSessionRevision(current.revision, input.revision)) {
            return yield* StaleAuthentication.make({})
          }
          const original = yield* source(input, current.now)

          if (original === undefined) return yield* StaleAuthentication.make({})

          const version = yield* allocateSessionValue(
            "interactive",
            mapping.pending.allocateVersion,
            mapping.pending.allocateVersionSync
          )

          const intent = { ...input, version },
            snapshot = yield* encodeStepUpIntent(intent)

          yield* state.guardPolicy(current)
          const condition = sql`${
            state.authorityCondition(intent.revision, current.native)
          } and ${original.condition} and ${now} >= ${current.now} and ${
            DateTime.toEpochMillis(intent.sourceAuthenticatedAt)
          } <= ${now} + ${state.clockPolicy.futureToleranceMillis} and ${now} < ${
            DateTime.toEpochMillis(intent.expiresAt)
          }`

          yield* pending
            .insert(
              {
                moduleId: mapping.moduleId,
                kind: "StepUp",
                digest: intent.digest,
                version,
                flowId: intent.flowId,
                subjectId: current.native,
                bindingDigest: intent.bindingDigest,
                snapshot,
                expiresAt: intent.expiresAt,
                attemptLimit: intent.attemptLimit
              },
              condition
            )
            .pipe(
              Effect.catchCause((cause) =>
                Effect.failCause<SessionConflict | Cause.Cause.Error<typeof cause>>(
                  isMappedConstraintConflict(mapping.isConstraintConflict, cause)
                    ? Cause.map(cause, () => SessionConflict.make({}))
                    : cause
                )
              )
            )
          yield* final(
            "session-step-up-issuance",
            sql`${condition} and exists(select 1 from ${pending.table.name} where ${
              pending.predicate(pending.table, "StepUp", intent.digest)
            } and ${state.exact(pending.table, pending.p.version, version)} and ${snapshotCondition(intent, snapshot)})`
          )

          return yield* prepareNativeSession(intent, project)
        })
      ),
    read: ({ digest }) =>
      executor
        .read(
          Effect.gen(function*() {
            const selected = yield* readPending("StepUp", digest)

            if (selected === undefined) return undefined

            const intent = yield* decode(selected.record),
              current = selected.authority

            if (
              !sameSessionRevision(current.revision, intent.revision) ||
              !(yield* stepUpIntentLive(
                intent,
                mapping.source.kind,
                DateTime.makeUnsafe(current.now)
              ))
            ) {
              return undefined
            }

            // The detached source stays original. Its live digest and metadata
            // are rechecked by complete before any replacement is committed.
            return { intent, requirement: current.requirement }
          })
        )
        .pipe(
          Effect.provideService(AuthenticationClock, state.clockPolicy),
          Effect.flatMap((value) =>
            value === undefined
              ? Effect.fail(SessionStepUpInvalid.make({}))
              : Effect.succeed(value)
          )
        ),
    reject: ({ digest }, project) =>
      native(
        Effect.gen(function*() {
          yield* pending.reject("StepUp", digest)

          return yield* prepareNativeSession({ _tag: "Rejected" } as const, project)
        }),
        "statement"
      ),
    complete: (plan, project) =>
      native(
        Effect.gen(function*() {
          yield* validateStepUpPlan(plan)
          const { intent, evidence, replacement } = plan
          const current = yield* state.read(intent.revision.subjectId, true)

          if (
            current === undefined ||
            !sameSessionRevision(current.revision, evidence.revision) ||
            !sameSessionRevision(current.revision, intent.revision)
          ) {
            return yield* StaleAuthentication.make({})
          }
          const original = yield* source(intent, current.now)

          if (original === undefined) return yield* SessionStepUpInvalid.make({})
          if (plan.source.guard._tag === "Stateful") {
            if (
              original.record === undefined ||
              original.record.digest !== plan.source.guard.digest ||
              !sameSessionRecord(original.record, {
                ...plan.source.inspection.session,
                provenance: plan.source.inspection.provenance,
                credentialVersion: plan.source.inspection.credentialVersion,
                digest: plan.source.guard.digest
              })
            ) {
              return yield* SessionStepUpInvalid.make({})
            }
          }

          const prepared = yield* sessionEvidenceDeadline(
              evidence,
              plan.baseRequirement,
              current.now
            ),
            base = yield* sessionEvidenceDeadline(evidence, current.requirement, current.now),
            profile = yield* sessionEvidenceDeadline(evidence, intent.requirement, current.now)

          const deadline = Math.min(
            prepared.validUntil,
            base.validUntil,
            profile.validUntil,
            DateTime.toEpochMillis(intent.expiresAt),
            DateTime.toEpochMillis(replacement.inspection.session.expiresAt)
          )

          if (
            current.now >= deadline ||
            DateTime.toEpochMillis(replacement.inspection.session.issuedAt) - current.now >
              state.clockPolicy.futureToleranceMillis ||
            DateTime.toEpochMillis(replacement.inspection.session.expiresAt) >
              DateTime.toEpochMillis(intent.sourceAbsoluteExpiresAt)
          ) {
            return yield* SessionStepUpInvalid.make({})
          }
          const snapshot = yield* encodeStepUpIntent(intent)

          yield* state.guardPolicy(current)
          const authority = sql`${
            state.authorityCondition(evidence.revision, current.native)
          } and ${now} >= ${current.now} and ${now} < ${deadline}`

          yield* pending.consume(
            "StepUp",
            intent,
            current.native,
            sql`${snapshotCondition(intent, snapshot)} and ${authority} and ${original.condition}`
          )
          let replacementCondition: Fragment = sql`1 = 1`
          let replacementRecord: StatefulSessionRecord<Claims> | undefined

          if (replacement._tag === "Stateful" && mapping.source.kind === "Stateful") {
            if (!(records !== undefined && original.record !== undefined)) {
              return yield* invalidSessionState()
            }

            const next: StatefulSessionRecord<Claims> = {
              ...replacement.inspection.session,
              digest: replacement.nextDigest,
              credentialVersion: replacement.inspection.credentialVersion,
              provenance: replacement.inspection.provenance
            }

            if (
              next.digest === original.record.digest ||
              next.credentialVersion === original.record.credentialVersion
            ) {
              return yield* SessionStepUpInvalid.make({})
            }
            const { s, table } = records

            const values = {
              ...s.encodeRotation(next),
              [s.digest]: next.digest,
              [s.issuedAt]: s.encodeInstant(next.issuedAt),
              [s.expiresAt]: s.encodeInstant(next.expiresAt),
              [s.absoluteExpiresAt]: s.encodeInstant(next.absoluteExpiresAt),
              [s.securityRevision]: next.securityRevision
            }

            yield* pending.stage(
              sql`${table.update(values)} where ${yield* records.owner(original.record)} and ${
                records.live(table)
              } and ${authority}`,
              1
            )
            replacementCondition = sql`exists(select 1 from ${table.name} where ${yield* records.owner(next)} and ${
              records.encodedCondition(values)
            } and ${records.live(table)})`
            replacementRecord = next
          } else if (
            replacement._tag === "StateAssistedSigned" &&
            mapping.source.kind === "StateAssistedSigned"
          ) {
            const t = mapping.source.tombstone,
              table = tables(t.table),
              session = yield* mapping.source.sessionId.toNative(intent.sourceSessionId)

            const values = {
              ...t.encodeInsert({
                moduleId: mapping.moduleId,
                subjectId: current.native,
                sessionId: session,
                absoluteExpiresAt: intent.sourceAbsoluteExpiresAt
              }),
              [t.moduleId]: mapping.moduleId,
              [t.subjectId]: current.native,
              [t.sessionId]: session,
              [t.absoluteExpiresAt]: t.encodeInstant(intent.sourceAbsoluteExpiresAt)
            }

            yield* pending.stage(
              yield* conditionalInsert(table, values, sql`${authority} and ${original.condition}`),
              1
            )
            replacementCondition = sql`exists(select 1 from ${table.name} where ${
              state.exact(table, t.moduleId, mapping.moduleId)
            } and ${state.id(table, t.subjectId, current.native)} and ${state.id(table, t.sessionId, session)} and ${
              tables.expression(mapping.clock.toMillis(table.column(t.absoluteExpiresAt)))
            } >= ${DateTime.toEpochMillis(intent.sourceAbsoluteExpiresAt)})`
          } else if (
            replacement._tag !== "StatelessSigned" ||
            mapping.source.kind !== "StatelessSigned"
          ) {
            return yield* SessionStepUpInvalid.make({})
          }
          yield* final(
            "session-step-up-completion",
            sql`${authority} and ${
              pending.consumedCondition("StepUp", intent, current.native)
            } and ${replacementCondition}`
          )
          if (batch === undefined && Option.isSome(external)) {
            yield* registerSqlPostcondition({
              name: "session-step-up-current-policy",
              check: Effect.gen(function*() {
                const actual = yield* state.read(intent.revision.subjectId)

                if (
                  !(actual !== undefined && sameSessionRevision(actual.revision, evidence.revision))
                ) {
                  return yield* invalidSessionState()
                }
                yield* sessionEvidenceDeadline(evidence, plan.baseRequirement, actual.now)
                yield* sessionEvidenceDeadline(evidence, actual.requirement, actual.now)
                yield* sessionEvidenceDeadline(evidence, intent.requirement, actual.now)
                if (replacementRecord !== undefined && records !== undefined) {
                  const row = yield* records.read(replacementRecord.digest)

                  if (!(row !== undefined && sameSessionRecord(row, replacementRecord))) {
                    return yield* invalidSessionState()
                  }
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
          }

          return yield* prepareNativeSession(replacement.inspection, project)
        })
      )
  }

  return { sessionStepUpPersistence }
})
