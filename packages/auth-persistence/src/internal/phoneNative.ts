import { type CommitJournal, CurrentCommitJournal, type LifecycleHooks, type PreparedCommit } from "@effect/auth/Hooks"
import * as PhoneOtp from "@effect/auth/PhoneOtp"
import { ProofRedemptionInput } from "@effect/auth/Proofs"
import {
  AuthenticationRequirement,
  AuthenticationRevision,
  SecurityRevision,
  snapshotAuthenticationEvidence
} from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { randomId } from "./crypto.ts"
import { sqlBatchAssertion } from "./d1Planning.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import type { AnyPhoneMapping } from "./models/phoneModel.ts"
import type { NativeSqlTables, SqlTable } from "./nativeSqlTable.ts"
import { passwordEvidenceSatisfiedAt } from "./passwordPolicy.ts"
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

const unavailable = () => PhoneOtp.PhoneOtpUnavailable.make({})

const invalidState = () => unavailable()

const resolve = <A>(
  value: A | Effect.Effect<A, PersistenceMappingError>
): Effect.Effect<A, PersistenceMappingError> => Effect.isEffect(value) ? value : Effect.succeed(value)

const targetCodec = Schema.fromJsonString(PhoneOtp.PhoneLifecycleTarget)

const sameRevision = (a: AuthenticationRevision, b: AuthenticationRevision) =>
  a.subjectId === b.subjectId &&
  a.securityRevision === b.securityRevision &&
  a.credentials.length === b.credentials.length &&
  a.credentials.every((f) => b.credentials.some((g) => f.credentialId === g.credentialId && f.revision === g.revision))

/** Canonical identifier rows own phone custody, including permanent retired numbers. */
export const makeNativePhoneServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: AnyPhoneMapping
): Effect.fn.Return<
  {
    readonly phonePersistence: PhoneOtp.PhonePersistence["Service"]
    readonly phoneSignInTargets: PhoneOtp.PhoneSignInTargets["Service"]
  },
  PhoneOtp.PhoneOtpUnavailable,
  SqlClient | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom | SqlBatchCommit
> {
  const batch = yield* SqlBatchCommit
  const sql = (yield* SqlClient).withoutTransforms()
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
    Context.add(Digest.Digest, yield* Digest.Digest)
  )
  const external = yield* Effect.serviceOption(CurrentSqlCommit)

  const s = mapping.subject,
    i = mapping.identifier,
    c = mapping.credential

  const subject = tables(s.table),
    identifier = tables(i.table),
    credential = tables(c.table)

  const now = tables.expression(mapping.engineNowMillis)

  const activeSubject = tables.expression(s.activeCondition),
    activeIdentifier = tables.expression(i.activeCondition),
    activeCredential = tables.expression(c.activeCondition)

  const lock = sql.onDialectOrElse({ sqlite: () => sql``, orElse: () => sql`for update` })

  const exact = (t: SqlTable, key: string, value: unknown) => exactSqlText(sql, t.column(key), t.value(key, value))

  const id = (t: SqlTable, key: string, value: unknown) => sql`${t.column(key)} = ${t.value(key, value)}`

  const numberKey = (number: string) =>
    sql.and([exact(identifier, i.namespace, "phone"), exact(identifier, i.value, number)])

  const run = <A, E, R>(work: Effect.Effect<A, E, R>) =>
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
      decision: PhoneOtp.PhoneMutationDecision,
      project: (decision: PhoneOtp.PhoneMutationDecision, journal: CommitJournal) => PreparedCommit<A>
    ) {
      const result = project(decision, yield* CurrentCommitJournal)

      yield* registerSqlCommitReceipt(result)

      return result
    }
  )

  const capture = Effect.fnUntraced(function*(
    input: Parameters<PhoneOtp.PhonePersistence["Service"]["target"]>[0]
  ) {
    if (!(input.moduleId === mapping.moduleId)) return yield* invalidState()

    const numbers = input.sourcePhoneNumber === undefined || input.sourcePhoneNumber === input.phoneNumber
      ? [input.phoneNumber]
      : [input.phoneNumber, input.sourcePhoneNumber]

    const rows = yield* sql`select ${
      identifier.fields("phone_identifier_")
    }, case when ${activeIdentifier} then 1 else 0 end as identifier_active from ${identifier.name} where ${
      sql.or(numbers.map(numberKey))
    } limit 3`

    if (!(rows.length <= numbers.length)) return yield* invalidState()

    const identifiers = rows.map((row) => ({
      row: identifier.decode(row, "phone_identifier_"),
      active: Number(row.identifier_active) === 1
    }))

    if (
      !identifiers.every(
        ({ row }) => row[i.namespace] === "phone" && numbers.includes(String(row[i.value]))
      )
    ) {
      return yield* invalidState()
    }
    const destination = identifiers.find(({ row }) => row[i.value] === input.phoneNumber)
    const source = identifiers.find(({ row }) => row[i.value] === input.sourcePhoneNumber)

    const subjectId = input.subjectId ??
      (destination === undefined
        ? undefined
        : yield* resolve(mapping.subjectIds.toSubject(destination.row[i.subjectId])))

    let subjectRow: Record<string, unknown> | undefined
    let revision: AuthenticationRevision | null = null
    const factors: Array<{ readonly row: Record<string, unknown>; readonly active: boolean }> = []
    let instant: number

    if (subjectId === undefined) {
      const clock = yield* sql`select ${now} as engine_now`

      instant = Number(clock[0]?.engine_now)
    } else {
      const native = yield* resolve(mapping.subjectIds.toNative(subjectId))

      if (!((yield* resolve(mapping.subjectIds.toSubject(native))) === subjectId)) {
        return yield* invalidState()
      }

      const joined = yield* sql`select ${subject.fields("phone_subject_")}, ${
        credential.fields("phone_factor_")
      }, case when ${activeSubject} then 1 else 0 end as subject_active, case when ${activeCredential} then 1 else 0 end as credential_active, ${now} as engine_now from ${subject.name} left join ${credential.name} on ${
        id(credential, c.subjectId, native)
      } and (${activeCredential} ${
        identifiers.length === 0
          ? sql``
          : sql`or ${sql.or(identifiers.map((value) => exact(credential, c.id, value.row[i.credentialId])))}`
      }) where ${id(subject, s.id, native)} limit 67`

      if (!(joined.length <= 66)) return yield* invalidState()
      const first = joined[0]

      instant = Number(first?.engine_now)
      if (first !== undefined) {
        subjectRow = subject.decode(first, "phone_subject_")
        if (!((yield* resolve(mapping.subjectIds.toSubject(subjectRow[s.id]))) === subjectId)) {
          return yield* invalidState()
        }
        for (const joinedRow of joined) {
          const row = credential.decode(joinedRow, "phone_factor_")

          if (row[c.id] === null || row[c.id] === undefined) continue
          if (!((yield* resolve(mapping.subjectIds.toSubject(row[c.subjectId]))) === subjectId)) {
            return yield* invalidState()
          }
          if (factors.some((f) => f.row[c.id] === row[c.id])) return yield* invalidState()
          factors.push({ row, active: Number(joinedRow.credential_active) === 1 })
        }
        if (!(factors.filter((f) => f.active).length <= 64)) return yield* invalidState()
        if (Number(first.subject_active) === 1) {
          revision = yield* Schema.decodeUnknownEffect(AuthenticationRevision)({
            subjectId,
            securityRevision: subjectRow[s.securityRevision],
            credentials: factors
              .filter((f) => f.active)
              .map((f) => ({ credentialId: f.row[c.id], revision: f.row[c.revision] }))
              .sort((a, b) => String(a.credentialId).localeCompare(String(b.credentialId)))
          })
        }
      }
    }
    if (!Number.isSafeInteger(instant)) return yield* invalidState()

    const custody = Effect.fnUntraced(function*(value: typeof destination) {
      if (value === undefined || value.row[i.moduleId] !== mapping.moduleId) return null
      const factor = factors.find((f) => f.row[c.id] === value.row[i.credentialId])

      if (factor === undefined) return null
      const owner = yield* resolve(mapping.subjectIds.toSubject(value.row[i.subjectId]))

      if (owner !== subjectId) return null

      return yield* Schema.decodeUnknownEffect(PhoneOtp.PhoneCustody)({
        phoneNumber: value.row[i.value],
        subjectId: owner,
        credentialId: value.row[i.credentialId],
        custodyRevision: value.row[i.revision],
        credentialRevision: factor.row[c.revision],
        verifiedAtMillis: value.row[i.verifiedAt] === null || value.row[i.verifiedAt] === undefined
          ? null
          : mapping.proofs.clock.decodeInstant(value.row[i.verifiedAt]),
        state: !value.active || !factor.active
          ? "retired"
          : value.row[i.verifiedAt] === null || value.row[i.verifiedAt] === undefined
          ? "unverified"
          : "verified"
      })
    })

    const targetCustody = yield* custody(destination)
    const sourceCustody = yield* custody(source)

    const eligible = input.action === "register"
      ? destination === undefined
      : revision !== null &&
        input.subjectId === subjectId &&
        (destination === undefined ||
          (targetCustody !== null &&
            targetCustody.subjectId === subjectId &&
            targetCustody.state === "unverified")) &&
        (input.action !== "change" ||
          (input.sourcePhoneNumber !== input.phoneNumber &&
            sourceCustody !== null &&
            sourceCustody.subjectId === subjectId &&
            sourceCustody.state === "verified"))

    const target = yield* Schema.decodeEffect(PhoneOtp.PhoneLifecycleTarget)({
      phoneNumber: input.phoneNumber,
      custody: targetCustody,
      source: sourceCustody,
      revision,
      eligible
    })

    return { target, subjectRow, destination, source, factors, now: instant }
  })

  const phoneSignInTargets: PhoneOtp.PhoneSignInTargets["Service"] = {
    lookup: (input) =>
      executor.read(
        Effect.gen(function*() {
          const current = yield* capture({ ...input, action: "verify" })
          const { custody, revision } = current.target

          if (
            custody === null ||
            custody.state !== "verified" ||
            custody.verifiedAtMillis === null ||
            revision === null ||
            current.subjectRow === undefined ||
            !revision.credentials.some(
              (f) =>
                f.credentialId === custody.credentialId &&
                f.revision === custody.credentialRevision
            )
          ) {
            return Option.none()
          }

          return Option.some(
            yield* Schema.decodeEffect(PhoneOtp.PhoneCredentialSnapshot)({
              moduleId: input.moduleId,
              phoneNumber: input.phoneNumber,
              custodyRevision: custody.custodyRevision,
              verifiedAtMillis: custody.verifiedAtMillis,
              credentialId: custody.credentialId,
              credentialRevision: custody.credentialRevision,
              revision,
              requirement: yield* resolve(mapping.subject.decodeRequirement(current.subjectRow))
            })
          )
        })
      )
  }

  const phonePersistence: PhoneOtp.PhonePersistence["Service"] = {
    target: (input) => executor.read(Effect.map(capture({ ...input }), (value) => value.target)),
    mutate: (original, project) =>
      run(
        Effect.gen(function*() {
          const target = yield* Schema.decodeEffect(targetCodec)(
            yield* Schema.encodeEffect(targetCodec)(original.target)
          )

          const redemption = yield* Schema.decodeEffect(Schema.toCodecIso(ProofRedemptionInput))(
            yield* Schema.encodeEffect(Schema.toCodecIso(ProofRedemptionInput))(
              original.redemption.input
            )
          )

          const input = {
            ...original,
            target,
            redemption: { input: redemption, prepare: original.redemption.prepare }
          }

          const rejected = () => prepare({ _tag: "Rejected" }, project)

          if (!(input.moduleId === mapping.moduleId)) return yield* invalidState()
          if (
            input.action === "register" &&
            (mapping.subjectIds.allocate === undefined || s.encodeInsert === undefined)
          ) {
            return yield* rejected()
          }
          const policy = yield* Schema.decodeEffect(PhoneOtp.PhoneLifecyclePolicy)(input.policy)

          if (
            policy.maximumEvidenceAgeMillis !== mapping.policy.maximumEvidenceAgeMillis ||
            policy.requireImmediateInvalidation !== mapping.policy.requireImmediateInvalidation
          ) {
            return yield* rejected()
          }
          if (target.revision !== null) {
            const native = yield* resolve(mapping.subjectIds.toNative(target.revision.subjectId))

            const rows = yield* sql`select ${subject.fields("phone_locked_")} from ${subject.name} where ${
              id(subject, s.id, native)
            } limit 2 ${batch === undefined ? lock : sql``}`

            if (
              rows.length !== 1 ||
              (yield* resolve(
                  mapping.subjectIds.toSubject(subject.decode(rows[0]!, "phone_locked_")[s.id])
                )) !== target.revision.subjectId
            ) {
              return yield* rejected()
            }
          }

          const captured = yield* capture({
            moduleId: input.moduleId,
            action: input.action,
            phoneNumber: target.phoneNumber,
            ...(target.revision === null ? {} : { subjectId: target.revision.subjectId }),
            ...(target.source === null ? {} : { sourcePhoneNumber: target.source.phoneNumber })
          })

          if (
            !captured.target.eligible ||
            (yield* Schema.encodeEffect(targetCodec)(captured.target)) !==
              (yield* Schema.encodeEffect(targetCodec)(target))
          ) {
            return yield* rejected()
          }
          const binding = redemption.binding

          if (
            redemption.moduleId !== `${mapping.moduleId}/lifecycle` ||
            redemption.purpose !== "phone-lifecycle" ||
            binding.identifier.namespace !== "phone" ||
            binding.identifier.value !== target.phoneNumber
          ) {
            return yield* rejected()
          }
          if (
            input.action === "register"
              ? binding._tag !== "Identifier"
              : binding._tag === "Identifier" ||
                target.revision === null ||
                !sameRevision(binding.revision, target.revision)
          ) {
            return yield* rejected()
          }
          if (
            (input.action === "verify" && binding._tag !== "Subject") ||
            (input.action === "change" && binding._tag !== "IdentifierChange")
          ) {
            return yield* rejected()
          }
          const freshness: Array<Fragment> = []

          if (input.action !== "register") {
            const authorization = input.authorization

            if (
              authorization === undefined ||
              target.revision === null ||
              captured.subjectRow === undefined
            ) {
              return yield* rejected()
            }
            const evidence = yield* snapshotAuthenticationEvidence(authorization.evidence)
            const challenge = authorization.challenge

            if (
              challenge.moduleId !== mapping.moduleId ||
              challenge.action !== input.action ||
              challenge.commandId !== input.commandId ||
              challenge.phoneNumber !== target.phoneNumber ||
              challenge.sourcePhoneNumber !== target.source?.phoneNumber ||
              challenge.flowId !== binding.flowId ||
              challenge.bindingDigest !== binding.contextDigest ||
              challenge.flowId !== evidence.flowId ||
              challenge.bindingDigest !== evidence.bindingDigest ||
              !sameRevision(challenge.revision, target.revision) ||
              !sameRevision(evidence.revision, target.revision)
            ) {
              return yield* rejected()
            }

            const requirements = [
              authorization.requirement,
              authorization.actionRequirement,
              yield* resolve(s.decodeRequirement(captured.subjectRow)),
              ...(s.decodeActionRequirement === undefined
                ? []
                : [yield* resolve(s.decodeActionRequirement(captured.subjectRow, input.action))])
            ]

            for (const originalRequirement of requirements) {
              const requirement = yield* Schema.decodeEffect(AuthenticationRequirement)(originalRequirement)

              if (!(yield* passwordEvidenceSatisfiedAt(evidence, requirement, captured.now))) {
                return yield* rejected()
              }
            }
            if (evidence.proofs.length === 0) return yield* rejected()
            for (const proof of evidence.proofs) {
              const at = DateTime.toEpochMillis(proof.verifiedAt)

              const age = Math.min(
                policy.maximumEvidenceAgeMillis,
                ...requirements.map((r) => r.maximumAgeMillis)
              )

              if (
                !target.revision.credentials.some((f) => f.credentialId === proof.credentialId) ||
                at > captured.now ||
                captured.now >= at + age
              ) {
                return yield* rejected()
              }
              freshness.push(sql`${now} >= ${at} and ${now} < ${at + age}`)
            }
          }
          const store = yield* makeNativeProofStore(tables, mapping.proofs, batch !== undefined)
          const result = yield* store.redeemLocked(redemption)

          const proofReceipt = input.redemption.prepare(
            result.decision,
            yield* CurrentCommitJournal,
            (value) => value
          )

          yield* registerSqlCommitReceipt(proofReceipt)
          if (result.decision !== "redeemed") return yield* rejected()
          freshness.push(result.validUntil)

          const subjectId = input.action === "register"
            ? yield* resolve(
              mapping.subjectIds.toSubject(yield* resolve(mapping.subjectIds.allocate!()))
            )
            : target.revision!.subjectId

          const native = yield* resolve(mapping.subjectIds.toNative(subjectId))

          if (!((yield* resolve(mapping.subjectIds.toSubject(native))) === subjectId)) {
            return yield* invalidState()
          }

          const securityRevision = SecurityRevision.make(yield* randomId),
            credentialRevision = SecurityRevision.make(yield* randomId),
            custodyRevision = SecurityRevision.make(yield* randomId)

          const credentialId = target.custody?.credentialId ?? (yield* randomId)

          const factorCondition = (revision: AuthenticationRevision) =>
            sql.and([
              sql`(select count(*) from ${credential.name} where ${
                id(credential, c.subjectId, native)
              } and ${activeCredential}) = ${revision.credentials.length}`,
              ...revision.credentials.map(
                (f) =>
                  sql`exists(select 1 from ${credential.name} where ${id(credential, c.subjectId, native)} and ${
                    exact(credential, c.id, f.credentialId)
                  } and ${exact(credential, c.revision, f.revision)} and ${activeCredential})`
              )
            ])

          if (target.revision !== null && batch !== undefined) {
            yield* appendSqlBatchStatement(
              sqlBatchAssertion(
                sql,
                sql.and([
                  sql`exists(select 1 from ${subject.name} where ${id(subject, s.id, native)} and ${
                    exact(subject, s.securityRevision, target.revision.securityRevision)
                  } and ${activeSubject})`,
                  factorCondition(target.revision),
                  ...freshness
                ])
              )
            )
          }
          let subjectRow = captured.subjectRow

          if (input.action === "register") {
            const inserted = s.encodeInsert!({
              id: native,
              securityRevision,
              phoneNumber: target.phoneNumber
            })

            yield* stage(subject.insert(inserted))
            // Native provisioning decodes database defaults in the final guarded
            // read; fixed batches require complete encoder values.
            subjectRow = inserted
          }
          if (!(subjectRow !== undefined)) return yield* invalidState()
          const finalConditions: Array<Fragment> = [...freshness]

          if (target.source !== null) {
            const source = target.source

            const retiredCustody = SecurityRevision.make(yield* randomId),
              retiredCredential = SecurityRevision.make(yield* randomId)

            yield* stage(
              sql`${identifier.update({ [i.status]: i.encodeStatus(false), [i.revision]: retiredCustody })} where ${
                numberKey(source.phoneNumber)
              } and ${exact(identifier, i.moduleId, mapping.moduleId)} and ${
                exact(identifier, i.credentialId, source.credentialId)
              } and ${id(identifier, i.subjectId, native)} and ${
                exact(identifier, i.revision, source.custodyRevision)
              } and ${activeIdentifier}`
            )
            yield* stage(
              sql`${credential.update({ [c.status]: c.encodeStatus(false), [c.revision]: retiredCredential })} where ${
                id(credential, c.subjectId, native)
              } and ${exact(credential, c.id, source.credentialId)} and ${
                exact(credential, c.revision, source.credentialRevision)
              } and ${activeCredential}`
            )
            finalConditions.push(
              sql`exists(select 1 from ${identifier.name} where ${numberKey(source.phoneNumber)} and ${
                exact(identifier, i.moduleId, mapping.moduleId)
              } and ${exact(identifier, i.credentialId, source.credentialId)} and ${
                id(identifier, i.subjectId, native)
              } and ${exact(identifier, i.revision, retiredCustody)} and not (${activeIdentifier}))`,
              sql`exists(select 1 from ${credential.name} where ${id(credential, c.subjectId, native)} and ${
                exact(credential, c.id, source.credentialId)
              } and ${exact(credential, c.revision, retiredCredential)} and not (${activeCredential}))`
            )
          }

          const values = {
            [i.moduleId]: mapping.moduleId,
            [i.credentialId]: credentialId,
            [i.namespace]: "phone",
            [i.value]: target.phoneNumber,
            [i.subjectId]: native,
            [i.revision]: custodyRevision,
            [i.verifiedAt]: mapping.encodeInstant(captured.now),
            [i.status]: i.encodeStatus(true)
          }

          if (target.custody === null) {
            yield* stage(
              identifier.insert({
                ...i.encodeInsert({
                  moduleId: mapping.moduleId,
                  credentialId,
                  phoneNumber: target.phoneNumber,
                  subjectId: native,
                  revision: custodyRevision,
                  verifiedAtMillis: captured.now,
                  active: true
                }),
                ...values
              })
            )
            yield* stage(
              credential.insert(
                c.encodeInsert({
                  credentialId,
                  subjectId: native,
                  revision: credentialRevision,
                  active: true
                })
              )
            )
          } else {
            yield* stage(
              sql`${identifier.update(values)} where ${numberKey(target.phoneNumber)} and ${
                exact(identifier, i.moduleId, mapping.moduleId)
              } and ${exact(identifier, i.credentialId, credentialId)} and ${id(identifier, i.subjectId, native)} and ${
                exact(identifier, i.revision, target.custody.custodyRevision)
              } and ${identifier.column(i.verifiedAt)} is null and ${activeIdentifier}`
            )
            yield* stage(
              sql`${credential.update({ [c.revision]: credentialRevision, [c.status]: c.encodeStatus(true) })} where ${
                id(credential, c.subjectId, native)
              } and ${exact(credential, c.id, credentialId)} and ${
                exact(credential, c.revision, target.custody.credentialRevision)
              } and ${activeCredential}`
            )
          }

          const revision = yield* Schema.decodeEffect(AuthenticationRevision)({
            subjectId,
            securityRevision,
            credentials: [
              ...(target.revision?.credentials ?? []).filter(
                (f) => f.credentialId !== credentialId && f.credentialId !== target.source?.credentialId
              ),
              { credentialId, revision: credentialRevision }
            ].sort((a, b) => a.credentialId.localeCompare(b.credentialId))
          })

          finalConditions.push(
            factorCondition(revision),
            sql`exists(select 1 from ${identifier.name} where ${numberKey(target.phoneNumber)} and ${
              exact(identifier, i.moduleId, mapping.moduleId)
            } and ${exact(identifier, i.credentialId, credentialId)} and ${id(identifier, i.subjectId, native)} and ${
              exact(identifier, i.revision, custodyRevision)
            } and ${id(identifier, i.verifiedAt, mapping.encodeInstant(captured.now))} and ${activeIdentifier})`
          )
          const resultingState = sql.and(finalConditions)

          if (input.action !== "register") {
            if (!(target.revision !== null)) return yield* invalidState()
            yield* stage(
              sql`${subject.update({ [s.securityRevision]: securityRevision })} where ${
                id(subject, s.id, native)
              } and ${
                exact(subject, s.securityRevision, target.revision.securityRevision)
              } and ${activeSubject} and ${resultingState}`
            )
            subjectRow = { ...subjectRow, [s.securityRevision]: securityRevision }
          }
          finalConditions.push(
            sql`exists(select 1 from ${subject.name} where ${id(subject, s.id, native)} and ${
              exact(subject, s.securityRevision, securityRevision)
            } and ${activeSubject})`
          )
          if (input.action === "register" && batch === undefined) {
            const rows = yield* sql`select ${subject.fields("provisioned_")} from ${subject.name} where ${
              id(subject, s.id, native)
            } and ${
              exact(subject, s.securityRevision, securityRevision)
            } and ${activeSubject} and ${resultingState} limit 2`

            if (!(rows.length === 1)) return yield* invalidState()
            subjectRow = subject.decode(rows[0]!, "provisioned_")
          }
          const final = sql.and(finalConditions)

          if (batch !== undefined) {
            yield* registerSqlBatchPostcondition({
              name: "phone-custody-authority",
              statement: sqlBatchAssertion(sql, final)
            })
          } else if (Option.isSome(external)) {
            yield* registerSqlPostcondition({
              name: "phone-custody-authority",
              check: Effect.gen(function*() {
                const rows = yield* sql`select 1 as valid where ${final}`

                if (!(rows.length === 1)) return yield* invalidState()
              }).pipe(
                Effect.catchCause((cause) =>
                  Effect.failCause(
                    Cause.map(cause, (error) => PersistenceMappingError.make({ operation: "decode", cause: error }))
                  )
                )
              )
            })
          }

          return yield* prepare(
            {
              _tag: "Accepted",
              credential: {
                moduleId: mapping.moduleId,
                phoneNumber: target.phoneNumber,
                custodyRevision,
                verifiedAtMillis: captured.now,
                credentialId,
                credentialRevision,
                revision,
                requirement: yield* resolve(mapping.subject.decodeRequirement(subjectRow))
              }
            },
            project
          )
        })
      )
  }

  return { phonePersistence, phoneSignInTargets }
})
