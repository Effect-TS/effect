import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import { TokenDigest } from "../../Schema.ts"
import { makeSessionSigningCodec, type SessionSigningKeyring } from "../sessions/crypto.ts"
import type { AuthOperationResult } from "./credentials.ts"
import { RequestBindingConfig } from "./requestBindingConfig.ts"
import { RequestBindingFlowId, type RequestBindingPublic } from "./requestBindingModels.ts"

export { RequestBindingCredential, RequestBindingFlowId, RequestBindingPublic } from "./requestBindingModels.ts"

export class RequestBindingInvalid extends Schema.TaggedError<RequestBindingInvalid>()(
  "RequestBindingInvalid",
  {}
) {}

export class RequestBindingUnavailable extends Schema.TaggedError<RequestBindingUnavailable>()(
  "RequestBindingUnavailable",
  {}
) {}

export class RequestBindingConfigurationError extends Schema.TaggedError<RequestBindingConfigurationError>()(
  "RequestBindingConfigurationError",
  {}
) {}

export interface VerifiedRequestBinding {
  /** Internal correlation only; never an accepted substitute for the credential. */
  readonly verifier: TokenDigest
  readonly expiresAtMillis: number
}

export interface RequestBindingConfiguration {
  readonly lifetimeMillis: number
  readonly generation: number
  /** Dedicated binding keys; no implicit reuse of session signing keys. */
  readonly keyring: SessionSigningKeyring
}

const configurationSchema = Schema.Struct({
  lifetimeMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 1_800_000 })),
  generation: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER })),
  keyring: Schema.Struct({
    activeKeyId: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{1,64}$/)),
    keys: Schema.Array(
      Schema.Struct({
        id: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{1,64}$/)),
        material: Schema.Redacted(Schema.String.check(Schema.isMaxLength(172)))
      })
    ).check(Schema.isMinLength(1), Schema.isMaxLength(8))
  })
})

const label = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9._:/-]{1,128}$/))

const envelope = Schema.Struct({
  namespace: Schema.Literal("effect-auth/request-binding/v1"),
  moduleId: label,
  purpose: label,
  flowId: RequestBindingFlowId,
  generation: Schema.Int,
  nonce: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/)),
  issuedAtMillis: Schema.Int,
  expiresAtMillis: Schema.Int
})

const verifierMessage = Schema.fromJsonString(
  Schema.Tuple([
    Schema.Literal("effect-auth/request-binding-verifier/v1"),
    label,
    label,
    Schema.String
  ])
)

export interface BindingModule<Id extends string, Purpose extends string> {
  readonly moduleId: Id
  readonly purpose: Purpose
}

const makeBindingCodec = Effect.fnUntraced(function*(
  configuration: RequestBindingConfiguration
) {
  const policy = yield* Schema.decodeEffect(configurationSchema)(configuration).pipe(
    Effect.mapError(() => RequestBindingConfigurationError.make({}))
  )

  const signer = yield* makeSessionSigningCodec(envelope, policy.keyring, 2048).pipe(
    Effect.mapError(() => RequestBindingConfigurationError.make({}))
  )

  const read = Effect.fnUntraced(function*(credential: Redacted.Redacted<string>) {
    const value = yield* signer
      .decode(credential)
      .pipe(
        Effect.mapError((error) =>
          error._tag === "SessionUnavailable"
            ? RequestBindingUnavailable.make({})
            : RequestBindingInvalid.make({})
        )
      )

    const now = DateTime.toEpochMillis(yield* DateTime.now)

    if (
      value.generation !== policy.generation ||
      value.issuedAtMillis > now ||
      value.expiresAtMillis <= now ||
      value.expiresAtMillis <= value.issuedAtMillis ||
      value.expiresAtMillis - value.issuedAtMillis > policy.lifetimeMillis
    ) {
      return yield* RequestBindingInvalid.make({})
    }

    return value
  })

  return { policy, signer, read }
})

/**
 * Recover correlation from a verified private credential. This is not flow
 * authorization: the operation still verifies module, purpose, state and binding
 * against the durable flow before any exchange. No new browser storage is needed.
 *
 * @internal
 */
export const makeRequestBindingFlowResolver = Effect.fn("RequestBinding.makeFlowResolver")(
  function*(purpose: string) {
    const { read } = yield* makeBindingCodec(yield* RequestBindingConfig)

    return Effect.fn("RequestBinding.resolveFlow")(function*(
      credential: Redacted.Redacted<string>
    ) {
      const value = yield* read(credential)

      if (value.purpose !== purpose) return yield* RequestBindingInvalid.make({})

      return value.flowId
    })
  }
)

/** The scalar private slot supports one standard browser flow at a time. Native
 * consumers may explicitly retain credentials by flow in their own secure store.
 * Browser adapters inject this credential from private storage and reject URL/body
 * overrides. Every binding-bearing mutation, including issuance, requires CSRF
 * protection. Explicit OAuth callbacks admit completion through state and binding
 * verification; ordinary GET/preview routes cannot mutate an authentication flow.
 */
export const makeRequestBinding = <const Id extends string, const Purpose extends string>(
  moduleId: Id,
  purpose: Purpose
) => {
  const RequestBinding = Context.Service<
    BindingModule<Id, Purpose>,
    {
      readonly issue: (
        flowId: RequestBindingFlowId
      ) => Effect.Effect<
        AuthOperationResult<RequestBindingPublic>,
        RequestBindingUnavailable | RequestBindingInvalid
      >
      readonly verify: (
        flowId: RequestBindingFlowId,
        credential: Redacted.Redacted<string>
      ) => Effect.Effect<VerifiedRequestBinding, RequestBindingInvalid | RequestBindingUnavailable>
    }
  >(
    `@effect/auth/operations/RequestBinding/${moduleId.length}:${moduleId}/${purpose.length}:${purpose}`
  )

  const signedLayer = (configuration: RequestBindingConfiguration) => {
    if (!Schema.is(configurationSchema)(configuration)) {
      return Layer.effect(RequestBinding, Effect.fail(RequestBindingConfigurationError.make({})))
    }

    const input = Object.freeze({
      lifetimeMillis: configuration.lifetimeMillis,
      generation: configuration.generation,
      keyring: Object.freeze({
        activeKeyId: configuration.keyring.activeKeyId,
        keys: Object.freeze(
          configuration.keyring.keys.map((entry) => Object.freeze({ id: entry.id, material: entry.material }))
        )
      })
    })

    return Layer.effect(
      RequestBinding,
      Effect.gen(function*() {
        yield* Schema.decodeEffect(label)(moduleId).pipe(
          Effect.mapError(() => RequestBindingConfigurationError.make({}))
        )
        yield* Schema.decodeEffect(label)(purpose).pipe(
          Effect.mapError(() => RequestBindingConfigurationError.make({}))
        )

        const { policy, signer, read } = yield* makeBindingCodec(input)

        const random = yield* SecureRandom.SecureRandom
        const digestService = yield* Digest.Digest

        return RequestBinding.of({
          issue: Effect.fn("RequestBinding.issue")(function*(flowId) {
            yield* Schema.decodeEffect(RequestBindingFlowId)(flowId).pipe(
              Effect.mapError(() => RequestBindingInvalid.make({}))
            )
            const now = DateTime.toEpochMillis(yield* DateTime.now)

            const nonce = yield* random
              .randomBytes(32)
              .pipe(Effect.catchDefect(() => Effect.fail(RequestBindingUnavailable.make({}))))

            const expiresAtMillis = now + policy.lifetimeMillis

            const credential = yield* signer
              .encode({
                namespace: "effect-auth/request-binding/v1",
                moduleId,
                purpose,
                flowId,
                generation: policy.generation,
                nonce: Base64Url.encode(nonce),
                issuedAtMillis: now,
                expiresAtMillis
              })
              .pipe(Effect.mapError(() => RequestBindingUnavailable.make({})))

            return {
              value: { flowId, expiresAtMillis },
              credentialCommands: [
                { _tag: "Issue", slot: "request-binding", credential, expiresAtMillis }
              ]
            }
          }),
          verify: Effect.fn("RequestBinding.verify")(function*(flowId, credential) {
            yield* Schema.decodeEffect(RequestBindingFlowId)(flowId).pipe(
              Effect.mapError(() => RequestBindingInvalid.make({}))
            )

            const value = yield* read(credential)

            if (value.moduleId !== moduleId || value.purpose !== purpose || value.flowId !== flowId) {
              return yield* RequestBindingInvalid.make({})
            }

            const message = yield* Schema.encodeEffect(verifierMessage)([
              "effect-auth/request-binding-verifier/v1",
              moduleId,
              purpose,
              Redacted.value(credential)
            ]).pipe(Effect.mapError(() => RequestBindingInvalid.make({})))

            const digest = yield* digestService
              .digest(Digest.sha256, new TextEncoder().encode(message))
              .pipe(Effect.catchDefect(() => Effect.fail(RequestBindingUnavailable.make({}))))

            // Entry verification deadline only. Final proof/action expiry is still
            // enforced by the actual mutation owner; this is not a commit deadline.
            return Object.freeze({
              verifier: TokenDigest.make(Base64Url.encode(digest)),
              expiresAtMillis: value.expiresAtMillis
            })
          })
        })
      })
    )
  }

  const layer = Layer.unwrap(Effect.map(RequestBindingConfig, signedLayer))

  return Object.freeze({ RequestBinding, signedLayer, layer })
}
