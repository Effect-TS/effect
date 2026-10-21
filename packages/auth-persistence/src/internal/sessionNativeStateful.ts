import type { LifecycleHooks } from "@effect/auth/Hooks"
import { AuthenticationClock } from "@effect/auth/Operations"
import {
  PendingAuthenticationInvalid,
  SessionConflict,
  SessionId,
  SessionInvalid,
  SessionMetadata,
  type SessionRepository,
  type SessionUnavailable,
  snapshotSessionAuthenticationProvenance,
  StaleAuthentication,
  type StatefulSessionPersistence,
  type StatefulSessionRecord
} from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { sqlBatchAssertion } from "./d1Planning.ts"
import { isMappedConstraintConflict, PersistenceMappingError } from "./mappingError.ts"
import type { StatefulSessionMapping } from "./models/sessionModel.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { sessionEvidenceDeadline } from "./sessionNativeAuthority.ts"
import { makeNativeSessionPending, prepareNativeSession } from "./sessionNativePending.ts"
import { makeConditionalSqlInsert, makeNativeSessionRecords, sameSessionRecord } from "./sessionNativeRecord.ts"
import {
  invalidSessionState,
  makeNativeSessionAuthorityState,
  normalizeSessionOperation,
  sameSessionRevision,
  sessionUnavailable
} from "./sessionNativeState.ts"
import { allocateSessionValue, preservesRevision } from "./sessionPolicy.ts"
import { exactSqlText, executeSqlChange } from "./sqlChange.ts"
import {
  appendSqlBatchStatement,
  CurrentSqlCommit,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlPostcondition,
  SqlBatchCommit
} from "./sqlCommit.ts"
import { canJoinTextColumns, withStorageValidation } from "./storageValidation.ts"
import type { AnyTableModel } from "./tableModel.ts"

export type NativeStatefulSessionMapping<Claims> = StatefulSessionMapping<
  Claims,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  unknown,
  unknown
>

export const makeNativeStatefulSessionServices = Effect.fnUntraced(function*<Claims>(
  tables: NativeSqlTables,
  mapping: NativeStatefulSessionMapping<Claims>
): Effect.fn.Return<
  {
    readonly statefulSessionPersistence: StatefulSessionPersistence<Claims>
    readonly sessionRepository: SessionRepository
  },
  SessionUnavailable,
  SqlClient | LifecycleHooks | SqlBatchCommit
> {
  const batch = yield* SqlBatchCommit

  const state = yield* normalizeSessionOperation(
    makeNativeSessionAuthorityState(tables, mapping, batch !== undefined)
  )

  const conditionalInsert = yield* makeConditionalSqlInsert()
  const records = yield* makeNativeSessionRecords(tables, mapping)
  const executor = yield* makeSqlCommitExecutor(sessionUnavailable)
  const external = yield* Effect.serviceOption(CurrentSqlCommit)

  const pending = mapping.pending === undefined
    ? undefined
    : yield* makeNativeSessionPending(
      tables,
      { ...mapping, ...mapping.pending },
      batch !== undefined
    )

  const { sql, s, table, now, exact, live } = records

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

  const stage = Effect.fnUntraced(function*(statement: Fragment, expected?: number) {
    if (batch !== undefined) {
      yield* appendSqlBatchStatement(sql`${statement}`)
      if (expected !== undefined) {
        yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = ${expected}`))
      }

      return expected
    }

    return yield* executeSqlChange(sql, statement)
  })

  const finalCondition = Effect.fnUntraced(function*(name: string, condition: Fragment) {
    if (batch !== undefined) {
      yield* registerSqlBatchPostcondition({ name, statement: sqlBatchAssertion(sql, condition) })
    } else if (Option.isSome(external)) {
      yield* registerSqlPostcondition({
        name,
        check: Effect.gen(function*() {
          const rows = yield* sql`select 1 where ${condition}`

          if (!(rows.length === 1)) return yield* invalidSessionState()
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

  const recordCondition = Effect.fnUntraced(function*(
    record: StatefulSessionRecord<Claims>,
    values: Readonly<Record<string, unknown>>
  ) {
    return sql`exists(select 1 from ${table.name} where ${yield* records.owner(record)} and ${
      exact(table, s.securityRevision, record.securityRevision)
    } and ${records.millis(table, s.expiresAt)} = ${DateTime.toEpochMillis(record.expiresAt)} and ${
      records.millis(table, s.absoluteExpiresAt)
    } = ${DateTime.toEpochMillis(record.absoluteExpiresAt)} and ${records.encodedCondition(values)} and ${live(table)})`
  })

  const classify = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(
      Effect.catchCause((cause) =>
        Effect.failCause<E | SessionConflict>(
          isMappedConstraintConflict(mapping.isConstraintConflict, cause)
            ? Cause.map(cause, () => SessionConflict.make({}))
            : cause
        )
      )
    )

  const [joinedIds, joinedRevisions] = yield* Effect.forEach(
    [
      [
        table.unencodedTextColumn?.(s.subjectId),
        state.subject.unencodedTextColumn?.(mapping.subject.id)
      ],
      [
        table.unencodedTextColumn?.(s.securityRevision),
        state.subject.unencodedTextColumn?.(mapping.subject.securityRevision)
      ]
    ],
    canJoinTextColumns
  ).pipe(
    withStorageValidation,
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, sessionUnavailable)))
  )

  const subject = state.subject.as("verified_subject"),
    session = table.as("verified_session"),
    owner = mapping.subject,
    subjectKeys = [...new Set([owner.id, owner.status, owner.securityRevision])],
    verifiedSessionFields = session.fields("session_"),
    verifiedSubjectFields = subject.fields("subject_", subjectKeys),
    sessionFields = table.fields("session_"),
    st = state.subject.as("listed_subject"),
    list = table.as("listed_session"),
    listedSessionFields = list.fields("session_"),
    listedSubjectFields = st.fields("subject_", subjectKeys)

  const verify = Effect.fnUntraced(function*(digest: StatefulSessionRecord<Claims>["digest"]) {
    let discoveredSubjectId: StatefulSessionRecord<Claims>["subjectId"] | undefined
    let nativeSubject: unknown

    if (!joinedIds) {
      const discovered = yield* records.read(digest)

      if (discovered === undefined) return undefined
      discoveredSubjectId = discovered.subjectId
      nativeSubject = yield* mapping.subjectId.toNative(discoveredSubjectId)
    }

    const owns = joinedIds
      ? exactSqlText(sql, subject.column(owner.id), session.column(s.subjectId))
      : sql`${state.id(subject, owner.id, nativeSubject)} and ${state.id(session, s.subjectId, nativeSubject)}`

    const revision = joinedRevisions
      ? exactSqlText(
        sql,
        subject.column(owner.securityRevision),
        session.column(s.securityRevision)
      )
      : sql`true`

    const rows =
      yield* sql`select ${verifiedSessionFields}, ${verifiedSubjectFields} from ${session.name} join ${subject.name} on ${owns} and ${
        state.activeSubject(subject)
      } and ${revision} where ${exact(session, s.digest, digest)} and ${live(session)} limit 2`

    if (!(rows.length <= 1)) return yield* invalidSessionState()
    if (rows[0] === undefined) return undefined
    const record = yield* records.decode(session.decode(rows[0], "session_"))
    const decoded = subject.decode(rows[0], "subject_", subjectKeys)

    if (
      !(
        (joinedIds || record.subjectId === discoveredSubjectId) &&
        (yield* mapping.subjectId.toSubject(decoded[owner.id])) === record.subjectId &&
        owner.isActiveStatus(decoded[owner.status])
      )
    ) {
      return yield* invalidSessionState()
    }

    return decoded[owner.securityRevision] === record.securityRevision ? record : undefined
  })

  const persistence: StatefulSessionPersistence<Claims> = {
    establish: (input, project) =>
      native(
        classify(
          Effect.gen(function*() {
            const current = yield* state.read(input.evidence.revision.subjectId, true)

            if (
              current === undefined ||
              !sameSessionRevision(current.revision, input.evidence.revision)
            ) {
              return yield* StaleAuthentication.make({})
            }

            const assessment = yield* sessionEvidenceDeadline(
              input.evidence,
              current.requirement,
              current.now
            )

            const issued = Math.max(
                current.now,
                DateTime.toEpochMillis(input.now),
                DateTime.toEpochMillis(input.session.issuedAt),
                ...input.evidence.proofs.map((proof) => DateTime.toEpochMillis(proof.verifiedAt))
              ),
              expires = DateTime.toEpochMillis(input.session.expiresAt),
              absolute = DateTime.toEpochMillis(input.session.absoluteExpiresAt)

            if (
              issued - current.now > state.clockPolicy.futureToleranceMillis ||
              issued >= expires ||
              current.now >= expires ||
              expires > absolute
            ) {
              return yield* StaleAuthentication.make({})
            }
            let pendingExpiry = Infinity

            if (input.pending !== undefined) {
              if (pending === undefined || mapping.pending === undefined) {
                return yield* PendingAuthenticationInvalid.make({})
              }
              const found = yield* pending.read("Login", input.pending.digest)

              if (
                found === undefined ||
                found.record.version !== input.pending.version ||
                found.record.subjectId !== current.revision.subjectId ||
                found.record.flowId !== input.pending.flowId ||
                found.record.bindingDigest !== input.pending.bindingDigest
              ) {
                return yield* PendingAuthenticationInvalid.make({})
              }
              const original = yield* mapping.pending.login.decode(found.record.snapshot)

              if (
                original.digest !== input.pending.digest ||
                original.version !== input.pending.version ||
                !preservesRevision(input.evidence, original.evidence) ||
                DateTime.toEpochMillis(original.expiresAt) !== found.record.expiresAtMillis ||
                original.attemptLimit !== found.record.attemptLimit
              ) {
                return yield* PendingAuthenticationInvalid.make({})
              }
              pendingExpiry = found.record.expiresAtMillis
              yield* pending.consume("Login", input.pending, current.native)
            }

            const nativeSession = yield* allocateSessionValue(
              "interactive",
              s.allocateId,
              s.allocateIdSync
            )

            const sessionId = yield* mapping.sessionId.toSession(nativeSession)

            if (sessionId === input.handoffSourceSessionId) return yield* SessionConflict.make({})

            const record: StatefulSessionRecord<Claims> = {
              ...input.session,
              sessionId,
              subjectId: current.revision.subjectId,
              securityRevision: current.revision.securityRevision,
              provenance: yield* snapshotSessionAuthenticationProvenance({
                evidence: input.evidence
              }),
              issuedAt: DateTime.makeUnsafe(issued)
            }

            const deadline = Math.min(expires, assessment.validUntil, pendingExpiry)

            yield* state.guardPolicy(current)
            const condition = sql`${
              state.authorityCondition(current.revision, current.native)
            } and ${now} >= ${current.now} and ${now} < ${deadline}`

            const values = {
              ...s.encodeInsert(record, { subjectId: current.native, sessionId: nativeSession }),
              [s.sessionId]: nativeSession,
              [s.subjectId]: current.native,
              [s.digest]: record.digest,
              [s.securityRevision]: record.securityRevision,
              [s.issuedAt]: s.encodeInstant(record.issuedAt),
              [s.expiresAt]: s.encodeInstant(record.expiresAt),
              [s.absoluteExpiresAt]: s.encodeInstant(record.absoluteExpiresAt)
            }

            const changed = yield* stage(yield* conditionalInsert(table, values, condition), 1)

            if (changed !== 1) return yield* StaleAuthentication.make({})
            const final = sql`${condition} and ${yield* recordCondition(record, values)}${
              input.pending === undefined || pending === undefined
                ? sql``
                : sql` and ${pending.consumedCondition("Login", input.pending, current.native)}`
            }`

            yield* finalCondition("stateful-session-issuance", final)
            if (batch === undefined && Option.isSome(external)) {
              yield* registerSqlPostcondition({
                name: "stateful-session-issued-metadata",
                check: Effect.gen(function*() {
                  const finalRecord = yield* records.read(record.digest)

                  if (!(finalRecord !== undefined && sameSessionRecord(finalRecord, record))) {
                    return yield* invalidSessionState()
                  }
                  const authority = yield* state.read(record.subjectId)

                  if (
                    !(
                      authority !== undefined &&
                      sameSessionRevision(authority.revision, input.evidence.revision)
                    )
                  ) {
                    return yield* invalidSessionState()
                  }
                  yield* sessionEvidenceDeadline(
                    input.evidence,
                    authority.requirement,
                    authority.now
                  )
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

            return yield* prepareNativeSession(record, project)
          })
        )
      ),
    verify: ({ digest }) =>
      executor
        .verify(verify(digest))
        .pipe(
          Effect.flatMap((record) =>
            record === undefined ? Effect.fail(SessionInvalid.make({})) : Effect.succeed(record)
          )
        ),
    rotate: (input, project) =>
      native(
        classify(
          Effect.gen(function*() {
            const absolute = DateTime.toEpochMillis(input.record.absoluteExpiresAt),
              expires = DateTime.toEpochMillis(input.nextExpiresAt),
              preparedAt = Math.max(
                DateTime.toEpochMillis(input.now),
                DateTime.toEpochMillis(input.record.issuedAt)
              )

            if (
              expires > absolute ||
              preparedAt >= expires ||
              input.nextDigest === input.record.digest ||
              input.nextCredentialVersion === input.record.credentialVersion
            ) {
              return yield* SessionConflict.make({})
            }

            const needsSample = batch !== undefined ||
              sql.onDialectOrElse({ mysql: () => true, orElse: () => false })

            const sampled = needsSample
              ? Number((yield* sql`select ${now} as engine_now`)[0]?.engine_now)
              : DateTime.toEpochMillis(input.record.issuedAt)

            if (!Number.isSafeInteger(sampled)) return yield* invalidSessionState()

            const prepared = {
              ...input.record,
              digest: input.nextDigest,
              credentialVersion: input.nextCredentialVersion,
              expiresAt: input.nextExpiresAt,
              issuedAt: DateTime.makeUnsafe(Math.max(sampled, preparedAt))
            }

            const values = {
              ...s.encodeRotation(prepared),
              [s.digest]: prepared.digest,
              [s.issuedAt]: tables.expression(
                mapping.clock.fromMillis(
                  sql`case when ${now} >= ${preparedAt} then ${now} else ${preparedAt} end`
                )
              ),
              [s.expiresAt]: s.encodeInstant(prepared.expiresAt)
            }

            const condition = sql`${yield* records.owner(input.record)} and ${
              live(table)
            } and ${preparedAt} <= ${now} + ${state.clockPolicy.futureToleranceMillis} and ${now} < ${expires} and ${
              records.millis(table, s.absoluteExpiresAt)
            } = ${absolute}`
            const update = sql`${table.update(values)} where ${condition}`
            let record = prepared

            if (needsSample) {
              // Batch receipts are prepared before execution. The exact sampled time is
              // written and checked; no speculative UPDATE result is treated as committed.
              const statement = sql`${
                table.update({ ...values, [s.issuedAt]: s.encodeInstant(prepared.issuedAt) })
              } where ${condition} and ${now} >= ${sampled}`
              const changed = yield* stage(statement, 1)

              if (changed !== 1) return yield* SessionConflict.make({})
            } else {
              const rows = yield* sql`${update} returning ${sessionFields}`

              if (rows.length !== 1) return yield* SessionConflict.make({})
              record = yield* records.decode(table.decode(rows[0]!, "session_"))
            }
            yield* finalCondition(
              "stateful-session-rotation",
              yield* recordCondition(record, {
                ...values,
                [s.issuedAt]: s.encodeInstant(record.issuedAt)
              })
            )

            return yield* prepareNativeSession(record, project)
          })
        ),
        "statement"
      ),
    revokeDigest: (digest, project) =>
      native(
        Effect.gen(function*() {
          let expected: number | undefined

          if (batch !== undefined) {
            expected = (yield* sql`select 1 from ${table.name} where ${exact(table, s.digest, digest)} limit 2`)
              .length
          }

          const changed = yield* stage(
            sql`delete from ${table.name} where ${exact(table, s.digest, digest)}`,
            expected
          )

          if (!(changed !== undefined && changed <= 1)) return yield* invalidSessionState()
          yield* finalCondition(
            "stateful-session-digest-revocation",
            sql`not exists(select 1 from ${table.name} where ${exact(table, s.digest, digest)})`
          )

          return yield* prepareNativeSession(changed === 1, project)
        }),
        "statement"
      ),
    revoke: (input, project) =>
      native(
        Effect.gen(function*() {
          const subject = yield* mapping.subjectId.toNative(input.subjectId),
            session = yield* mapping.sessionId.toNative(input.sessionId)

          const condition = sql`${state.id(table, s.subjectId, subject)} and ${state.id(table, s.sessionId, session)}`

          yield* stage(sql`delete from ${table.name} where ${condition}`)
          yield* finalCondition(
            "stateful-session-revocation",
            sql`not exists(select 1 from ${table.name} where ${condition})`
          )

          return yield* prepareNativeSession(undefined, project)
        }),
        "statement"
      ),
    revokeAll: (input, project) =>
      native(
        Effect.gen(function*() {
          const nativeSubject = yield* mapping.subjectId.toNative(input.subjectId),
            owner = mapping.subject

          const next = yield* allocateSessionValue(
            "interactive",
            owner.nextSecurityRevision?.(input.expectedSecurityRevision),
            owner.nextSecurityRevisionSync === undefined
              ? undefined
              : () => owner.nextSecurityRevisionSync!(input.expectedSecurityRevision)
          )

          if (!(next !== input.expectedSecurityRevision)) return yield* invalidSessionState()

          const changed = yield* stage(
            sql`${state.subject.update({ [owner.securityRevision]: next })} where ${
              state.id(state.subject, owner.id, nativeSubject)
            } and ${state.activeSubject(state.subject)} and ${
              state.exact(state.subject, owner.securityRevision, input.expectedSecurityRevision)
            }`,
            1
          )

          if (changed !== 1) return yield* StaleAuthentication.make({})
          yield* finalCondition(
            "all-session-revocation",
            sql`exists(select 1 from ${state.subject.name} where ${
              state.id(state.subject, owner.id, nativeSubject)
            } and ${state.exact(state.subject, owner.securityRevision, next)})`
          )

          return yield* prepareNativeSession(undefined, project)
        }),
        "statement"
      )
  }

  const sessionRepository: SessionRepository = {
    list: (input) =>
      executor.read(
        Effect.gen(function*() {
          if (!(Number.isSafeInteger(input.limit) && input.limit > 0 && input.limit <= 1000)) {
            return yield* invalidSessionState()
          }

          const nativeSubject = yield* mapping.subjectId.toNative(input.subjectId)

          const cursor = input.cursor === undefined
            ? undefined
            : yield* mapping.sessionId.toNative(
              yield* Schema.decodeEffect(SessionId)(input.cursor)
            )

          let revision: StatefulSessionRecord<Claims>["securityRevision"] | undefined

          // Bind both revisions in SQL so stale rows cannot consume a page.
          if (!joinedRevisions) {
            const subjects = yield* sql`select ${listedSubjectFields} from ${st.name} where ${
              state.id(st, owner.id, nativeSubject)
            } and ${state.activeSubject(st)} limit 2`

            if (!(subjects.length <= 1)) return yield* invalidSessionState()
            if (subjects[0] === undefined) return { sessions: [] }
            const subject = st.decode(subjects[0], "subject_", subjectKeys)

            if (!((yield* mapping.subjectId.toSubject(subject[owner.id])) === input.subjectId)) {
              return yield* invalidSessionState()
            }
            revision = yield* Schema.decodeUnknownEffect(SessionMetadata.fields.securityRevision)(
              subject[owner.securityRevision]
            )
          }

          // Keep the owner in the page snapshot even when its discovered revision changed.
          // Retry that read once; continued authority changes are not pagination exhaustion.
          for (let attempt = 0; attempt < 2; attempt++) {
            const currentRevision = joinedRevisions
              ? exactSqlText(
                sql,
                st.column(owner.securityRevision),
                list.column(s.securityRevision)
              )
              : sql`${state.exact(st, owner.securityRevision, revision)} and ${
                exact(list, s.securityRevision, revision)
              }`

            const rows = yield* sql`select ${listedSessionFields}, ${listedSubjectFields}, ${
              list.column(s.subjectId)
            } as session_owner from ${st.name} left join ${list.name} on ${
              state.id(list, s.subjectId, nativeSubject)
            } and ${currentRevision} and ${live(list)}${
              cursor === undefined ? sql`` : sql` and ${list.column(s.sessionId)} > ${list.value(s.sessionId, cursor)}`
            } where ${state.id(st, owner.id, nativeSubject)} and ${state.activeSubject(st)} order by ${
              list.column(s.sessionId)
            } limit ${input.limit + 1}`

            const first = rows[0]

            if (first === undefined) return { sessions: [] }
            if (!joinedRevisions) {
              const subject = st.decode(first, "subject_", subjectKeys)

              if (!((yield* mapping.subjectId.toSubject(subject[owner.id])) === input.subjectId)) {
                return yield* invalidSessionState()
              }

              const current = yield* Schema.decodeUnknownEffect(
                SessionMetadata.fields.securityRevision
              )(subject[owner.securityRevision])

              if (current !== revision) {
                revision = current
                continue
              }
            }
            if (first.session_owner === null) return { sessions: [] }

            const decoded = yield* Effect.forEach(rows.slice(0, input.limit), (row) =>
              Effect.gen(function*() {
                const record = yield* records.decode(list.decode(row, "session_"))
                const subject = st.decode(row, "subject_", subjectKeys)

                if (
                  !(
                    record.subjectId === input.subjectId &&
                    (yield* mapping.subjectId.toSubject(subject[owner.id])) === input.subjectId &&
                    subject[owner.securityRevision] === record.securityRevision
                  )
                ) {
                  return yield* invalidSessionState()
                }

                return yield* Schema.decodeEffect(Schema.toType(SessionMetadata))(record)
              }))

            const nextCursor = rows.length > input.limit ? decoded.at(-1)?.sessionId : undefined

            return { sessions: decoded, ...(nextCursor === undefined ? {} : { nextCursor }) }
          }

          return yield* sessionUnavailable()
        })
      )
  }

  return { statefulSessionPersistence: persistence, sessionRepository }
})
