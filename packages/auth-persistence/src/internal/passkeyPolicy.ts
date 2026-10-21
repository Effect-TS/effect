import { AuthenticationClock } from "@effect/auth/Operations"
import {
  type PasskeyAccess,
  type PasskeyActionAuthorization,
  type PasskeyCeremony,
  PasskeyCredential,
  type PasskeyManagementPolicy,
  type PasskeyRequirement,
  type PasskeyRevision,
  PasskeyUnavailable,
  snapshotPasskeySync
} from "@effect/auth/Passkey"
import * as Digest from "effect/crypto/Digest"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"

const invalidState = () => PasskeyUnavailable.make({})

const encoder = new TextEncoder()

const decoder = new TextDecoder("utf-8", { fatal: true })

/**
 * RP tuples have no collation-dependent string identity.
 *
 * @internal
 */
export const passkeyKey = Effect.fnUntraced(function*(
  kind: string,
  fields: ReadonlyArray<string>
) {
  const values: Array<Uint8Array> = []

  for (const field of ["effect-auth/passkey/" + kind + "/v1", ...fields]) {
    const bytes = encoder.encode(field)

    if (!(decoder.decode(bytes) === field)) return yield* invalidState()

    values.push(bytes)
  }

  const packed = new Uint8Array(values.reduce((size, bytes) => size + 4 + bytes.length, 0))
  const view = new DataView(packed.buffer)
  let offset = 0

  for (const bytes of values) {
    view.setUint32(offset, bytes.length, false)
    packed.set(bytes, offset + 4)
    offset += 4 + bytes.length
  }

  const digest = yield* Digest.Digest
  const hashed = yield* digest.digest(Digest.sha256, packed)

  return "v1:" + Array.from(hashed, (value) => value.toString(16).padStart(2, "0")).join("")
})

/** @internal */
export const passkeyCredentialKey = (rpId: string, id: string) => passkeyKey("credential", [rpId, id])

/**
 * Private passkeyStorage is decoded Type data, never a consumer wire transform.
 *
 * @internal
 */
export const passkeyStorage = <S extends Schema.Codec<unknown, unknown, never, never>>(
  schema: S,
  maximumBytes: number
) => {
  const codec = Schema.fromJsonString(Schema.toCodecJson(Schema.toType(schema)))

  const encode = Effect.fnUntraced(function*(value: S["Type"]) {
    const text = "v1:" + (yield* Schema.encodeEffect(codec)(snapshotPasskeySync(schema, value)))

    if (!(encoder.encode(text).length <= maximumBytes)) return yield* invalidState()

    return text
  })

  return {
    encode,
    decode: Effect.fnUntraced(function*(
      text: unknown
    ): Effect.fn.Return<S["Type"], PasskeyUnavailable | Schema.SchemaError> {
      if (!(Predicate.isString(text) && text.startsWith("v1:"))) return yield* invalidState()
      if (!(encoder.encode(text).length <= maximumBytes)) return yield* invalidState()
      const value = snapshotPasskeySync(schema, yield* Schema.decodeEffect(codec)(text.slice(3)))

      if (!((yield* encode(value)) === text)) return yield* invalidState()

      return value
    })
  }
}

// Legal 32 x 16 x 2048 origins require more than one MiB before JSON escaping.
/** @internal */
export const passkeyCredentialStorage = passkeyStorage(PasskeyCredential, 512 * 1024)

/** @internal */
export const samePasskeyCredential = Effect.fnUntraced(function*(
  left: PasskeyCredential,
  right: PasskeyCredential
) {
  const semantic = (value: PasskeyCredential) => ({
    ...value,
    counter: 0,
    backupState: false,
    revision: { ...value.revision, credentials: [] }
  })

  return (
    (yield* passkeyCredentialStorage.encode(semantic(left))) ===
      (yield* passkeyCredentialStorage.encode(semantic(right)))
  )
})

/** @internal */
export const samePasskeyRevision = (
  left: typeof PasskeyRevision.Type,
  right: typeof PasskeyRevision.Type
) => {
  const pairs = new Map(left.credentials.map((item) => [item.credentialId, item.revision]))

  return (
    left.subjectId === right.subjectId &&
    left.securityRevision === right.securityRevision &&
    pairs.size === left.credentials.length &&
    new Set(right.credentials.map((item) => item.credentialId)).size === right.credentials.length &&
    pairs.size === right.credentials.length &&
    right.credentials.every((item) => pairs.get(item.credentialId) === item.revision)
  )
}

/** @internal */
export const passkeyAssertionPurposes = ["sign-in", "pending", "step-up", "action"] as const

const contextPurpose = {
  SignIn: "sign-in",
  Pending: "pending",
  StepUp: "step-up",
  Action: "action",
  Enrollment: "enrollment",
  Registration: "registration"
} as const

/** @internal */
export const validPasskeyCeremony = (ceremony: PasskeyCeremony) =>
  ceremony.expiresAtMillis > ceremony.issuedAtMillis &&
  ceremony.expiresAtMillis <= ceremony.requestBindingExpiresAtMillis &&
  contextPurpose[ceremony.context._tag] === ceremony.purpose &&
  new Set(ceremony.allowedCredentials.map((item) => item.id)).size ===
    ceremony.allowedCredentials.length

/** @internal */
export const passkeyMatchesAccess = (ceremony: PasskeyCeremony, access: PasskeyAccess) =>
  ceremony.moduleId === access.moduleId &&
  ceremony.purpose === access.purpose &&
  ceremony.flowId === access.flowId &&
  ceremony.requestBindingVerifier === access.requestBindingVerifier &&
  ceremony.requestBindingExpiresAtMillis === access.requestBindingExpiresAtMillis

/** @internal */
export interface PasskeyActionFacts {
  readonly moduleId: string
  readonly revision: typeof PasskeyRevision.Type
  readonly nowMillis: number
  readonly currentRequirement: typeof PasskeyRequirement.Type
  readonly expected: {
    readonly action: PasskeyActionAuthorization["challenge"]["action"]
    readonly commandId: string
    readonly flowId: string
    readonly bindingDigest: string
    readonly revision: typeof PasskeyRevision.Type
  }
  readonly originalRequirement?: typeof PasskeyRequirement.Type
}

/**
 * Reject stale bindings before evaluating application requirements.
 *
 * @internal
 */
export const validPasskeyActionEvidence = Effect.fnUntraced(function*(
  facts: Pick<PasskeyActionFacts, "moduleId" | "revision" | "expected" | "nowMillis">,
  authorization: PasskeyActionAuthorization
): Effect.fn.Return<boolean> {
  const { futureToleranceMillis } = yield* AuthenticationClock
  const { challenge, evidence } = authorization
  const { expected, revision, nowMillis: now } = facts

  if (
    challenge.moduleId !== facts.moduleId ||
    challenge.action !== expected.action ||
    challenge.commandId !== expected.commandId ||
    challenge.flowId !== expected.flowId ||
    challenge.bindingDigest !== expected.bindingDigest ||
    evidence.flowId !== expected.flowId ||
    evidence.bindingDigest !== expected.bindingDigest ||
    !samePasskeyRevision(challenge.revision, expected.revision) ||
    revision.subjectId !== expected.revision.subjectId ||
    revision.securityRevision !== expected.revision.securityRevision ||
    evidence.revision.subjectId !== revision.subjectId ||
    evidence.revision.securityRevision !== revision.securityRevision
  ) {
    return false
  }
  for (const requested of [expected.revision, evidence.revision]) {
    if (
      requested.credentials.some(
        (item) =>
          !revision.credentials.some(
            (current) => current.credentialId === item.credentialId && current.revision === item.revision
          )
      )
    ) {
      return false
    }
  }
  if (
    evidence.proofs.some(
      (proof) =>
        DateTime.toEpochMillis(proof.verifiedAt) - now > futureToleranceMillis ||
        !evidence.revision.credentials.some((item) => item.credentialId === proof.credentialId)
    )
  ) {
    return false
  }

  return true
})

/**
 * SQL policy predicates remain native. This authorizes the exact evidence and
 * returns the deadline every backend must retain through its final commit.
 *
 * @internal
 */
export const assessPasskeyAction = Effect.fnUntraced(function*(
  facts: PasskeyActionFacts,
  authorization: PasskeyActionAuthorization,
  policy: PasskeyManagementPolicy
): Effect.fn.Return<
  { readonly notBeforeMillis: number; readonly expiresBeforeMillis: number } | undefined
> {
  if (!(yield* validPasskeyActionEvidence(facts, authorization))) return undefined
  const { evidence } = authorization
  const now = facts.nowMillis
  let expiresBefore = Infinity

  for (
    const requirement of [
      authorization.requirement,
      facts.currentRequirement,
      ...(facts.originalRequirement === undefined ? [] : [facts.originalRequirement])
    ]
  ) {
    const age = Math.min(policy.maximumEvidenceAgeMillis, requirement.maximumAgeMillis)

    const fresh = evidence.proofs.filter(
      (proof) => Math.max(0, now - DateTime.toEpochMillis(proof.verifiedAt)) < age
    )

    const factors = new Set(fresh.flatMap((proof) => proof.factors))

    if (
      !requirement.alternatives.some(
        (alternative) =>
          alternative.factors.every((factor) => factors.has(factor)) &&
          new Set(fresh.map((proof) => proof.credentialId)).size >=
            alternative.minimumCredentials &&
          fresh.some(
            (proof) =>
              (!alternative.userVerified || proof.userVerified) &&
              (!alternative.phishingResistant || proof.phishingResistant)
          )
      )
    ) {
      return undefined
    }
    for (const proof of fresh) {
      expiresBefore = Math.min(expiresBefore, DateTime.toEpochMillis(proof.verifiedAt) + age)
    }
  }

  return { notBeforeMillis: now, expiresBeforeMillis: expiresBefore }
})
