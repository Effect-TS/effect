import * as Email from "@effect/auth/Email"
import { CurrentCommitJournal, type LifecycleHooks } from "@effect/auth/Hooks"
import { ProofRedemptionInput } from "@effect/auth/Proofs"
import type { AuthenticationRevision } from "@effect/auth/Sessions"
import { SecurityRevision } from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { sqlBatchAssertion } from "./d1Planning.ts"
import {
  emailUnavailable as unavailable,
  invalidEmailState as invalidState,
  makeNativeEmailReader
} from "./emailNativeState.ts"
import {
  allocateEmailSecurityRevision,
  allocateEmailValue,
  sameEmailRevision,
  snapshotEmailMutation,
  validateEmailMutation
} from "./emailPolicy.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import type { AnyEmailAddressMapping, AnyEmailSignInMapping } from "./models/emailModel.ts"
import type { AnyProofPersistenceMapping } from "./models/proofModel.ts"
import type { NativeSqlTables, SqlTable } from "./nativeSqlTable.ts"
import { passwordEvidenceSatisfiedAt } from "./passwordPolicy.ts"
import { makeNativeProofStore } from "./proofNative.ts"
import { exactSqlText, executeSqlChange } from "./sqlChange.ts"
import {
  appendSqlBatchStatement,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlCommitReceipt,
  registerSqlPostcondition,
  SqlBatchCommit
} from "./sqlCommit.ts"

export const makeNativeEmailSignInServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: AnyEmailSignInMapping
): Effect.fn.Return<
  { readonly emailSignInTargets: Email.EmailSignInTargets["Service"] },
  never,
  SqlClient | LifecycleHooks
> {
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const reader = yield* makeNativeEmailReader(tables, mapping)

  return {
    emailSignInTargets: Email.EmailSignInTargets.of({
      lookup: (input) => executor.read(reader.lookup(input))
    })
  }
})

export const makeNativeEmailAddressServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: AnyEmailAddressMapping,
  proofs?: AnyProofPersistenceMapping
): Effect.fn.Return<
  { readonly emailAddressPersistence: Email.EmailAddressPersistence["Service"] },
  never,
  SqlClient | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom | SqlBatchCommit
> {
  const batch = yield* SqlBatchCommit

  const sql = (yield* SqlClient).withoutTransforms(),
    executor = yield* makeSqlCommitExecutor(unavailable),
    cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
      Context.add(Digest.Digest, yield* Digest.Digest)
    )

  const now = tables.expression(mapping.clock.engineNowMillis)
  const reader = yield* makeNativeEmailReader(tables, mapping, now)

  const s = mapping.subject,
    i = mapping.identifier,
    c = mapping.credential,
    a = mapping.authorityCredential

  const subject = tables(s.table),
    identifier = tables(i.table),
    credential = tables(c.table),
    authority = tables(a.table)

  const exact = (t: SqlTable, key: string, value: unknown) => exactSqlText(sql, t.column(key), t.value(key, value))

  const id = (t: SqlTable, key: string, value: unknown) => sql`${t.column(key)} = ${t.value(key, value)}`

  const identifierKey = (value: { readonly namespace: string; readonly value: string }) =>
    sql.and([
      exact(identifier, i.namespace, value.namespace),
      exact(identifier, i.value, value.value)
    ])

  const activeSubject = id(subject, s.status, s.activeStatusValue),
    activeCredential = id(credential, c.status, c.activeStatusValue),
    activeAuthority = id(authority, a.status, a.activeStatusValue)

  const lock = sql.onDialectOrElse({ sqlite: () => sql``, orElse: () => sql`for update` })
  const mode = "interactive"

  const run = <A, X, R>(work: Effect.Effect<A, X, R>) =>
    batch === undefined
      ? executor.run(work.pipe(Effect.provideContext(cryptoServices)))
      : executor
        .batch(work.pipe(Effect.provideContext(cryptoServices)))
        .pipe(Effect.provideService(SqlBatchCommit, batch))

  const stage = Effect.fnUntraced(function*(statement: Fragment) {
    if (batch === undefined) {
      if (!((yield* executeSqlChange(sql, statement)) === 1)) return yield* invalidState()
    } else {
      yield* appendSqlBatchStatement(sql`${statement}`)
      yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = 1`))
    }
  })

  const prepare = Effect.fnUntraced(
    function*<A>(
      decision: Email.EmailAddressDecision,
      project: Email.PrepareEmailCommit<Email.EmailAddressDecision, A>
    ) {
      const receipt = project(decision, yield* CurrentCommitJournal)

      yield* registerSqlCommitReceipt(receipt)

      return receipt
    }
  )

  const target = Effect.fnUntraced(function*(
    input: Parameters<Email.EmailAddressPersistence["Service"]["target"]>[0],
    sourceIdentifier?: { readonly namespace: string; readonly value: string }
  ) {
    const state = yield* reader.read({
      moduleId: input.moduleId,
      subjectId: input.subjectId,
      identifier: input.target,
      ...(input.sourceCredentialId === undefined
        ? {}
        : { sourceCredentialId: input.sourceCredentialId }),
      ...(sourceIdentifier === undefined ? {} : { sourceIdentifier }),
      single: mapping.addressCardinality === "single"
    })

    if (state === undefined) return undefined

    const owned = state.targetIdentifier !== undefined &&
      (yield* mapping.subjectId.toSubject(state.targetIdentifier[i.subjectId])) === input.subjectId

    const mutable = owned &&
      mapping.identifier.isMutableTarget(state.targetIdentifier!) &&
      (state.targetCredential === undefined ||
        (!c.isActiveStatus(state.targetCredential[c.status]) &&
          (yield* mapping.subjectId.toSubject(state.targetCredential[c.subjectId])) ===
            input.subjectId))

    const source = state.sourceSnapshot

    const eligible = (state.targetIdentifier === undefined ? state.targetCredential === undefined : mutable) &&
      (input.sourceCredentialId === undefined || source !== undefined) &&
      (source === undefined ||
        source.identifier.namespace !== input.target.namespace ||
        source.identifier.value !== input.target.value) &&
      !state.cardinalityConflict

    const captured: Email.EmailAddressTarget = {
      revision: state.revision,
      eligible,
      ...(source === undefined ? {} : { source }),
      ...(mutable
        ? {
          targetIdentifierRevision: yield* Schema.decodeUnknownEffect(SecurityRevision)(
            state.targetIdentifier![i.bindingRevision]
          )
        }
        : {})
    }

    return { ...state, target: captured }
  })

  const mutate = <A>(
    original: Email.EmailAddressMutation,
    action: Email.EmailAction,
    project: Email.PrepareEmailCommit<Email.EmailAddressDecision, A>
  ) =>
    run(
      Effect.gen(function*() {
        const input = yield* snapshotEmailMutation(original)

        const redemption = yield* Schema.decodeEffect(Schema.toCodecIso(ProofRedemptionInput))(
          yield* Schema.encodeEffect(Schema.toCodecIso(ProofRedemptionInput))(
            original.redemption.input
          )
        )

        const native = yield* mapping.subjectId.toNative(input.captured.revision.subjectId)

        const locked = yield* sql`select ${subject.fields("email_locked_")} from ${subject.name} where ${
          id(subject, s.id, native)
        } limit 2 ${batch === undefined ? lock : sql``}`

        if (locked.length !== 1) return yield* prepare("rejected", project)
        if (
          !(
            (yield* mapping.subjectId.toSubject(
              subject.decode(locked[0]!, "email_locked_")[s.id]
            )) === input.captured.revision.subjectId
          )
        ) {
          return yield* invalidState()
        }

        const current = yield* target(
          {
            moduleId: input.moduleId,
            subjectId: input.captured.revision.subjectId,
            target: input.target,
            ...(input.captured.source === undefined
              ? {}
              : { sourceCredentialId: input.captured.source.credentialId })
          },
          input.captured.source?.identifier
        )

        if (current === undefined || proofs === undefined) {
          return yield* prepare("rejected", project)
        }
        const requirement = yield* s.decodeActionRequirement(current.subject, action)

        if (
          !(yield* validateEmailMutation(
            mapping,
            { ...input, redemption: { input: redemption, prepare: original.redemption.prepare } },
            action,
            { target: current.target, requirement: Effect.succeed(requirement) },
            current.now
          ))
        ) {
          return yield* prepare("rejected", project)
        }
        const requirements = [input.authorization.requirement, requirement]

        const boundaries = [
          ...new Set(
            input.authorization.evidence.proofs.flatMap((proof) =>
              requirements.map(
                (r) => DateTime.toEpochMillis(proof.verifiedAt) + r.maximumAgeMillis
              )
            )
          )
        ]
          .filter((time) => time > current.now)
          .sort((a, b) => a - b)

        let deadline: number | undefined

        for (const time of boundaries) {
          for (const requirement of requirements) {
            if (
              !(yield* passwordEvidenceSatisfiedAt(input.authorization.evidence, requirement, time))
            ) {
              deadline = time
              break
            }
          }
          if (deadline !== undefined) break
        }

        if (!(deadline !== undefined)) return yield* invalidState()
        const freshness = sql`${now} >= ${current.now} and ${now} < ${deadline}`

        const factorCondition = (revision: AuthenticationRevision) =>
          sql.and([
            sql`(select count(*) from ${authority.name} where ${
              id(authority, a.subjectId, native)
            } and ${activeAuthority}) = ${revision.credentials.length}`,
            ...revision.credentials.map(
              (f) =>
                sql`exists(select 1 from ${authority.name} where ${id(authority, a.subjectId, native)} and ${
                  exact(authority, a.credentialId, f.credentialId)
                } and ${exact(authority, a.revision, f.revision)} and ${activeAuthority})`
            )
          ])

        if (batch !== undefined) {
          yield* appendSqlBatchStatement(
            sqlBatchAssertion(
              sql,
              sql.and([
                sql`exists(select 1 from ${subject.name} where ${id(subject, s.id, native)} and ${
                  exact(subject, s.securityRevision, current.revision.securityRevision)
                } and ${activeSubject})`,
                factorCondition(current.revision),
                freshness
              ])
            )
          )
          if (current.targetIdentifier !== undefined) {
            if (!(i.d1MutableTargetCondition !== undefined)) return yield* invalidState()
            yield* appendSqlBatchStatement(
              sqlBatchAssertion(
                sql,
                sql`exists(select 1 from ${identifier.name} where ${identifierKey(input.target)} and ${
                  id(identifier, i.subjectId, native)
                } and ${
                  tables.expression(i.d1MutableTargetCondition({ identifier: input.target, nativeSubjectId: native }))
                })`
              )
            )
          }
          if (current.target.source !== undefined) {
            if (!(i.d1CurrentCondition !== undefined)) return yield* invalidState()
            yield* appendSqlBatchStatement(
              sqlBatchAssertion(
                sql,
                sql`exists(select 1 from ${identifier.name} where ${
                  identifierKey(current.target.source.identifier)
                } and ${id(identifier, i.subjectId, native)} and ${
                  tables.expression(
                    i.d1CurrentCondition({
                      identifier: current.target.source.identifier,
                      nativeSubjectId: native,
                      bindingRevision: current.target.source.identifierRevision
                    })
                  )
                })`
              )
            )
          }
        }

        const proof = yield* makeNativeProofStore(tables, proofs, batch !== undefined),
          redeemed = yield* proof.redeemLocked(redemption)

        yield* registerSqlCommitReceipt(
          original.redemption.prepare(
            redeemed.decision,
            yield* CurrentCommitJournal,
            (value) => value
          )
        )
        if (redeemed.decision !== "redeemed") return yield* prepare("rejected", project)

        const allocate = () => allocateEmailValue(mode, mapping.allocateRevision, mapping.allocateRevisionSync)

        const targetIdentifierRevision = yield* allocate(),
          targetCredentialRevision = yield* allocate(),
          sourceIdentifierRevision = yield* allocate(),
          sourceCredentialRevision = yield* allocate()

        const confirms = action === "verify-address" && current.target.targetIdentifierRevision !== undefined

        const nextSecurityRevision = confirms
          ? current.revision.securityRevision
          : yield* allocateEmailSecurityRevision(mapping, mode, current.revision.securityRevision)

        if (!(confirms || nextSecurityRevision !== current.revision.securityRevision)) {
          return yield* invalidState()
        }

        const targetCredentialId = current.targetCredential === undefined
          ? yield* allocateEmailValue(
            mode,
            mapping.allocateCredentialId,
            mapping.allocateCredentialIdSync
          )
          : yield* Schema.decodeUnknownEffect(Schema.String)(
            current.targetCredential[c.credentialId]
          )

        const source = current.target.source

        if (action === "change-address") {
          if (!(source !== undefined)) return yield* invalidState()
          yield* stage(
            sql`${
              identifier.update(
                i.encodeRetirement({ source: source.identifier, bindingRevision: sourceIdentifierRevision })
              )
            } where ${identifierKey(source.identifier)} and ${id(identifier, i.subjectId, native)} and ${
              exact(identifier, i.bindingRevision, source.identifierRevision)
            }`
          )
          yield* stage(
            sql`${
              credential.update(
                c.encodeRetirement({ source: source.identifier, credentialRevision: sourceCredentialRevision })
              )
            } where ${exact(credential, c.moduleId, input.moduleId)} and ${
              exact(credential, c.credentialId, source.credentialId)
            } and ${id(credential, c.subjectId, native)} and ${
              exact(credential, c.credentialRevision, source.credentialRevision)
            } and ${activeCredential}`
          )
          yield* stage(
            sql`${authority.update(a.encodeRetirement(sourceCredentialRevision))} where ${
              id(authority, a.subjectId, native)
            } and ${exact(authority, a.credentialId, source.credentialId)} and ${
              exact(authority, a.revision, source.credentialRevision)
            } and ${activeAuthority}`
          )
        }
        if (current.targetIdentifier === undefined) {
          yield* stage(
            identifier.insert(
              i.encodeVerifiedInsert({
                identifier: input.target,
                subjectId: native,
                verifiedAtMillis: current.now,
                bindingRevision: targetIdentifierRevision
              })
            )
          )
        } else {
          yield* stage(
            sql`${
              identifier.update(
                i.encodeVerification({ verifiedAtMillis: current.now, bindingRevision: targetIdentifierRevision })
              )
            } where ${identifierKey(input.target)} and ${id(identifier, i.subjectId, native)} and ${
              exact(identifier, i.bindingRevision, current.targetIdentifier[i.bindingRevision])
            } and ${identifier.column(i.verifiedAt)} is null`
          )
        }
        if (current.targetCredential === undefined) {
          yield* stage(
            credential.insert(
              c.encodeVerifiedInsert({
                moduleId: input.moduleId,
                subjectId: native,
                credentialId: targetCredentialId,
                identifier: input.target,
                credentialRevision: targetCredentialRevision
              })
            )
          )
          yield* stage(
            authority.insert(
              a.encodeInsert({
                subjectId: native,
                credentialId: targetCredentialId,
                revision: targetCredentialRevision
              })
            )
          )
        } else {
          const old = current.targetCredential[c.credentialRevision]

          yield* stage(
            sql`${
              credential.update(
                c.encodeActivation({ identifier: input.target, credentialRevision: targetCredentialRevision })
              )
            } where ${exact(credential, c.moduleId, input.moduleId)} and ${
              exact(credential, c.credentialId, targetCredentialId)
            } and ${id(credential, c.subjectId, native)} and ${exact(credential, c.credentialRevision, old)}`
          )
          yield* stage(
            sql`${authority.update(a.encodeActivation(targetCredentialRevision))} where ${
              id(authority, a.subjectId, native)
            } and ${exact(authority, a.credentialId, targetCredentialId)} and ${exact(authority, a.revision, old)}`
          )
        }
        if (!confirms) {
          yield* stage(
            sql`${subject.update({ [s.securityRevision]: nextSecurityRevision })} where ${
              id(subject, s.id, native)
            } and ${
              exact(subject, s.securityRevision, current.revision.securityRevision)
            } and ${activeSubject} and ${freshness}`
          )
        }

        const revision: AuthenticationRevision = {
          subjectId: current.revision.subjectId,
          securityRevision: nextSecurityRevision,
          credentials: [
            ...current.revision.credentials.filter(
              (f) => f.credentialId !== targetCredentialId && f.credentialId !== source?.credentialId
            ),
            { credentialId: targetCredentialId, revision: targetCredentialRevision }
          ].sort((a, b) => a.credentialId.localeCompare(b.credentialId))
        }

        if (batch !== undefined) {
          if (!(i.d1CurrentCondition !== undefined)) return yield* invalidState()

          const conditions = [
            redeemed.validUntil,
            freshness,
            factorCondition(revision),
            sql`exists(select 1 from ${subject.name} where ${id(subject, s.id, native)} and ${
              exact(subject, s.securityRevision, nextSecurityRevision)
            } and ${activeSubject})`,
            sql`exists(select 1 from ${identifier.name} where ${identifierKey(input.target)} and ${
              id(identifier, i.subjectId, native)
            } and ${
              tables.expression(
                i.d1CurrentCondition({
                  identifier: input.target,
                  nativeSubjectId: native,
                  bindingRevision: targetIdentifierRevision
                })
              )
            })`,
            sql`exists(select 1 from ${identifier.name} where ${identifierKey(input.target)} and ${
              id(identifier, i.subjectId, native)
            } and ${exact(identifier, i.bindingRevision, targetIdentifierRevision)} and ${
              id(identifier, i.verifiedAt, mapping.clock.encodeInstant(current.now))
            })`,
            sql`exists(select 1 from ${credential.name} where ${exact(credential, c.moduleId, input.moduleId)} and ${
              exact(credential, c.credentialId, targetCredentialId)
            } and ${id(credential, c.subjectId, native)} and ${
              exact(credential, c.credentialRevision, targetCredentialRevision)
            } and ${exact(credential, c.identifierNamespace, input.target.namespace)} and ${
              exact(credential, c.identifierValue, input.target.value)
            } and ${activeCredential})`
          ]

          if (source !== undefined) {
            conditions.push(
              sql`exists(select 1 from ${identifier.name} where ${identifierKey(source.identifier)} and ${
                id(identifier, i.subjectId, native)
              } and ${exact(identifier, i.bindingRevision, sourceIdentifierRevision)} and not (${
                tables.expression(
                  i.d1CurrentCondition({
                    identifier: source.identifier,
                    nativeSubjectId: native,
                    bindingRevision: sourceIdentifierRevision
                  })
                )
              }))`,
              sql`exists(select 1 from ${credential.name} where ${exact(credential, c.moduleId, input.moduleId)} and ${
                exact(credential, c.credentialId, source.credentialId)
              } and ${id(credential, c.subjectId, native)} and ${
                exact(credential, c.credentialRevision, sourceCredentialRevision)
              } and not (${activeCredential}))`,
              sql`exists(select 1 from ${authority.name} where ${id(authority, a.subjectId, native)} and ${
                exact(authority, a.credentialId, source.credentialId)
              } and ${exact(authority, a.revision, sourceCredentialRevision)} and not (${activeAuthority}))`
            )
          }
          yield* registerSqlBatchPostcondition({
            name: "email-address-authority",
            statement: sqlBatchAssertion(sql, sql.and(conditions))
          })
        } else {
          yield* registerSqlPostcondition({
            name: "email-address-authority",
            check: Effect.gen(function*() {
              const final = yield* reader.read({
                validity: redeemed.validUntil,
                moduleId: input.moduleId,
                subjectId: revision.subjectId,
                identifier: input.target,
                ...(source === undefined
                  ? {}
                  : {
                    sourceCredentialId: source.credentialId,
                    sourceIdentifier: source.identifier
                  })
              })

              if (
                !(
                  final !== undefined &&
                  sameEmailRevision(final.revision, revision) &&
                  final.now >= current.now &&
                  final.now < deadline &&
                  final.targetSnapshot !== undefined &&
                  final.targetSnapshot.credentialId === targetCredentialId &&
                  final.targetSnapshot.credentialRevision === targetCredentialRevision &&
                  final.targetSnapshot.identifierRevision === targetIdentifierRevision &&
                  (yield* mapping.decodeInstant(final.targetIdentifier![i.verifiedAt])) ===
                    current.now
                )
              ) {
                return yield* invalidState()
              }
              const policy = yield* s.decodeActionRequirement(final.subject, action)

              if (
                !(yield* passwordEvidenceSatisfiedAt(
                  input.authorization.evidence,
                  policy,
                  final.now
                ))
              ) {
                return yield* invalidState()
              }
              if (source !== undefined) {
                if (
                  !(
                    final.sourceIdentifier !== undefined &&
                    final.sourceCredential !== undefined &&
                    final.sourceAuthority !== undefined &&
                    (yield* mapping.subjectId.toSubject(final.sourceAuthority[a.subjectId])) ===
                      revision.subjectId &&
                    final.sourceAuthority[a.credentialId] === source.credentialId &&
                    final.sourceAuthority[a.revision] === sourceCredentialRevision &&
                    !a.isActiveStatus(final.sourceAuthority[a.status]) &&
                    (yield* mapping.subjectId.toSubject(final.sourceIdentifier[i.subjectId])) ===
                      revision.subjectId &&
                    final.sourceIdentifier[i.bindingRevision] === sourceIdentifierRevision &&
                    !i.isCurrent(final.sourceIdentifier) &&
                    final.sourceCredential[c.credentialRevision] === sourceCredentialRevision &&
                    !c.isActiveStatus(final.sourceCredential[c.status])
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

        return yield* prepare("changed", project)
      })
    )

  return {
    emailAddressPersistence: Email.EmailAddressPersistence.of({
      target: (input) =>
        executor.read(
          Effect.flatMap(target(input), (value) =>
            value === undefined ? Effect.fail(unavailable()) : Effect.succeed(value.target))
        ),
      verifyWithProof: (input, project) => mutate(input, "verify-address", project),
      changeWithProof: (input, project) => mutate(input, "change-address", project)
    })
  }
})
