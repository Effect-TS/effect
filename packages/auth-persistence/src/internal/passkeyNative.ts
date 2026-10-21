import { CurrentCommitJournal, type LifecycleHooks } from "@effect/auth/Hooks"
import { AuthenticationClock } from "@effect/auth/Operations"
import * as Passkey from "@effect/auth/Passkey"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type { SqlClient } from "effect/sql/SqlClient"
import { SqlError } from "effect/sql/SqlError"

import { sqlBatchAssertion } from "./d1Planning.ts"
import { isMappedConstraintConflict, PersistenceMappingError } from "./mappingError.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { passkeyOperationInputs } from "./passkeyInputs.ts"
import {
  invalidPasskeyState,
  makePasskeyNativeReadState,
  makePasskeyNativeState,
  type PasskeyNativeMapping,
  type PasskeyNativeRead,
  type PasskeyNativeReadState
} from "./passkeyNativeState.ts"
import {
  passkeyAssertionPurposes,
  passkeyCredentialKey,
  passkeyMatchesAccess,
  validPasskeyCeremony
} from "./passkeyPolicy.ts"
import { exactSqlText } from "./sqlChange.ts"
import {
  CurrentSqlCommit,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlCommitReceipt,
  registerSqlPostcondition,
  SqlBatchCommit
} from "./sqlCommit.ts"

const unavailable = () => Passkey.PasskeyUnavailable.make({})

/** @internal */
export const preparePasskeyNative = Effect.fnUntraced(
  function*<Value, A>(value: Value, prepare: Passkey.PreparePasskeyCommit<Value, A>) {
    const journal = yield* CurrentCommitJournal

    const receipt = prepare(value, journal)

    if (!(receipt?._tag === "PreparedCommit" && Effect.isEffect(receipt.read))) {
      return yield* invalidPasskeyState()
    }
    yield* registerSqlCommitReceipt(receipt)

    return receipt
  }
)

const services = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: PasskeyNativeMapping,
  batch?: SqlBatchCommit["Service"]
) {
  const boundOwner = yield* Effect.serviceOption(CurrentSqlCommit)
  const state = yield* makePasskeyNativeState(tables, mapping)
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
    Context.add(Digest.Digest, yield* Digest.Digest)
  )
  const { sql, ceremony: flow, credential } = state
  const read = mapping.read

  const provide = <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.provideContext(effect, cryptoServices)

  const run = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    mode: "transaction" | "statement" = "transaction"
  ) =>
    batch === undefined
      ? executor.run(provide(effect), mode).pipe(
        Effect.provideService(AuthenticationClock, state.clockPolicy)
      )
      : executor.batch(provide(effect)).pipe(
        Effect.provideService(SqlBatchCommit, batch),
        Effect.provideService(AuthenticationClock, state.clockPolicy)
      )

  const advisory = <A, E, R>(effect: Effect.Effect<A, E, R>) => executor.read(provide(effect))

  const issue: Passkey.PasskeyPersistence["Service"]["issue"] = (original, prepare) =>
    run(
      Effect.gen(function*() {
        const input = Passkey.snapshotPasskeySync(passkeyOperationInputs.issue, original)
        const ceremony = input.ceremony

        if (
          !flow.validModule(ceremony.moduleId) ||
          !validPasskeyCeremony(ceremony) ||
          ceremony.purpose === "registration"
        ) {
          return yield* preparePasskeyNative({ _tag: "Rejected" }, prepare)
        }
        const statement = flow.insert(ceremony)
        let changed: number

        if (batch !== undefined) {
          yield* flow.stage(statement, 1)
          changed = 1
        } else {
          changed = yield* flow.change(statement).pipe(
            Effect.catchCauseIf(
              (cause) =>
                isMappedConstraintConflict(
                  (error) => Schema.is(SqlError)(error) && error.reason._tag === "UniqueViolation",
                  cause
                ),
              () => Effect.succeed(0)
            )
          )
        }

        return yield* preparePasskeyNative(
          changed === 1 ? { _tag: "Issued", ceremony } : { _tag: "Rejected" },
          prepare
        )
      }),
      "statement"
    )

  const persistence: Passkey.PasskeyPersistence["Service"] = {
    issue,
    context: (original) =>
      advisory(
        Effect.suspend(() => flow.context(Passkey.snapshotPasskeySync(Passkey.PasskeyAccess, original)))
      ),
    consume: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = Passkey.snapshotPasskeySync(passkeyOperationInputs.consume, original)
          const captured = input.credential

          const revision = captured.revision.credentials.find(
            (entry) => entry.credentialId === captured.credentialId
          )

          const assertion = input.assertion

          if (
            !flow.validModule(input.access.moduleId) ||
            !passkeyMatchesAccess(input.ceremony, input.access) ||
            !passkeyAssertionPurposes.some((purpose) => purpose === input.ceremony.purpose) ||
            !validPasskeyCeremony(input.ceremony) ||
            revision === undefined ||
            !captured.active ||
            captured.rpId !== input.ceremony.profile.rpId ||
            assertion.protocolCredentialId !== captured.protocolCredentialId ||
            assertion.backupEligible !== captured.backupEligible ||
            (assertion.userHandle !== undefined && assertion.userHandle !== captured.userHandle)
          ) {
            return yield* preparePasskeyNative("Rejected", prepare)
          }
          const consumed = flow.consume(input.access, input.ceremony)

          if (batch === undefined) {
            if ((yield* flow.change(consumed)) !== 1) {
              return yield* preparePasskeyNative("Rejected", prepare)
            }
          } else yield* flow.stage(consumed, 1)
          const key = yield* passkeyCredentialKey(captured.rpId, captured.protocolCredentialId)

          const exact = (column: string, value: unknown) =>
            exactSqlText(sql, credential.column(column), credential.value(column, value))

          const counter = credential.column(read.credential.counter)
          const next = credential.value(read.credential.counter, assertion.counter)

          const merged = captured.backupEligible
            ? sql`case when ${counter} > ${next} then ${counter} else ${next} end`
            : next

          const identity = [
            exact(read.credential.credentialId, captured.credentialId),
            exact(read.credential.credentialKey, key),
            exact(read.credential.credentialRevision, revision.revision),
            sql`${credential.column(read.credential.backupEligible)} = ${
              credential.value(
                read.credential.backupEligible,
                mapping.telemetry.encodeBackupEligible(captured.backupEligible)
              )
            }`,
            state.active("credential")
          ]

          const statement = sql`${
            credential.update({
              [read.credential.counter]: merged,
              [read.credential.backupState]: mapping.telemetry.encodeBackupState(
                assertion.backupState
              ),
              [mapping.telemetry.lastUsedAt]: state.storedNow
            })
          } where ${
            sql.and([
              ...identity,
              captured.backupEligible
                ? sql`true`
                : sql`((${counter} = 0 and ${next} = 0) or ${counter} < ${next})`
            ])
          }`

          let changed: number

          if (batch === undefined) {
            changed = yield* flow.change(statement)
            if (
              changed === 0 &&
              sql.onDialectOrElse({ mysql: () => true, orElse: () => false }) &&
              (captured.backupEligible || assertion.counter === 0)
            ) {
              // mysql2 can disable FOUND_ROWS. The UPDATE still holds the row lock;
              // prove the unchanged telemetry matched this exact semantic key.
              const matched = yield* sql`select 1 as matched from ${credential.name} where ${sql.and(identity)} and ${
                captured.backupEligible ? sql`${counter} >= ${next}` : sql`${counter} = 0`
              } and ${credential.column(read.credential.backupState)} = ${
                credential.value(
                  read.credential.backupState,
                  mapping.telemetry.encodeBackupState(assertion.backupState)
                )
              }`

              if (matched.length === 1) changed = 1
            }
          } else {
            yield* flow.stage(statement, 1)
            changed = 1
          }

          if (Option.isSome(boundOwner)) {
            // Protect the accepted result from later bound application SQL. BE
            // retains the observed accepted floor; it does not compare an entire
            // telemetry snapshot or reject valid out-of-order assertions.
            const acceptedCounter = captured.backupEligible
              ? sql`${counter} >= ${
                credential.value(read.credential.counter, Math.max(captured.counter, assertion.counter))
              }`
              : sql`${counter} = ${next}`

            const condition = sql.and([
              flow.absent(input.access),
              changed === 1
                ? sql`exists(select 1 from ${credential.name} where ${sql.and(identity)} and ${acceptedCounter}
                    and ${credential.column(read.credential.backupState)} = ${
                  credential.value(
                    read.credential.backupState,
                    mapping.telemetry.encodeBackupState(assertion.backupState)
                  )
                })`
                : sql`true`
            ])

            if (batch === undefined) {
              yield* registerSqlPostcondition({
                name: "passkey-consume-preserved",
                check: Effect.gen(function*() {
                  const rows = yield* sql`select 1 where ${condition}`

                  if (!(rows.length === 1)) {
                    return yield* PersistenceMappingError.make({
                      operation: "postcondition",
                      cause: invalidPasskeyState()
                    })
                  }
                })
              })
            } else {
              yield* registerSqlBatchPostcondition({
                name: "passkey-consume-preserved",
                statement: sqlBatchAssertion(sql, condition)
              })
            }
          }

          return yield* preparePasskeyNative(changed === 1 ? "Verified" : "Rejected", prepare)
        })
      ),
    cleanup: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = Passkey.snapshotPasskeySync(passkeyOperationInputs.cleanup, original)

          if (!flow.validModule(input.moduleId)) return yield* invalidPasskeyState()

          return yield* preparePasskeyNative(
            yield* flow.cleanup(input.moduleId, input.limit, batch !== undefined),
            prepare
          )
        }),
        "statement"
      )
  }

  const credentials = makePasskeyNativeCredentialService(state, read, advisory)

  return {
    batch: batch !== undefined,
    state,
    executor,
    run,
    advisory,
    passkeyPersistence: persistence,
    passkeyCredentials: credentials
  }
})

export const makeNativePasskeyServices = (tables: NativeSqlTables, mapping: PasskeyNativeMapping) =>
  services(tables, mapping)

export const makeBatchPasskeyServices = (tables: NativeSqlTables, mapping: PasskeyNativeMapping) =>
  Effect.flatMap(SqlBatchCommit, (batch) => services(tables, mapping, batch))

export type NativePasskeyServices = Effect.Success<ReturnType<typeof makeNativePasskeyServices>>

const makePasskeyNativeCredentialService = (
  state: PasskeyNativeReadState,
  read: PasskeyNativeRead,
  advisory: <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<
    A,
    Passkey.PasskeyUnavailable,
    Exclude<
      Exclude<Exclude<R, Digest.Digest | SecureRandom.SecureRandom>, SqlClient>,
      LifecycleHooks
    >
  >
) => {
  const { sql, joinedSubject: subject, joinedFactor: factor, joinedCredential: credential } = state

  const credentials: Passkey.PasskeyCredentials["Service"] = {
    lookup: (original) =>
      advisory(
        Effect.gen(function*() {
          const input = Passkey.snapshotPasskeySync(passkeyOperationInputs.lookup, original)

          return yield* state.lookup(input.rpId, input.protocolCredentialId)
        })
      ),
    listForSubject: (original) =>
      advisory(
        Effect.gen(function*() {
          const input = Passkey.snapshotPasskeySync(passkeyOperationInputs.listForSubject, original)

          const nativeId = yield* state.native(input.subjectId)

          const rows = yield* sql`select ${subject.fields("s_")}, ${factor.fields("f_")}, ${credential.fields("c_")}
        from ${state.selected("subject", "passkey_subject")}
        left join ${state.selected("authority", "passkey_factor")} on ${factor.column(read.authority.subjectId)} = ${
            factor.value(read.authority.subjectId, nativeId)
          }
        left join ${state.selected("credential", "passkey_credential")} on ${
            credential.column(read.credential.subjectId)
          } = ${credential.value(read.credential.subjectId, nativeId)} and ${
            credential.column(read.credential.rpId)
          } = ${credential.value(read.credential.rpId, input.rpId)}
        where ${subject.column(read.subject.id)} = ${subject.value(read.subject.id, nativeId)} limit 4097`

          if (rows.length === 0 || rows.length > 4096) return undefined
          const subjectRow = subject.decode(rows[0]!, "s_")

          if (
            !rows.every((selected) => {
              const other = subject.decode(selected, "s_")

              return (
                state.sameId(read.subject.decodeId(other), nativeId) &&
                other[read.subject.securityRevision] === subjectRow[read.subject.securityRevision]
              )
            })
          ) {
            return yield* invalidPasskeyState()
          }

          const revision = yield* state.revision(
            subjectRow,
            rows.map((row) => factor.decode(row, "f_"))
          )

          if (!(revision.subjectId === input.subjectId)) return yield* invalidPasskeyState()
          const values = new Map<string, Passkey.PasskeyCredential>()

          for (const selected of rows) {
            const row = credential.decode(selected, "c_")

            if (row[read.credential.credentialId] === null) continue
            const decoded = yield* state.decodeCredential(row, revision, subjectRow)

            if (decoded !== undefined) values.set(decoded.credentialId, decoded)
          }
          const userHandle = values.values().next().value?.userHandle

          return Passkey.snapshotPasskeySync(Passkey.PasskeyEnrollmentSnapshot, {
            revision,
            ...(userHandle === undefined ? {} : { userHandle }),
            credentials: [...values.values()].map((value) => ({
              type: "public-key" as const,
              id: value.protocolCredentialId
            }))
          })
        })
      )
  }

  return credentials
}

export const makeNativePasskeyCredentialServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: PasskeyNativeRead
) {
  const state = yield* makePasskeyNativeReadState(tables, mapping)
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
    Context.add(Digest.Digest, yield* Digest.Digest)
  )

  const advisory = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    executor.read(Effect.provideContext(effect, cryptoServices))

  return { passkeyCredentials: makePasskeyNativeCredentialService(state, mapping, advisory) }
})
