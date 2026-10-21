import * as Predicate from "effect/Predicate"
/* oxlint-disable no-explicit-any -- physical mapping generics are erased only at this shared adapter boundary. */
import * as Passkey from "@effect/auth/Passkey"
import { SecurityRevision } from "@effect/auth/Sessions"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { randomId } from "./crypto.ts"
import { sqlBatchAssertion } from "./d1Planning.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import type { PasskeyCredentialInsert, PasskeyManagementMapping } from "./models/passkeyWriteModel.ts"
import type { SqlTable } from "./nativeSqlTable.ts"
import { passkeyEnrollmentDigest, passkeyRemoveDigest } from "./passkeyActions.ts"
import { passkeyManagementInputs } from "./passkeyInputs.ts"
import { type NativePasskeyServices, preparePasskeyNative } from "./passkeyNative.ts"
import { invalidPasskeyState, type PasskeyNativeRow } from "./passkeyNativeState.ts"
import {
  assessPasskeyAction,
  passkeyCredentialKey,
  passkeyMatchesAccess,
  samePasskeyCredential,
  samePasskeyRevision
} from "./passkeyPolicy.ts"
import { exactSqlText } from "./sqlChange.ts"
import { appendSqlBatchStatement, registerSqlBatchPostcondition, registerSqlPostcondition } from "./sqlCommit.ts"
import type { TableModel } from "./tableModel.ts"

// Mapping callbacks retain concrete row/SQL types at the public driver boundary.
export type NativePasskeyManagementMapping = PasskeyManagementMapping<
  TableModel,
  TableModel,
  TableModel,
  TableModel,
  unknown,
  any
>

/** @internal */
export type NativePasskeyWriteMapping = Pick<
  NativePasskeyManagementMapping,
  "moduleId" | "read" | "write" | "clock" | "telemetry"
>

/** @internal */
export const makePasskeyNativeWrites = (
  base: NativePasskeyServices,
  mapping: NativePasskeyWriteMapping
) => {
  const { state } = base
  const { sql, tables, subject, credential, factor, ceremony: flow } = state
  const read = mapping.read
  const invalidState = invalidPasskeyState
  const expression = tables.expression

  const eq = (table: SqlTable, key: string, value: unknown) =>
    Predicate.isString(value)
      ? exactSqlText(sql, table.column(key), table.value(key, value))
      : sql`${table.column(key)} = ${table.value(key, value)}`

  const match = (table: SqlTable, values: Readonly<Record<string, unknown>>) =>
    sql.and(
      Object.entries(values)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => value === null ? sql`${table.column(key)} is null` : eq(table, key, value))
    )

  const check = Effect.fnUntraced(function*(condition: Fragment) {
    const current = (yield* SqlClient.SqlClient).withoutTransforms()
    const rows = yield* current`select case when ${condition} then 1 else 0 end as valid`

    if (rows.length !== 1 || Number(rows[0]!.valid) !== 1) {
      return yield* PersistenceMappingError.make({
        operation: "mapping",
        cause: "Passkey mutation postcondition failed"
      })
    }
  })

  const postcondition = (name: string, condition: Fragment) =>
    base.batch
      ? registerSqlBatchPostcondition({ name, statement: sqlBatchAssertion(sql, condition) })
      : registerSqlPostcondition({ name, check: check(condition) })

  const write = (statement: Fragment, count: number) =>
    base.batch
      ? flow.stage(statement, count)
      : flow.change(statement).pipe(
        Effect.flatMap((changed) =>
          changed === count
            ? Effect.void
            : Effect.fail(
              PersistenceMappingError.make({
                operation: "mapping",
                cause: "Passkey conditional write did not match"
              })
            )
        )
      )

  const summary = (row: PasskeyNativeRow) =>
    Schema.decodeUnknownSync(Passkey.PasskeyCredentialSummary)({
      credentialId: row[read.credential.credentialId],
      name: row[mapping.write.credential.name],
      primarySignIn: read.credential.decode(row).primarySignIn,
      createdAtMillis: mapping.clock.decodeInstant(row[mapping.write.credential.createdAt]),
      ...(row[mapping.telemetry.lastUsedAt] === null ||
          row[mapping.telemetry.lastUsedAt] === undefined
        ? {}
        : { lastUsedAtMillis: mapping.clock.decodeInstant(row[mapping.telemetry.lastUsedAt]) })
    })

  const owned = (nativeId: unknown, credentialId?: string) =>
    sql.and([
      sql`${credential.column(read.credential.subjectId)} = ${credential.value(read.credential.subjectId, nativeId)}`,
      ...(credentialId === undefined
        ? []
        : [eq(credential, read.credential.credentialId, credentialId)]),
      state.active("credential")
    ])

  const subjectCondition = Effect.fnUntraced(function*(current: Passkey.PasskeyCredential["revision"]) {
    const id = yield* state.native(current.subjectId)

    return sql`exists(select 1 from ${subject.name} where ${subject.column(read.subject.id)} = ${
      subject.value(read.subject.id, id)
    } and ${eq(subject, read.subject.securityRevision, current.securityRevision)} and ${state.active("subject")}) and ${
      sql.and(current.credentials.map((entry) =>
        sql`exists(select 1 from ${factor.name} where ${factor.column(read.authority.subjectId)} = ${
          factor.value(read.authority.subjectId, id)
        } and ${eq(factor, read.authority.credentialId, entry.credentialId)} and ${
          eq(factor, read.authority.revision, entry.revision)
        } and ${state.active("authority")})`
      ))
    }`
  })

  const insertCredential = Effect.fnUntraced(function*(
    nativeId: unknown,
    ceremony: Passkey.PasskeyCeremony,
    verified: Passkey.PasskeyRegistrationVerified,
    revision: Passkey.PasskeyCredential["revision"],
    name: string,
    nowMillis: number,
    subjectRow: Readonly<Record<string, unknown>>
  ) {
    if (!(ceremony.context._tag === "Enrollment" || ceremony.context._tag === "Registration")) {
      return yield* invalidState()
    }
    const credentialId = yield* randomId
    const marker = yield* randomId
    const credentialRevision = SecurityRevision.make(marker)

    const value = Passkey.snapshotPasskeySync(Passkey.PasskeyCredential, {
      credentialId,
      requirement: yield* read.subject.decodeRequirement(subjectRow),
      rpId: ceremony.profile.rpId,
      protocolCredentialId: verified.protocolCredentialId,
      userHandle: ceremony.context.userHandle,
      publicKey: verified.publicKey,
      algorithm: verified.algorithm,
      profile: ceremony.profile,
      revision: {
        ...revision,
        credentials: [...revision.credentials, { credentialId, revision: credentialRevision }]
      },
      active: true,
      primarySignIn: ceremony.profile.primarySignIn && verified.userVerified,
      enrollmentUserVerified: verified.userVerified,
      backupEligible: verified.backupEligible,
      backupState: verified.backupState,
      counter: verified.counter
    })

    const details = Passkey.snapshotPasskeySync(Passkey.PasskeyCredentialSummary, {
      credentialId,
      name,
      primarySignIn: value.primarySignIn,
      createdAtMillis: nowMillis
    })

    const input: PasskeyCredentialInsert<unknown> = {
      subjectId: nativeId,
      credential: value,
      summary: details,
      marker
    }

    const values = {
      ...mapping.write.credential.encodeInsert(input),
      [read.credential.credentialKey]: yield* passkeyCredentialKey(
        value.rpId,
        value.protocolCredentialId
      )
    }

    const authorityValues = mapping.write.authority.encodeInsert(input)

    yield* write(credential.insert(values), 1)
    yield* write(factor.insert(authorityValues), 1)

    // Application work may change telemetry or names, but cannot replace the
    // enrolled key, ownership, semantic revision, or its authority factor.
    const semanticKeys = [
      read.credential.credentialId,
      read.credential.subjectId,
      read.credential.rpId,
      read.credential.protocolCredentialId,
      read.credential.credentialKey,
      read.credential.userHandle,
      read.credential.publicKey,
      read.credential.algorithm,
      read.credential.profile,
      read.credential.credentialRevision,
      read.credential.status,
      read.credential.primarySignIn,
      read.credential.enrollmentUserVerified,
      read.credential.backupEligible
    ]

    const semantic = Object.fromEntries(semanticKeys.map((key) => [key, values[key]]))

    const authority = Object.fromEntries(
      [
        read.authority.subjectId,
        read.authority.credentialId,
        read.authority.revision,
        read.authority.status
      ].map((key) => [key, authorityValues[key]])
    )

    return {
      details,
      condition: sql`exists(select 1 from ${credential.name} where ${
        match(credential, semantic)
      }) and exists(select 1 from ${factor.name} where ${match(factor, authority)})`
    }
  })

  return {
    summary,
    owned,
    subjectCondition,
    insertCredential,
    postcondition,
    write,
    check,
    eq,
    expression,
    match
  }
}

export const makePasskeyNativeManagement = (
  base: NativePasskeyServices,
  mapping: NativePasskeyManagementMapping
) => {
  const { state, run, advisory } = base
  const { sql, tables, subject, credential, factor, ceremony: flow } = state
  const read = mapping.read
  const invalidState = invalidPasskeyState

  const {
    summary,
    owned,
    subjectCondition,
    insertCredential,
    postcondition,
    write,
    eq,
    expression,
    match
  } = makePasskeyNativeWrites(base, mapping)

  const service: Passkey.PasskeyManagementPersistence["Service"] = {
    list: (original) =>
      advisory(
        Effect.gen(function*() {
          const input = Passkey.snapshotPasskeySync(passkeyManagementInputs.list, original)

          if (!flow.validModule(input.moduleId)) return yield* invalidState()
          const nativeId = yield* state.native(input.subjectId)

          const rows = yield* sql`select ${credential.fields("c_")} from ${credential.name} where ${
            owned(nativeId)
          } and ${expression(mapping.write.policy.metadata(nativeId))}
        ${
            input.cursor === undefined
              ? sql``
              : sql`and ${credential.column(read.credential.credentialId)} > ${
                credential.value(read.credential.credentialId, input.cursor)
              }`
          }
        order by ${credential.column(read.credential.credentialId)} limit ${input.limit + 1}`

          const credentials = rows
            .slice(0, input.limit)
            .map((row) => summary(credential.decode(row, "c_")))

          const cursor = rows.length > input.limit ? credentials.at(-1)?.credentialId : undefined

          return { credentials, ...(cursor === undefined ? {} : { cursor }) }
        })
      ),
    inspectRemove: (original) =>
      advisory(
        Effect.gen(function*() {
          const input = Passkey.snapshotPasskeySync(passkeyManagementInputs.inspectRemove, original)

          if (!flow.validModule(input.moduleId)) return { _tag: "Rejected" } as const
          const nativeId = yield* state.native(input.subjectId)
          const current = yield* state.readAuthority(nativeId, false, input.credentialId)

          if (current === undefined) return { _tag: "Rejected" } as const

          const value = current.credential === undefined
            ? undefined
            : yield* state.decodeCredential(current.credential, current.revision, current.row)

          return value === undefined
            ? ({ _tag: "Rejected" } as const)
            : ({ _tag: "Target", credential: value } as const)
        })
      ),
    completeEnrollment: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = Passkey.snapshotPasskeySync(passkeyManagementInputs.completeEnrollment, original)
          const ceremony = input.ceremony

          if (
            !flow.validModule(ceremony.moduleId) ||
            ceremony.context._tag !== "Enrollment" ||
            !passkeyMatchesAccess(ceremony, input.access)
          ) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }
          const context = ceremony.context
          const nativeId = yield* state.native(context.revision.subjectId)
          const current = yield* state.readAuthority(nativeId, !base.batch)

          if (current === undefined) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }

          const policy = Passkey.snapshotPasskeySync(
            Passkey.PasskeyManagementPolicy,
            mapping.write.policy.management(current.row)
          )

          const requirement = yield* mapping.write.policy.requirement(current.row, "enroll-begin")

          const authority = yield* assessPasskeyAction(
            {
              moduleId: mapping.moduleId,
              revision: current.revision,
              nowMillis: current.nowMillis,
              currentRequirement: requirement,
              expected: {
                action: "enroll-begin",
                commandId: ceremony.commandId,
                flowId: ceremony.flowId,
                bindingDigest: yield* passkeyEnrollmentDigest(ceremony),
                revision: context.revision
              }
            },
            context.authorization,
            {
              ...policy,
              maximumEvidenceAgeMillis: Math.min(
                policy.maximumEvidenceAgeMillis,
                input.management.maximumEvidenceAgeMillis
              )
            }
          )

          if (authority === undefined) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }
          const cap = Math.min(policy.maximumCredentials, input.management.maximumCredentials)

          const policyValues = Object.fromEntries(
            mapping.write.policy.subjectColumns.map((key) => [key, current.row[key]])
          )

          const policyUnchanged = sql`exists(select 1 from ${subject.name} where ${subject.column(read.subject.id)} = ${
            subject.value(read.subject.id, nativeId)
          } and ${match(subject, policyValues)})`

          const condition = sql`${yield* subjectCondition(current.revision)} and ${policyUnchanged} and ${
            expression(mapping.write.policy.action(nativeId, context.authorization))
          } and ${expression(mapping.write.policy.metadata(nativeId))}
        and ${state.now} < ${authority.expiresBeforeMillis} and (select count(*) from ${credential.name} where ${
            owned(nativeId)
          }) < ${cap}`

          const statement = flow.consume(input.access, ceremony, condition)

          if (base.batch) yield* flow.stage(statement, 1)
          else if ((yield* flow.change(statement)) !== 1) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }

          const enrolled = yield* insertCredential(
            nativeId,
            ceremony,
            input.verified,
            current.revision,
            context.name,
            current.nowMillis,
            current.row
          )

          yield* postcondition(
            "passkey-enrollment-authority",
            sql`${enrolled.condition} and ${flow.absent(input.access)} and ${yield* subjectCondition(
              current.revision
            )} and ${policyUnchanged} and (select count(*) from ${credential.name} where ${
              owned(nativeId)
            }) <= ${cap} and ${
              expression(mapping.write.policy.action(nativeId, context.authorization))
            } and ${state.now} < ${authority.expiresBeforeMillis}`
          )

          return yield* preparePasskeyNative(
            { _tag: "Enrolled", credential: enrolled.details },
            prepare
          )
        })
      ),
    rename: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = Passkey.snapshotPasskeySync(passkeyManagementInputs.rename, original)

          if (!flow.validModule(input.moduleId)) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }
          const nativeId = yield* state.native(input.subjectId)
          const statement = sql`${credential.update({ [mapping.write.credential.name]: input.name })} where ${
            owned(nativeId, input.credentialId)
          } and ${expression(mapping.write.policy.metadata(nativeId))}`
          let rows: ReadonlyArray<PasskeyNativeRow>

          if (base.batch) {
            rows = yield* sql`select ${credential.fields("c_")} from ${credential.name} where ${
              owned(nativeId, input.credentialId)
            } and ${expression(mapping.write.policy.metadata(nativeId))}`
            if (rows.length !== 1) {
              return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
            }
            yield* flow.stage(statement, 1)
          } else {
            rows = yield* sql.onDialectOrElse({
              mysql: Effect.fnUntraced(function*() {
                const changed = yield* flow.change(statement)

                if (changed > 1) return []

                // With mysql2 -FOUND_ROWS an idempotent rename reports zero changes.
                return yield* sql`select ${credential.fields("c_")} from ${credential.name} where ${
                  owned(nativeId, input.credentialId)
                } and ${eq(credential, mapping.write.credential.name, input.name)} and ${
                  expression(mapping.write.policy.metadata(nativeId))
                }`
              }),
              orElse: () => sql`${statement} returning ${credential.fields("c_")}`
            })
          }
          if (rows.length !== 1) return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          const row = credential.decode(rows[0]!, "c_")

          return yield* preparePasskeyNative(
            {
              _tag: "Renamed",
              credential: summary({ ...row, [mapping.write.credential.name]: input.name })
            },
            prepare
          )
        }),
        "statement"
      ),
    remove: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = Passkey.snapshotPasskeySync(passkeyManagementInputs.remove, original)

          if (!flow.validModule(input.moduleId)) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }
          const nativeId = yield* state.native(input.credential.revision.subjectId)

          const current = yield* state.readAuthority(
            nativeId,
            !base.batch,
            input.credential.credentialId
          )

          if (current === undefined) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }

          const captured = current.credential === undefined
            ? undefined
            : yield* state.decodeCredential(current.credential, current.revision, current.row)

          const policy = Passkey.snapshotPasskeySync(
            Passkey.PasskeyManagementPolicy,
            mapping.write.policy.management(current.row)
          )

          if (
            captured === undefined ||
            !(yield* samePasskeyCredential(captured, input.credential)) ||
            !samePasskeyRevision(captured.revision, input.credential.revision) ||
            ((policy.requireImmediateInvalidation ||
              input.management.requireImmediateInvalidation) &&
              mapping.invalidation.window.existingSessions !== "immediate") ||
            Schema.encodeSync(Schema.fromJsonString(Passkey.PasskeyRemoved.fields.invalidation))(
                input.invalidation
              ) !==
              Schema.encodeSync(Schema.fromJsonString(Passkey.PasskeyRemoved.fields.invalidation))(
                mapping.invalidation.window
              )
          ) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }
          const requirement = yield* mapping.write.policy.requirement(current.row, "remove")

          const authority = yield* assessPasskeyAction(
            {
              moduleId: mapping.moduleId,
              revision: current.revision,
              nowMillis: current.nowMillis,
              currentRequirement: requirement,
              expected: {
                action: "remove",
                commandId: input.commandId,
                flowId: input.commandId,
                bindingDigest: yield* passkeyRemoveDigest(
                  mapping.moduleId,
                  input.commandId,
                  input.credential
                ),
                revision: input.credential.revision
              }
            },
            input.authorization,
            {
              ...policy,
              maximumEvidenceAgeMillis: Math.min(
                policy.maximumEvidenceAgeMillis,
                input.management.maximumEvidenceAgeMillis
              )
            }
          )

          if (authority === undefined) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }

          const remaining = expression(
            yield* mapping.write.policy.remainingSignIn(
              nativeId,
              captured.credentialId,
              current.row
            )
          )

          const allowed = expression(mapping.write.policy.action(nativeId, input.authorization))

          const classify = Effect.gen(function*() {
            const rows =
              yield* sql`select case when ${remaining} then 1 else 0 end as remaining, case when ${allowed} and ${state.now} < ${authority.expiresBeforeMillis} and ${yield* subjectCondition(
                current.revision
              )} then 1 else 0 end as allowed`

            return Number(rows[0]?.allowed) !== 1
              ? ("Rejected" as const)
              : Number(rows[0]?.remaining) !== 1
              ? ("LastSignInMethod" as const)
              : undefined
          })

          const next = SecurityRevision.make(yield* randomId)
          const update = sql`${subject.update({ [read.subject.securityRevision]: next })} where ${
            subject.column(read.subject.id)
          } = ${subject.value(read.subject.id, nativeId)} and ${
            eq(subject, read.subject.securityRevision, current.revision.securityRevision)
          } and ${
            state.active("subject")
          } and ${remaining} and ${allowed} and ${state.now} < ${authority.expiresBeforeMillis}`

          if (base.batch) {
            const rejected = yield* classify

            if (rejected !== undefined) {
              return yield* preparePasskeyNative({ _tag: rejected }, prepare)
            }
            yield* write(update, 1)
          } else if ((yield* flow.change(update)) !== 1) {
            const rejected = yield* classify

            return yield* preparePasskeyNative({ _tag: rejected ?? "Rejected" }, prepare)
          }
          yield* write(
            sql`${
              credential.update({
                [read.credential.status]: mapping.write.credential.removedStatus,
                [read.credential.credentialRevision]: next
              })
            } where ${owned(nativeId, captured.credentialId)} and ${
              eq(
                credential,
                read.credential.credentialRevision,
                captured.revision.credentials.find((entry) => entry.credentialId === captured.credentialId)?.revision
              )
            }`,
            1
          )
          yield* write(
            sql`${
              factor.update({
                [read.authority.status]: mapping.write.authority.removedStatus,
                [read.authority.revision]: next
              })
            } where ${factor.column(read.authority.subjectId)} = ${
              factor.value(read.authority.subjectId, nativeId)
            } and ${eq(factor, read.authority.credentialId, captured.credentialId)}`,
            1
          )

          const policyValues = Object.fromEntries(
            mapping.write.policy.subjectColumns.map((key) => [
              key,
              key === read.subject.securityRevision ? next : current.row[key]
            ])
          )

          const policyUnchanged = sql`exists(select 1 from ${subject.name} where ${subject.column(read.subject.id)} = ${
            subject.value(read.subject.id, nativeId)
          } and ${match(subject, policyValues)})`

          const invalidation = {
            subjectId: nativeId,
            previousRevision: current.revision.securityRevision,
            securityRevision: next,
            invalidation: input.invalidation
          }

          const finalConditions: Array<Fragment> = []

          for (const mutation of mapping.invalidation.mutations) {
            const table = tables(mutation.table)
            const query = sql`${table.update(mutation.values(invalidation))} where ${
              expression(mutation.where(invalidation))
            }`

            if (base.batch) yield* appendSqlBatchStatement(query)
            else yield* query
            finalConditions.push(expression(mutation.postcondition(invalidation)))
          }
          finalConditions.push(
            sql`exists(select 1 from ${credential.name} where ${credential.column(read.credential.subjectId)} = ${
              credential.value(read.credential.subjectId, nativeId)
            } and ${eq(credential, read.credential.credentialId, captured.credentialId)} and ${
              eq(credential, read.credential.credentialRevision, next)
            } and ${
              eq(credential, read.credential.status, mapping.write.credential.removedStatus)
            }) and exists(select 1 from ${factor.name} where ${factor.column(read.authority.subjectId)} = ${
              factor.value(read.authority.subjectId, nativeId)
            } and ${eq(factor, read.authority.credentialId, captured.credentialId)} and ${
              eq(factor, read.authority.revision, next)
            } and ${eq(factor, read.authority.status, mapping.write.authority.removedStatus)})`
          )
          finalConditions.push(
            sql`${
              expression(mapping.invalidation.postcondition(invalidation))
            } and ${policyUnchanged} and ${remaining} and ${state.now} < ${authority.expiresBeforeMillis}`
          )
          yield* postcondition("passkey-removal", sql.and(finalConditions))

          return yield* preparePasskeyNative(
            {
              _tag: "Removed",
              result: { credentialId: captured.credentialId, invalidation: input.invalidation }
            },
            prepare
          )
        })
      )
  }

  return { passkeyManagementPersistence: service }
}
