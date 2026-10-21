import * as Cause from "effect/Cause"
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Mac from "effect/crypto/Mac"
import * as Signature from "effect/crypto/Signature"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"

import * as Jwk from "../../../../jose/Jwk.ts"
import type { PrivateKey } from "../../../../jose/Jwk.ts"
import * as Jwt from "../../../../jose/Jwt.ts"
import { Unavailable } from "../../../../oauth/OAuthError.ts"
import { makeScopedOperation } from "../../../shared/scopedOperation.ts"
import { isPrivateKeyAuthentication, type OpenIdConnectAuthentication, type PrivateKeyJwt } from "./models.ts"

const Claims = Schema.Struct({
  iss: Schema.NonEmptyString,
  sub: Schema.NonEmptyString,
  aud: Schema.NonEmptyString,
  iat: Schema.Finite,
  exp: Schema.Finite
})

/**
 * Sign one ES256 client-secret JWT. The caller owns key wiping.
 *
 * @internal
 */
export const signPrivateKeyJwt = Effect.fn("OpenIdConnect.signPrivateKeyJwt")(function*(
  policy: Omit<PrivateKeyJwt, "privateKey">,
  key: PrivateKey
) {
  const now = Math.floor((yield* Clock.currentTimeMillis) / 1000)

  return yield* Jwt.sign(
    Claims,
    {
      iss: policy.issuer,
      sub: policy.subject,
      aud: policy.audience,
      iat: now,
      exp: now + policy.lifetimeSeconds
    },
    key,
    { alg: "ES256", kid: policy.keyId }
  ).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
  )
})

/** Import detached PKCS8 bytes. The acquiring Scope owns the returned key. */
const importPrivateKeyJwt = Effect.fnUntraced(function*(policy: PrivateKeyJwt) {
  const der = Result.getOrUndefined(Base64.decode(Redacted.value(policy.privateKey)))

  if (der === undefined || der.length === 0) return yield* Unavailable.make({})

  return yield* Jwk.importPkcs8(Redacted.make(der), policy.algorithm, {
    kid: policy.keyId
  }).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({})))),
    Effect.ensuring(Effect.sync(() => der.fill(0)))
  )
})

const wipe = (key: PrivateKey) =>
  Effect.sync(() => {
    Redacted.value(key.material).fill(0)
    Redacted.wipeUnsafe(key.material)
    Redacted.wipeUnsafe(key.jwk)
  })

/** Inward client-authentication port. Concrete policy is provided at composition. */
export class PrivateKeyClientSecret extends Context.Service<
  PrivateKeyClientSecret,
  {
    readonly mint: (
      authentication: OpenIdConnectAuthentication
    ) => Effect.Effect<Redacted.Redacted<string> | undefined, Unavailable>
  }
>()("@effect/auth/oauth/providers/PrivateKeyClientSecret") {
  /** Static client secrets stay on the OAuth client. */
  static readonly layerUnused = Layer.succeed(PrivateKeyClientSecret, {
    mint: () => Effect.succeed(undefined)
  })

  /** Mint fresh ES256 assertions with one parsed key per installed policy. Keys
   * stay inside this Layer's crypto services and generation; teardown joins
   * active mints before wiping every retained key. */
  static readonly make = Effect.gen(function*() {
    const signature = yield* Signature.Signature
    const hmac = yield* Mac.Mac
    const keys = new Map<PrivateKeyJwt, PrivateKey>()

    // One finalizer preserves join-before-wipe even under a parallel parent Scope.
    const { keyScope, scope } = yield* Effect.acquireRelease(
      Effect.all({ keyScope: Scope.make(), scope: Scope.make() }),
      ({ keyScope, scope }) =>
        Scope.close(scope, Exit.void).pipe(
          Effect.ensuring(Scope.close(keyScope, Exit.void)),
          Effect.ensuring(Effect.sync(() => keys.clear()))
        )
    )

    const run = yield* makeScopedOperation(() => Unavailable.make({})).pipe(
      Effect.provideService(Scope.Scope, scope)
    )

    const imports = yield* Semaphore.make(1)

    const mint = Effect.fnUntraced(
      function*(policy: PrivateKeyJwt) {
        const existing = keys.get(policy)

        const key = existing ??
          (yield* imports.withPermits(1)(
            Effect.gen(function*() {
              const existing = keys.get(policy)

              if (existing !== undefined) return existing

              const key = yield* Effect.acquireRelease(importPrivateKeyJwt(policy), wipe).pipe(
                Effect.provideService(Scope.Scope, keyScope)
              )

              keys.set(policy, key)

              return key
            })
          ))

        return yield* signPrivateKeyJwt(policy, key)
      },
      Effect.provideService(Signature.Signature, signature),
      Effect.provideService(Mac.Mac, hmac)
    )

    return PrivateKeyClientSecret.of({
      mint: (authentication) =>
        !isPrivateKeyAuthentication(authentication)
          ? Effect.succeed(undefined)
          : run(mint(authentication.privateKeyJwt))
    })
  })

  static readonly layer = Layer.effect(PrivateKeyClientSecret, PrivateKeyClientSecret.make)
}
