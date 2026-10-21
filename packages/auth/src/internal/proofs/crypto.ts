import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as Mac from "effect/crypto/Mac"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import { TokenDigest } from "../../Schema.ts"
import { native } from "../crypto.ts"
import { makeSigningKey } from "../shared/signingKey.ts"
import { ProofConfigurationError, ProofUnavailable } from "./errors.ts"
import { ProofBinding, type ProofDigest, type ProofId, type ProofPurpose } from "./models.ts"

export const ProofSecretPolicy = Schema.Union([
  Schema.TaggedStruct("Token", {}),
  Schema.TaggedStruct("NumericCode", {
    digits: Schema.Int.check(Schema.isBetween({ minimum: 6, maximum: 10 }))
  })
])

export type ProofSecretPolicy = typeof ProofSecretPolicy.Type

export interface ProofKeyring {
  readonly activeKeyId: string
  readonly keys: ReadonlyArray<{
    readonly id: string
    readonly material: Redacted.Redacted<string>
  }>
}

const KeyId = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{1,64}$/))

const Keyring = Schema.Struct({
  activeKeyId: KeyId,
  keys: Schema.Array(Schema.Struct({ id: KeyId, material: Schema.Redacted(Schema.String) })).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(8)
  )
})

/** Shared numeric-code verification keys. Keep old IDs until their proofs expire. */
export class ProofKeys extends Context.Service<ProofKeys, ProofKeyring>()("@effect/auth/ProofKeys") {
  static readonly layer = (keyring: ProofKeyring) =>
    Layer.effect(
      ProofKeys,
      Schema.decodeEffect(Keyring)(keyring).pipe(
        Effect.mapError(() => ProofConfigurationError.make({ reason: "keyring" }))
      )
    )
}

type KeyRequirement<Secret extends ProofSecretPolicy> = Extract<Secret, { readonly _tag: "NumericCode" }> extends never
  ? never
  : ProofKeys

/**
 * The policy discriminant determines the service requirement; token proofs need no keyring.
 *
 * @internal
 */
export const proofKeysFor = <Secret extends ProofSecretPolicy>(secret: Secret) =>
  // The policy discriminant excludes ProofKeys exactly for Token, matching KeyRequirement<Secret>.
  (secret._tag === "Token" ? Effect.succeed(undefined) : ProofKeys) as Effect.Effect<
    ProofKeyring | undefined,
    never,
    KeyRequirement<Secret>
  >

const OpaqueSecret = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/))
const encoder = new TextEncoder()

/** Versioned fixed tuples: no dynamic object key ordering or delimiter ambiguity. */
const BindingTuple = Schema.Tuple([
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.Array(Schema.Tuple([Schema.String, Schema.String])),
  Schema.String,
  Schema.String
])

const DigestInput = Schema.fromJsonString(
  Schema.Tuple([
    Schema.Literal("effect-auth/proof/v1"),
    Schema.String,
    Schema.String,
    Schema.String,
    BindingTuple,
    Schema.String,
    Schema.String
  ])
)

const bindingTuple = (binding: ProofBinding): typeof BindingTuple.Type => {
  const revision = binding._tag === "Identifier" ? undefined : binding.revision

  return [
    binding._tag,
    binding.identifier.namespace,
    binding.identifier.value,
    revision?.subjectId ?? "",
    revision?.securityRevision ?? "",
    [...(revision?.credentials ?? [])]
      .map((item) => [item.credentialId, item.revision] as const)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    binding.flowId,
    binding.contextDigest
  ]
}

export const validateProofBinding = Effect.fnUntraced(function*(
  input: ProofBinding
) {
  const binding = yield* Schema.decodeEffect(ProofBinding)(input).pipe(
    Effect.mapError(() => ProofUnavailable.make({}))
  )

  if (binding._tag !== "Identifier") {
    const ids = new Set<string>()

    for (const credential of binding.revision.credentials) {
      if (ids.has(credential.credentialId)) return yield* ProofUnavailable.make({})
      ids.add(credential.credentialId)
    }
  }
  const identifier = Object.freeze(binding.identifier)

  return binding._tag === "Identifier"
    ? Object.freeze({ ...binding, identifier })
    : Object.freeze({
      ...binding,
      identifier,
      revision: Object.freeze({
        ...binding.revision,
        credentials: Object.freeze(
          [...binding.revision.credentials]
            .sort((a, b) => a.credentialId < b.credentialId ? -1 : a.credentialId > b.credentialId ? 1 : 0)
            .map((value) => Object.freeze({ ...value }))
        )
      })
    })
})

const makeCrypto = Effect.fnUntraced(function*(
  moduleId: string,
  purpose: ProofPurpose,
  input: ProofSecretPolicy,
  configuredKeys?: ProofKeyring
) {
  const policy = yield* Schema.decodeEffect(ProofSecretPolicy)(input).pipe(
    Effect.mapError(() => ProofConfigurationError.make({ reason: "policy" }))
  )

  const random = yield* SecureRandom.SecureRandom
  const digestService = yield* Digest.Digest
  let mac: Mac.Mac["Service"] | undefined
  const keys = new Map<string, Effect.Success<ReturnType<typeof makeSigningKey>>>()
  let activeKeyId = "token"

  if (policy._tag === "NumericCode") {
    if (configuredKeys === undefined) {
      return yield* ProofConfigurationError.make({ reason: "keyring" })
    }

    const keyring = yield* Schema.decodeEffect(Keyring)(configuredKeys).pipe(
      Effect.mapError(() => ProofConfigurationError.make({ reason: "keyring" }))
    )

    mac = yield* Mac.Mac

    for (const entry of keyring.keys) {
      const material = Result.getOrUndefined(Base64Url.decode(Redacted.value(entry.material)))

      if (
        entry.id === "token" ||
        keys.has(entry.id) ||
        material === undefined ||
        material.length < 32
      ) {
        return yield* ProofConfigurationError.make({ reason: "keyring" })
      }

      const key = yield* makeSigningKey(native(Effect.suspend(() => Mac.key(Mac.hmacSha256, material))))
        .pipe(
          Effect.catchCause((cause) =>
            Effect.failCause(
              Cause.map(cause, () => ProofConfigurationError.make({ reason: "keyring" }))
            )
          ),
          Effect.ensuring(Effect.sync(() => material.fill(0)))
        )

      keys.set(entry.id, key)
    }
    activeKeyId = keyring.activeKeyId
    if (!keys.has(activeKeyId)) return yield* ProofConfigurationError.make({ reason: "keyring" })
  }

  const generateOpaque = Effect.fnUntraced(function*() {
    return Redacted.make(
      Base64Url.encode(
        yield* random
          .randomBytes(32)
          .pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => ProofUnavailable.make({}))))
          )
      )
    )
  })

  const generate = Effect.fnUntraced(function*() {
    if (policy._tag === "Token") return yield* generateOpaque()
    let code = ""

    // Rejection sampling preserves leading zeroes and avoids modulo bias.
    for (let batch = 0; batch < 8 && code.length < policy.digits; batch++) {
      for (
        const byte of yield* random
          .randomBytes(policy.digits * 2)
          .pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => ProofUnavailable.make({}))))
          )
      ) {
        if (byte < 250 && code.length < policy.digits) code += String(byte % 10)
      }
    }
    if (code.length !== policy.digits) return yield* ProofUnavailable.make({})

    return Redacted.make(code)
  })

  const digest = Effect.fnUntraced(function*(
    proofId: ProofId,
    binding: ProofBinding,
    secret: Redacted.Redacted<string>,
    keyId: string
  ): Effect.fn.Return<ProofDigest | undefined, ProofUnavailable> {
    binding = yield* validateProofBinding(binding)
    const value = Redacted.value(secret)
    const key = keys.get(keyId)

    const secretSchema = policy._tag === "Token"
      ? OpaqueSecret
      : Schema.String.check(Schema.isPattern(new RegExp(`^[0-9]{${policy.digits}}$`)))

    if (
      !Schema.is(secretSchema)(value) ||
      (policy._tag === "Token" ? keyId !== "token" : key === undefined)
    ) {
      return undefined
    }

    const message = yield* Schema.encodeEffect(DigestInput)([
      "effect-auth/proof/v1",
      moduleId,
      purpose,
      proofId,
      bindingTuple(binding),
      keyId,
      value
    ]).pipe(Effect.mapError(() => ProofUnavailable.make({})))

    if (encoder.encode(message).byteLength > 16384) return yield* ProofUnavailable.make({})

    const bytes = key === undefined
      ? yield* native(Effect.suspend(() => digestService.digest(Digest.sha256, encoder.encode(message))))
        .pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => ProofUnavailable.make({}))))
        )
      : yield* key((owned) => native(Effect.suspend(() => mac!.sign(owned, encoder.encode(message)))))
        .pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => ProofUnavailable.make({}))))
        )

    return { keyId, digest: TokenDigest.make(Base64Url.encode(bytes)) }
  })

  return Object.freeze({
    activeKeyId,
    format: policy._tag === "Token" ? ("token" as const) : ("numeric-code" as const),
    generate,
    generateOpaque,
    digest
  })
})

/** Token proofs need only entropy and SHA digests; numeric proofs additionally require Mac and an owning Scope. */
export function makeProofCrypto(
  moduleId: string,
  purpose: ProofPurpose,
  input: Extract<ProofSecretPolicy, { readonly _tag: "Token" }>,
  configuredKeys?: ProofKeyring
): Effect.Effect<
  Effect.Success<ReturnType<typeof makeCrypto>>,
  ProofConfigurationError,
  SecureRandom.SecureRandom | Digest.Digest
>

export function makeProofCrypto(
  moduleId: string,
  purpose: ProofPurpose,
  input: ProofSecretPolicy,
  configuredKeys?: ProofKeyring
): ReturnType<typeof makeCrypto>

export function makeProofCrypto(
  ...args: Parameters<typeof makeCrypto>
): ReturnType<typeof makeCrypto> {
  return makeCrypto(...args)
}
