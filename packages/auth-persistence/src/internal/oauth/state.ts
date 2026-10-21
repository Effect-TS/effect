import {
  type OAuthAccountRevision,
  OAuthExternalIdentity,
  OAuthUnavailable,
  snapshotOAuth,
  snapshotOAuthSync
} from "@effect/auth/OAuth"
import type { AuthenticationRequirement } from "@effect/auth/Sessions"
import * as Digest from "effect/crypto/Digest"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"

import { randomId } from "../crypto.ts"
/** @internal */
export { digest } from "../crypto.ts"

const encoder = new TextEncoder()
const decoder = new TextDecoder("utf-8", { fatal: true })

/** @internal */
export const unavailable = () => OAuthUnavailable.make({})

/** @internal */
export const invalidState = () => unavailable()

/** @internal */
export const nonce = randomId

/** Capture configuration/callback references while preserving adapter table, SQL
 * and Effect objects. Never freeze or mutate the consumer's original graph. */
export const captureOAuthMapping = <A>(input: A): A => {
  const seen = new Map<object, unknown>()

  const copy = (value: unknown): unknown => {
    if (!Predicate.isObjectOrArray(value) || Effect.isEffect(value)) return value
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) return value
    const prior = seen.get(value)

    if (prior !== undefined) return prior
    if (Array.isArray(value)) {
      const result: Array<unknown> = []

      seen.set(value, result)
      result.push(...value.map(copy))

      return Object.freeze(result)
    }
    const result: Record<string, unknown> = {}

    seen.set(value, result)
    for (const [key, child] of Object.entries(value)) result[key] = copy(child)

    return Object.freeze(result)
  }

  return copy(input) as A
}

/** Stable persisted identity key for an exact provider/issuer/subject tuple.
 * Requires Digest for SHA-256. The module is deliberately excluded: ownership is
 * shared across modules. Reject ill-formed UTF-16 rather than alias identities. */
export const oauthIdentityKey = Effect.fnUntraced(function*(
  input: typeof OAuthExternalIdentity.Type
) {
  const identity = yield* snapshotOAuth(OAuthExternalIdentity, input)

  const fields = [
    "effect-auth/oauth-identity-key/v1",
    identity.provider,
    identity.issuer,
    identity.subject
  ]

  const bytes: Array<Uint8Array> = []

  for (const field of fields) {
    const value = encoder.encode(field)

    if (decoder.decode(value) !== field) return yield* unavailable()

    bytes.push(value)
  }

  const packed = new Uint8Array(bytes.reduce((size, value) => size + 4 + value.length, 0))
  const view = new DataView(packed.buffer)
  let offset = 0

  for (const value of bytes) {
    view.setUint32(offset, value.length, false)
    packed.set(value, offset + 4)
    offset += 4 + value.length
  }

  const digest = yield* Digest.Digest

  return "v1:" + Base64Url.encode(yield* digest.digest(Digest.sha256, packed))
})

/** @internal */
export const sameIdentity = (
  left: typeof OAuthExternalIdentity.Type,
  right: typeof OAuthExternalIdentity.Type
) =>
  left.provider === right.provider &&
  left.issuer === right.issuer &&
  left.subject === right.subject

/**
 * Private Type storage: opaque wrappers and DateTimes are freshly reconstructed.
 *
 * @internal
 */
export const storage = <S extends Schema.Codec<unknown, unknown, never, never>>(schema: S) => {
  const codec = Schema.fromJsonString(Schema.toCodecJson(Schema.toType(schema)))
  const encode = Schema.encodeSync(codec)
  const decode = Schema.decodeSync(codec)

  return {
    encode: (value: S["Type"]) => encode(snapshotOAuthSync(schema, value)),
    decode: (value: string) => snapshotOAuthSync(schema, decode(value))
  }
}

/** @internal */
export const sameRevision = (left: OAuthAccountRevision, right: OAuthAccountRevision) => {
  if (
    left.subjectId !== right.subjectId ||
    left.securityRevision !== right.securityRevision ||
    left.credentials.length !== right.credentials.length
  ) {
    return false
  }
  const revisions = new Map(left.credentials.map((item) => [item.credentialId, item.revision]))

  return (
    revisions.size === left.credentials.length &&
    new Set(right.credentials.map((item) => item.credentialId)).size === right.credentials.length &&
    right.credentials.every((item) => revisions.get(item.credentialId) === item.revision)
  )
}

/** @internal */
export const satisfies = (
  proofs: ReadonlyArray<{
    readonly credentialId: string
    readonly factors: ReadonlyArray<string>
    readonly userVerified: boolean
    readonly phishingResistant: boolean
  }>,
  requirement: AuthenticationRequirement
) => {
  const factors = new Set(proofs.flatMap((proof) => [...proof.factors]))
  const count = new Set(proofs.map((proof) => proof.credentialId)).size

  return requirement.alternatives.some(
    (alternative) =>
      alternative.factors.every((factor) => factors.has(factor)) &&
      count >= alternative.minimumCredentials &&
      proofs.some(
        (proof) =>
          (!alternative.userVerified || proof.userVerified) &&
          (!alternative.phishingResistant || proof.phishingResistant)
      )
  )
}
