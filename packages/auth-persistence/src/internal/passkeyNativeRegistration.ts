/* oxlint-disable no-explicit-any -- physical mapping generics are erased only at this shared adapter boundary. */
import * as Passkey from "@effect/auth/Passkey"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { randomId } from "./crypto.ts"
import { sqlBatchAssertion } from "./d1Planning.ts"
import type { PasskeyRegistrationMapping, PasskeyRegistrationWriter } from "./models/passkeyWriteModel.ts"
import { passkeyCanonicalJson, passkeyDigest } from "./passkeyActions.ts"
import { type NativePasskeyServices, preparePasskeyNative } from "./passkeyNative.ts"
import { invalidPasskeyState } from "./passkeyNativeState.ts"
import { makePasskeyNativeWrites } from "./passkeyNativeWrite.ts"
import { passkeyMatchesAccess, validPasskeyCeremony } from "./passkeyPolicy.ts"
import { appendSqlBatchStatement } from "./sqlCommit.ts"
import type { TableModel } from "./tableModel.ts"

// Foreign mapping expressions are compiled at the NativeSqlTables boundary.
export type NativePasskeyRegistrationMapping<R> = PasskeyRegistrationMapping<
  TableModel,
  TableModel,
  TableModel,
  TableModel,
  unknown,
  R,
  any
>

export const makePasskeyNativeRegistration = <R>(
  base: NativePasskeyServices,
  mapping: NativePasskeyRegistrationMapping<R>
) => {
  const { state, run, advisory } = base
  const { sql, tables, subject, credential, ceremony: flow } = state

  const { write, postcondition, check, insertCredential, subjectCondition, owned } = makePasskeyNativeWrites(
    base,
    mapping
  )

  const invalidState = invalidPasskeyState
  const codec = passkeyCanonicalJson(mapping.registration.schema)

  const describe = Effect.fnUntraced(function*(original: R) {
    const encoded = codec.encode(original)

    if (!(new TextEncoder().encode(encoded).length <= 1048576)) return yield* invalidState()
    const registration = codec.decode(encoded)

    const labels = yield* Schema.decodeEffect(
      Schema.Struct({ name: Passkey.PasskeyLabel, displayName: Passkey.PasskeyLabel })
    )(mapping.registration.describe(registration))

    return {
      encoded,
      registration,
      ...labels,
      fingerprint: yield* passkeyDigest(mapping.registration.schema, registration)
    }
  })

  const writer: PasskeyRegistrationWriter<R> = {
    inspect: (original) =>
      advisory(
        Effect.gen(function*() {
          const value = yield* describe(original)

          const rows = yield* sql`select case when ${
            tables.expression(mapping.registration.eligible(value.registration))
          } then 1 else 0 end as eligible`

          return {
            fingerprint: value.fingerprint,
            name: value.name,
            displayName: value.displayName,
            eligible: rows.length === 1 && Number(rows[0]!.eligible) === 1
          }
        })
      ),
    issueRegistration: (input, prepare) =>
      run(
        Effect.gen(function*() {
          const ceremony = Passkey.snapshotPasskeySync(Passkey.PasskeyCeremony, input.ceremony)
          const value = yield* describe(input.registration)

          if (
            !flow.validModule(ceremony.moduleId) ||
            !validPasskeyCeremony(ceremony) ||
            ceremony.purpose !== "registration" ||
            ceremony.context._tag !== "Registration" ||
            !ceremony.profile.primarySignIn ||
            ceremony.profile.residentKey !== "required" ||
            ceremony.profile.userVerification !== "required" ||
            ceremony.allowedCredentials.length !== 0 ||
            ceremony.context.fingerprint !== value.fingerprint ||
            ceremony.context.name !== value.name ||
            ceremony.context.displayName !== value.displayName
          ) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }
          const statement = flow.insert(ceremony, { [mapping.applicationSnapshot]: value.encoded })

          if (base.batch) yield* flow.stage(statement, 1)
          else if ((yield* flow.change(statement)) !== 1) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }

          return yield* preparePasskeyNative({ _tag: "Issued", ceremony }, prepare)
        }),
        "statement"
      ),
    completeRegistration: (input, prepare) =>
      run(
        Effect.gen(function*() {
          const ceremony = Passkey.snapshotPasskeySync(Passkey.PasskeyCeremony, input.ceremony)
          const access = Passkey.snapshotPasskeySync(Passkey.PasskeyAccess, input.access)
          const verified = Passkey.snapshotPasskeySync(Passkey.PasskeyRegistrationVerified, input.verified)

          if (
            !flow.validModule(ceremony.moduleId) ||
            ceremony.context._tag !== "Registration" ||
            ceremony.purpose !== "registration" ||
            !passkeyMatchesAccess(ceremony, access) ||
            !verified.userVerified
          ) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }

          const rows = yield* sql`select ${
            flow.flow.fields("flow_")
          }, ${flow.now} as "engineNow" from ${flow.flow.name} where ${flow.access(access, ceremony)}`

          if (rows.length !== 1) return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          const row = flow.flow.decode(rows[0]!, "flow_")

          const encoded = yield* Schema.decodeUnknownEffect(Schema.String)(
            row[mapping.applicationSnapshot]
          )

          const registration = codec.decode(encoded)
          const value = yield* describe(registration)

          if (
            value.fingerprint !== ceremony.context.fingerprint ||
            value.name !== ceremony.context.name ||
            value.displayName !== ceremony.context.displayName
          ) {
            return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
          }
          const eligible = tables.expression(mapping.registration.eligible(registration))
          const marker = yield* randomId
          const provision = mapping.registration.subject({ registration, ceremony, marker })
          const nativeId = provision.subjectId
          const subjectId = mapping.read.subjectIds.toSubject(nativeId)

          if (
            !mapping.read.subjectIds.equals(mapping.read.subjectIds.toNative(subjectId), nativeId)
          ) {
            return yield* invalidState()
          }
          if (base.batch) yield* appendSqlBatchStatement(sqlBatchAssertion(sql, eligible))
          else yield* check(eligible)
          // Inserting the new subject acquires its lock before the challenge or
          // credential is mutated. A failed consume rolls this insertion back.
          yield* write(subject.insert(provision.values), 1)
          let revision: Passkey.PasskeyCredential["revision"]
          let nowMillis: number
          let subjectRow: Readonly<Record<string, unknown>> = provision.values

          if (base.batch) {
            if (!mapping.read.subject.isActiveStatus(provision.values[mapping.read.subject.status])) {
              return yield* invalidState()
            }
            revision = yield* Schema.decodeUnknownEffect(Passkey.PasskeyRevision)({
              subjectId,
              securityRevision: provision.values[mapping.read.subject.securityRevision],
              credentials: []
            })
            nowMillis = yield* Schema.decodeEffect(Schema.Int)(Number(rows[0]!.engineNow))
          } else {
            const current = yield* state.readAuthority(nativeId, true)

            if (!(current !== undefined)) return yield* invalidState()
            subjectRow = current.row
            revision = current.revision
            nowMillis = current.nowMillis
          }

          const cap = Passkey.snapshotPasskeySync(
            Passkey.PasskeyManagementPolicy,
            mapping.write.policy.management(subjectRow)
          ).maximumCredentials

          const count = sql`(select count(*) from ${credential.name} where ${owned(nativeId)})`

          const finalEligibility = tables.expression(
            mapping.registration.finalEligibility({ registration, subjectId: nativeId })
          )

          yield* write(
            flow.consume(
              access,
              ceremony,
              sql`${flow.exact(mapping.applicationSnapshot, encoded)} and ${
                subjectCondition(revision)
              } and ${count} < ${cap} and ${finalEligibility}`
            ),
            1
          )

          const inserted = yield* insertCredential(
            nativeId,
            ceremony,
            verified,
            revision,
            value.displayName,
            nowMillis,
            subjectRow
          )

          yield* postcondition(
            "passkey-registration-subject",
            sql`${inserted.condition} and ${flow.absent(access)} and ${
              subjectCondition(revision)
            } and ${count} <= ${cap} and ${finalEligibility} and ${state.now} < ${ceremony.expiresAtMillis}`
          )

          return yield* preparePasskeyNative({ _tag: "RegistrationAccepted" }, prepare)
        })
      )
  }

  return { passkeyRegistrationAuthority: writer }
}
