import { CurrentCommitJournal, type LifecycleHooks } from "@effect/auth/Hooks"
import type { LoginIdentifier } from "@effect/auth/Identity"
import { AuthenticationClock } from "@effect/auth/Operations"
import * as Password from "@effect/auth/Password"
import { ProofRedemptionInput } from "@effect/auth/Proofs"
import type { SubjectId } from "@effect/auth/Schema"
import { type AuthenticationRequirement, SecurityRevision } from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"
import { type Fragment, fragment, parameter } from "effect/sql/Statement"

import { sqlBatchAssertion } from "./d1Planning.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import type { AnyPasswordPersistenceMapping } from "./models/passwordModel.ts"
import type { AnyProofPersistenceMapping } from "./models/proofModel.ts"
import { nativeSqlAlias, type NativeSqlTables, type SqlTable } from "./nativeSqlTable.ts"
import { makePasswordCredentials, samePasswordCredentialSnapshot } from "./passwordCredentials.ts"
import {
  allocatePasswordNextSecurityRevision,
  allocatePasswordValue,
  passwordEvidenceSatisfiedAt,
  passwordProofRedemptionMatches,
  snapshotPasswordMutation,
  validatePasswordMutation
} from "./passwordPolicy.ts"
import { makeNativeProofStore } from "./proofNative.ts"
import { exactSqlText, executeSqlChange } from "./sqlChange.ts"
import {
  appendSqlBatchStatement,
  CurrentSqlCommit,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlCommitReceipt,
  registerSqlPostcondition,
  SqlBatchCommit
} from "./sqlCommit.ts"
import { guardSqlitePolicy } from "./sqlitePolicyGuard.ts"
import { requireStandalone } from "./standalone.ts"

const unavailable = () => Password.PasswordUnavailable.make({})

const invalidState = () => unavailable()

export const makeNativePasswordServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: AnyPasswordPersistenceMapping,
  proofs?: AnyProofPersistenceMapping
): Effect.fn.Return<
  { readonly passwordPersistence: Password.PasswordPersistence["Service"] },
  Password.PasswordUnavailable,
  SqlClient | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom | SqlBatchCommit
> {
  const batch = yield* SqlBatchCommit
  const clockPolicy = yield* AuthenticationClock
  const sql = (yield* SqlClient).withoutTransforms()
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
    Context.add(Digest.Digest, yield* Digest.Digest)
  )
  const parent = yield* Effect.serviceOption(CurrentSqlCommit)

  const s = mapping.subject,
    i = mapping.identifier,
    c = mapping.credential,
    a = mapping.authorityCredential

  const subject = tables(s.table).as("password_subject")
  const identifier = tables(i.table).as("password_identifier")
  const credential = tables(c.table).as("password_credential")
  const authority = tables(a.table).as("password_authority")

  const rawSubject = tables(s.table),
    rawPassword = tables(c.table),
    rawAuthority = tables(a.table)

  // Action policy may inspect any application column. Authority columns have
  // separate checks and securityRevision intentionally changes in this mutation.
  const policyColumns = rawSubject.keys.filter(
    (key) => key !== s.id && key !== s.status && key !== s.securityRevision
  )

  const now = tables.expression(mapping.clock.engineNowMillis)
  const lock = sql.onDialectOrElse({ sqlite: () => sql``, orElse: () => sql`for update` })

  const exact = (table: SqlTable, key: string, value: unknown) =>
    exactSqlText(sql, table.column(key), table.value(key, value))

  const subjectKey = (table: SqlTable, key: string, nativeId: unknown) =>
    sql`${table.column(key)} = ${table.value(key, nativeId)}`

  const run = <A, E, R>(work: Effect.Effect<A, E, R>) =>
    (batch === undefined
      ? executor.run(work.pipe(Effect.provideContext(cryptoServices)))
      : executor
        .batch(work.pipe(Effect.provideContext(cryptoServices)))
        .pipe(Effect.provideService(SqlBatchCommit, batch))).pipe(
        Effect.provideService(AuthenticationClock, clockPolicy)
      )

  const read = Effect.fnUntraced(function*(
    moduleId: string,
    subjectId: SubjectId,
    wanted?: LoginIdentifier,
    locked?: Record<string, unknown>
  ) {
    const nativeId = yield* mapping.subjectId.toNative(subjectId)

    // Without one wanted identifier, retired identifiers would multiply authority
    // rows; read authority separately so the result grows linearly.
    const joined = wanted !== undefined

    const rows = yield* sql`select ${subject.fields("password_subject_")}, ${
      identifier.fields("password_identifier_")
    }, ${credential.fields("password_credential_")}${
      joined ? sql`, ${authority.fields("password_authority_")}` : sql``
    }, ${now} as engine_now
      from ${subject.name}
      left join ${identifier.name} on ${subjectKey(identifier, i.subjectId, nativeId)} ${
      wanted === undefined
        ? sql``
        : sql`and ${exact(identifier, i.namespace, wanted.namespace)} and ${exact(identifier, i.value, wanted.value)}`
    }
      left join ${credential.name} on ${subjectKey(credential, c.subjectId, nativeId)} and ${
      exact(credential, c.moduleId, moduleId)
    }
      ${joined ? sql`left join ${authority.name} on ${subjectKey(authority, a.subjectId, nativeId)}` : sql``}
      where ${subjectKey(subject, s.id, nativeId)} order by ${identifier.column(i.namespace)}, ${
      identifier.column(i.value)
    }${joined ? sql`, ${authority.column(a.credentialId)}` : sql``} limit 4097`

    const authorityRows = joined
      ? rows
      : yield* sql`select ${authority.fields("password_authority_")} from ${authority.name} where ${
        subjectKey(authority, a.subjectId, nativeId)
      } order by ${authority.column(a.credentialId)} limit 4097`

    if (!(rows.length <= 4096 && authorityRows.length <= 4096)) return yield* invalidState()
    if (rows[0] === undefined) return undefined
    const subjectRow = subject.decode(rows[0], "password_subject_")
    const decodedId = yield* mapping.subjectId.toSubject(subjectRow[s.id])

    if (
      !(
        decodedId === subjectId &&
        (locked === undefined || subjectRow[s.securityRevision] === locked[s.securityRevision])
      )
    ) {
      return yield* invalidState()
    }
    const password = credential.decode(rows[0], "password_credential_")
    const passwordRow = password[c.credentialId] === null ? undefined : password

    const factors = new Map<
      string,
      {
        readonly credentialId: string
        readonly revision: SecurityRevision
        readonly active: boolean
      }
    >()

    let identifierRow: Record<string, unknown> | undefined

    for (const row of authorityRows) {
      const factor = authority.decode(row, "password_authority_")

      if (
        factor[a.credentialId] !== null &&
        (a.status === undefined || a.isActiveStatus?.(factor[a.status]) === true)
      ) {
        if (!mapping.subjectId.equals(factor[a.subjectId], nativeId)) return yield* invalidState()
        const id = yield* Schema.decodeUnknownEffect(Schema.String)(factor[a.credentialId])
        const revision = yield* Schema.decodeUnknownEffect(SecurityRevision)(factor[a.revision])
        const old = factors.get(id)

        if (!(old === undefined || old.revision === revision)) return yield* invalidState()
        factors.set(id, { credentialId: id, revision, active: true })
      }
    }
    for (const row of rows) {
      const entry = identifier.decode(row, "password_identifier_")

      if (
        entry[i.namespace] !== null &&
        mapping.subjectId.equals(entry[i.subjectId], nativeId) &&
        mapping.identifier.isCurrent(entry)
      ) {
        identifierRow ??= entry
      }
    }
    if (!(factors.size <= 64)) return yield* invalidState()

    const revision = {
      subjectId,
      securityRevision: yield* Schema.decodeUnknownEffect(SecurityRevision)(
        subjectRow[s.securityRevision]
      ),
      credentials: [...factors.values()].map(({ credentialId, revision }) => ({
        credentialId,
        revision
      }))
    }

    const snapshot = identifierRow === undefined || passwordRow === undefined
      ? undefined
      : yield* mapping.credential
        .decode({
          moduleId,
          subject: subjectRow,
          identifier: identifierRow,
          credential: passwordRow
        })
        .pipe(Effect.flatMap(Password.snapshotPasswordCredential))

    if (snapshot !== undefined) {
      if (
        !(
          snapshot.revision.subjectId === subjectId &&
          snapshot.credentialId === passwordRow?.[c.credentialId]
        )
      ) {
        return yield* invalidState()
      }
    }

    return {
      nativeId,
      subjectRow,
      policyValues: batch === undefined
        ? []
        : policyColumns.map((key) => ({
          column: rawSubject.selectedColumn(key),
          value: fragment([
            parameter(
              rows[0][nativeSqlAlias("password_subject_", rawSubject.keys.indexOf(key))]
            )
          ])
        })),
      identifierRow,
      passwordRow,
      revision,
      snapshot: snapshot === undefined ? undefined : { ...snapshot, revision },
      now: yield* Schema.decodeEffect(Schema.Int)(Number(rows[0].engine_now))
    }
  })

  const prepare = Effect.fnUntraced(function*<V, A>(value: V, project: Password.PreparePasswordCommit<V, A>) {
    const journal = yield* CurrentCommitJournal

    const receipt = project(value, journal)

    if (!(receipt?._tag === "PreparedCommit" && Effect.isEffect(receipt.read))) {
      return yield* invalidState()
    }
    yield* registerSqlCommitReceipt(receipt)

    return receipt
  })

  const mutation = <A>(
    original: Password.PasswordMutationInput,
    action: Password.PasswordAction,
    project: Password.PreparePasswordCommit<Password.PasswordMutationDecision, A>,
    redemption?: Parameters<Password.PasswordPersistence["Service"]["resetWithProof"]>[0]["redemption"]
  ) =>
    run(
      Effect.gen(function*() {
        const input = yield* snapshotPasswordMutation(original)
        const nativeId = yield* mapping.subjectId.toNative(input.expectedRevision.subjectId)

        const rows = yield* sql`select ${rawSubject.fields("password_lock_")} from ${rawSubject.name} where ${
          subjectKey(rawSubject, s.id, nativeId)
        } limit 2 ${batch === undefined ? lock : sql``}`

        if (rows.length === 0) return yield* prepare("rejected" as const, project)
        if (!(rows.length === 1)) return yield* invalidState()
        const locked = rawSubject.decode(rows[0]!, "password_lock_")

        const state = yield* read(
          input.moduleId,
          input.expectedRevision.subjectId,
          input.credential?.identifier,
          locked
        )

        if (state === undefined) return yield* prepare("rejected" as const, project)
        const requirement = yield* s.decodeActionRequirement(state.subjectRow, action)

        const valid = yield* validatePasswordMutation(
          mapping,
          input,
          action,
          {
            subject: {
              active: s.isActiveStatus(state.subjectRow[s.status]),
              securityRevision: state.revision.securityRevision
            },
            identifierCurrent: state.identifierRow !== undefined,
            credentials: state.revision.credentials.map((entry) => ({ ...entry, active: true })),
            snapshot: Effect.succeed(state.snapshot),
            requirement: Effect.succeed(requirement)
          },
          state.now
        )

        if (
          valid === undefined ||
          (action === "add-password"
            ? state.passwordRow !== undefined
            : state.snapshot === undefined ||
              input.credential === undefined ||
              !samePasswordCredentialSnapshot(state.snapshot, input.credential))
        ) {
          return yield* prepare("rejected" as const, project)
        }
        let proofValidity = sql`1 = 1`

        if (redemption !== undefined) {
          if (proofs === undefined) return yield* unavailable()

          const captured = {
            ...redemption,
            input: yield* Schema.decodeEffect(ProofRedemptionInput)(redemption.input)
          }

          if (!passwordProofRedemptionMatches({ ...input, redemption: captured })) {
            return yield* prepare("rejected" as const, project)
          }
          // Inherit the physical owner; application owners retain the exact consumed
          // proof absence check after their callback.
          const proof = yield* makeNativeProofStore(tables, proofs, batch !== undefined)
          const redeemed = yield* proof.redeemLocked(captured.input)

          const proofReceipt = captured.prepare(
            redeemed.decision,
            yield* CurrentCommitJournal,
            (value) => value
          )

          yield* registerSqlCommitReceipt(proofReceipt)
          if (redeemed.decision === "rejected") return yield* prepare("rejected" as const, project)
          proofValidity = redeemed.validUntil
        }
        const mode = "interactive"

        const credentialId = input.credential?.credentialId ??
          (yield* allocatePasswordValue(
            mode,
            mapping.allocateCredentialId,
            mapping.allocateCredentialIdSync
          ))

        const credentialRevision = yield* allocatePasswordValue(
          mode,
          mapping.allocateRevision,
          mapping.allocateRevisionSync
        )

        const verifierVersion = yield* allocatePasswordValue(
          mode,
          mapping.allocateRevision,
          mapping.allocateRevisionSync
        )

        const nextSecurityRevision = yield* allocatePasswordNextSecurityRevision(
          mapping,
          mode,
          input.expectedRevision.securityRevision
        )

        if (
          !(
            nextSecurityRevision !== input.expectedRevision.securityRevision &&
            credentialRevision !== input.credential?.credentialRevision &&
            verifierVersion !== input.credential?.verifierVersion
          )
        ) {
          return yield* invalidState()
        }

        const freshUntil = Effect.fnUntraced(function*(
          requirement: AuthenticationRequirement
        ): Effect.fn.Return<number | undefined> {
          const deadlines = [
            ...new Set(
              input.authorization.evidence.proofs.map(
                (proof) => DateTime.toEpochMillis(proof.verifiedAt) + requirement.maximumAgeMillis
              )
            )
          ]
            .filter((time) => time > state.now)
            .sort((a, b) => a - b)

          for (const time of deadlines) {
            if (
              !(yield* passwordEvidenceSatisfiedAt(input.authorization.evidence, requirement, time))
            ) {
              return time
            }
          }
        })

        if (batch !== undefined) {
          yield* guardSqlitePolicy({
            name: "password-subject-policy",
            table: rawSubject.name,
            owner: subjectKey(rawSubject, s.id, nativeId),
            values: state.policyValues
          })
        }

        const requestedDeadline = yield* freshUntil(input.authorization.requirement),
          currentDeadline = yield* freshUntil(requirement)

        if (!(requestedDeadline !== undefined && currentDeadline !== undefined)) {
          return yield* invalidState()
        }
        const deadline = Math.min(requestedDeadline, currentDeadline)
        const freshness = sql`${now} >= ${state.now} and ${now} < ${deadline} and ${proofValidity}`

        const stage = Effect.fnUntraced(function*(statement: Fragment) {
          if (batch === undefined) {
            if (!((yield* executeSqlChange(sql, statement)) === 1)) return yield* invalidState()
          } else {
            yield* appendSqlBatchStatement(sql`${statement}`)
            yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = 1`))
          }
        })

        if (batch !== undefined) {
          if (
            s.d1ActiveStatusValue === undefined ||
            (a.status !== undefined && a.d1ActiveStatusValue === undefined)
          ) {
            return yield* unavailable()
          }

          const factors = state.revision.credentials.map(
            (factor) =>
              sql`exists(select 1 from ${rawAuthority.name} where ${
                subjectKey(rawAuthority, a.subjectId, nativeId)
              } and ${exact(rawAuthority, a.credentialId, factor.credentialId)} and ${
                exact(rawAuthority, a.revision, factor.revision)
              } ${
                a.status === undefined
                  ? sql``
                  : sql`and ${rawAuthority.column(a.status)} = ${rawAuthority.value(a.status, a.d1ActiveStatusValue)}`
              })`
          )

          const active = a.status === undefined
            ? sql`1 = 1`
            : sql`${rawAuthority.column(a.status)} = ${rawAuthority.value(a.status, a.d1ActiveStatusValue)}`

          const condition = sql.and([
            sql`exists(select 1 from ${rawSubject.name} where ${subjectKey(rawSubject, s.id, nativeId)} and ${
              exact(rawSubject, s.securityRevision, input.expectedRevision.securityRevision)
            } and ${rawSubject.column(s.status)} = ${rawSubject.value(s.status, s.d1ActiveStatusValue)})`,
            sql`(select count(*) from ${rawAuthority.name} where ${
              subjectKey(rawAuthority, a.subjectId, nativeId)
            } and ${active}) = ${factors.length}`,
            ...factors,
            freshness
          ])

          yield* appendSqlBatchStatement(sqlBatchAssertion(sql, condition))
          if (input.credential !== undefined) {
            if (i.d1CurrentCondition === undefined) return yield* unavailable()
            yield* appendSqlBatchStatement(
              sqlBatchAssertion(
                sql,
                sql`exists(select 1 from ${tables(i.table).name} where ${
                  exact(tables(i.table), i.namespace, input.credential.identifier.namespace)
                } and ${exact(tables(i.table), i.value, input.credential.identifier.value)} and ${
                  subjectKey(tables(i.table), i.subjectId, nativeId)
                } and ${
                  tables.expression(
                    i.d1CurrentCondition({ identifier: input.credential.identifier, nativeSubjectId: nativeId })
                  )
                })`
              )
            )
          }
        }
        const revisions = { credentialId, credentialRevision, verifierVersion }

        if (input.credential === undefined) {
          yield* stage(
            sql`${
              rawPassword.insert(
                c.encodeInsert({
                  moduleId: input.moduleId,
                  subjectId: nativeId,
                  replacement: input.replacement,
                  ...revisions
                })
              )
            }`
          )
          yield* stage(
            sql`${
              rawAuthority.insert(a.encodeInsert({ subjectId: nativeId, credentialId, revision: credentialRevision }))
            }`
          )
        } else {
          const old = input.credential

          yield* stage(
            sql`${
              rawPassword.update(
                c.encodeReplacement({ replacement: input.replacement, credentialRevision, verifierVersion })
              )
            } where ${subjectKey(rawPassword, c.subjectId, nativeId)} and ${
              exact(rawPassword, c.moduleId, input.moduleId)
            } and ${exact(rawPassword, c.credentialId, old.credentialId)} and ${
              exact(rawPassword, c.credentialRevision, old.credentialRevision)
            } and ${exact(rawPassword, c.verifierVersion, old.verifierVersion)} and ${
              exact(rawPassword, c.verifier, Redacted.value(old.verifier))
            } and ${exact(rawPassword, c.normalization, old.normalization)} and ${freshness}`
          )
          yield* stage(
            sql`${rawAuthority.update(a.encodeRevision(credentialRevision))} where ${
              subjectKey(rawAuthority, a.subjectId, nativeId)
            } and ${exact(rawAuthority, a.credentialId, old.credentialId)} and ${
              exact(rawAuthority, a.revision, old.credentialRevision)
            }`
          )
        }

        const expectedFactors = state.revision.credentials
          .filter((factor) => factor.credentialId !== credentialId)
          .concat({ credentialId, revision: credentialRevision })

        const finalPassword = sql`exists(select 1 from ${rawPassword.name} where ${
          subjectKey(rawPassword, c.subjectId, nativeId)
        } and ${exact(rawPassword, c.moduleId, input.moduleId)} and ${
          exact(rawPassword, c.credentialId, credentialId)
        } and ${exact(rawPassword, c.credentialRevision, credentialRevision)} and ${
          exact(rawPassword, c.verifierVersion, verifierVersion)
        } and ${exact(rawPassword, c.verifier, Redacted.value(input.replacement.verifier))} and ${
          exact(rawPassword, c.normalization, input.replacement.normalization)
        })`

        const canGuardResult = (a.status === undefined || a.d1ActiveStatusValue !== undefined) &&
          (input.credential === undefined || i.d1CurrentCondition !== undefined)

        let resultingState: Fragment | undefined

        if (canGuardResult) {
          const active = a.status === undefined
            ? sql`1 = 1`
            : sql`${rawAuthority.column(a.status)} = ${rawAuthority.value(a.status, a.d1ActiveStatusValue)}`

          const conditions: Array<Fragment> = [
            finalPassword,
            freshness,
            sql`(select count(*) from ${rawAuthority.name} where ${
              subjectKey(rawAuthority, a.subjectId, nativeId)
            } and ${active}) = ${expectedFactors.length}`,
            ...expectedFactors.map(
              (factor) =>
                sql`exists(select 1 from ${rawAuthority.name} where ${
                  subjectKey(rawAuthority, a.subjectId, nativeId)
                } and ${exact(rawAuthority, a.credentialId, factor.credentialId)} and ${
                  exact(rawAuthority, a.revision, factor.revision)
                } and ${active})`
            )
          ]

          if (input.credential !== undefined) {
            const expected = input.credential
            const identifierTable = tables(i.table)

            if (!(i.d1CurrentCondition !== undefined)) return yield* invalidState()
            conditions.push(
              sql`exists(select 1 from ${identifierTable.name} where ${
                exact(identifierTable, i.namespace, expected.identifier.namespace)
              } and ${exact(identifierTable, i.value, expected.identifier.value)} and ${
                subjectKey(identifierTable, i.subjectId, nativeId)
              } and ${
                tables.expression(i.d1CurrentCondition({ identifier: expected.identifier, nativeSubjectId: nativeId }))
              })`,
              sql`exists(select 1 from ${identifierTable.name} where ${
                exact(identifierTable, i.namespace, expected.identifier.namespace)
              } and ${exact(identifierTable, i.value, expected.identifier.value)} and ${
                subjectKey(identifierTable, i.subjectId, nativeId)
              } and ${exact(identifierTable, i.bindingRevision, expected.identifierBindingRevision)} and ${
                expected.identifierVerifiedAtMillis === undefined
                  ? sql`${identifierTable.column(i.verifiedAt)} is null`
                  : sql`${identifierTable.column(i.verifiedAt)} = ${
                    identifierTable.value(
                      i.verifiedAt,
                      mapping.clock.encodeInstant(expected.identifierVerifiedAtMillis)
                    )
                  }`
              })`
            )
          }
          resultingState = sql.and(conditions)
        }
        yield* stage(
          sql`${rawSubject.update({ [s.securityRevision]: nextSecurityRevision })} where ${
            subjectKey(rawSubject, s.id, nativeId)
          } and ${exact(rawSubject, s.securityRevision, input.expectedRevision.securityRevision)} and ${
            rawSubject.column(s.status)
          } = ${rawSubject.value(s.status, locked[s.status])} and ${freshness} and ${resultingState ?? sql`1 = 1`}`
        )
        if (batch !== undefined) {
          if (!(resultingState !== undefined)) return yield* invalidState()
          yield* registerSqlBatchPostcondition({
            name: "password-replacement-authority",
            statement: sqlBatchAssertion(
              sql,
              sql.and([
                resultingState,
                sql`exists(select 1 from ${rawSubject.name} where ${subjectKey(rawSubject, s.id, nativeId)} and ${
                  exact(rawSubject, s.securityRevision, nextSecurityRevision)
                } and ${rawSubject.column(s.status)} = ${rawSubject.value(s.status, s.d1ActiveStatusValue)})`
              ])
            )
          })
        } else if (Option.isSome(parent) || resultingState === undefined) {
          yield* registerSqlPostcondition({
            name: "password-replacement-authority",
            check: Effect.gen(function*() {
              const final = yield* read(
                input.moduleId,
                input.expectedRevision.subjectId,
                input.credential?.identifier
              )

              if (
                !(
                  final !== undefined &&
                  s.isActiveStatus(final.subjectRow[s.status]) &&
                  final.revision.securityRevision === nextSecurityRevision &&
                  final.revision.credentials.length === expectedFactors.length &&
                  expectedFactors.every((factor) =>
                    final.revision.credentials.some(
                      (entry) =>
                        entry.credentialId === factor.credentialId &&
                        entry.revision === factor.revision
                    )
                  ) &&
                  final.now >= state.now &&
                  final.now < deadline
                )
              ) {
                return yield* invalidState()
              }
              const password = final.passwordRow

              if (
                !(
                  password !== undefined &&
                  password[c.credentialId] === credentialId &&
                  password[c.credentialRevision] === credentialRevision &&
                  password[c.verifierVersion] === verifierVersion &&
                  password[c.verifier] === Redacted.value(input.replacement.verifier) &&
                  password[c.normalization] === input.replacement.normalization
                )
              ) {
                return yield* invalidState()
              }
              if (input.credential !== undefined) {
                if (
                  !(
                    final.snapshot !== undefined &&
                    final.snapshot.identifierBindingRevision ===
                      input.credential.identifierBindingRevision &&
                    final.snapshot.identifierVerifiedAtMillis ===
                      input.credential.identifierVerifiedAtMillis
                  )
                ) {
                  return yield* invalidState()
                }
              }
            }).pipe(
              Effect.catchCause((cause) =>
                Effect.failCause(
                  Cause.map(cause, (error) => PersistenceMappingError.make({ operation: "decode", cause: error }))
                )
              )
            )
          })
        }

        return yield* prepare("changed" as const, project)
      })
    )

  const credentials = yield* makePasswordCredentials(tables, mapping, {
    mode: "interactive",
    locking: false,
    coordinated: Option.isSome(parent),
    standaloneGuard: requireStandalone(unavailable, sql.transactionService)
  })

  const passwordPersistence: Password.PasswordPersistence["Service"] = {
    ...credentials,
    readForSubject: (input) =>
      executor.read(
        Effect.map(read(input.moduleId, input.subjectId), (state) =>
          state === undefined || !s.isActiveStatus(state.subjectRow[s.status])
            ? Option.none()
            : Option.fromUndefinedOr(state.snapshot))
      ),
    recoveryTarget: (input) =>
      executor.read(
        Effect.gen(function*() {
          const rows = yield* sql`select ${identifier.fields("password_recovery_")} from ${identifier.name} where ${
            exact(identifier, i.namespace, input.identifier.namespace)
          } and ${exact(identifier, i.value, input.identifier.value)} limit 2`

          if (rows.length === 0) return Option.none()
          if (!(rows.length === 1)) return yield* invalidState()
          const row = identifier.decode(rows[0]!, "password_recovery_")

          if (!i.isCurrent(row)) return Option.none()
          const subjectId = yield* mapping.subjectId.toSubject(row[i.subjectId])
          const state = yield* read(input.moduleId, subjectId, input.identifier)

          return state === undefined ||
              !s.isActiveStatus(state.subjectRow[s.status]) ||
              state.snapshot?.identifierVerifiedAtMillis === undefined
            ? Option.none()
            : Option.some(state.snapshot)
        })
      ),
    addIfAbsent: (input, project) => mutation(input, "add-password", project),
    replaceIfCurrent: (input, project) => mutation(input, "change-password", project),
    resetWithProof: (input, project) => mutation(input, "reset-password", project, input.redemption)
  }

  return { passwordPersistence }
})
