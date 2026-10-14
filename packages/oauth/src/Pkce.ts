/**
 * Fresh private transaction secrets and RFC 7636 S256 PKCE challenges backed by Effect Crypto.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"

import { Unavailable } from "./Errors.ts"
import * as V from "./internal/validation.ts"

/**
 * Generates a fresh 256-bit state, nonce, or PKCE verifier as an unpadded base64url secret. Application policy owns storage and one-time use.
 *
 * **Example** (Creating a private transaction state)
 *
 * ```ts import.meta.vitest
 * import { Pkce } from "@effect/oauth"
 * import { NodeCrypto } from "@effect/platform-node"
 * import { Effect, Redacted } from "effect"
 *
 * const state = await Effect.runPromise(Pkce.random().pipe(Effect.provide(NodeCrypto.layer)))
 * Redacted.value(state).length // => 43
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const random = Effect.fnUntraced(
  function*() {
    const crypto = yield* Crypto.Crypto
    const bytes = yield* crypto.randomBytes(32)

    if (bytes.length !== 32) return yield* Unavailable.make({})

    return Redacted.make(Base64Url.encode(bytes))
  },
  Effect.mapError(() => Unavailable.make({}))
)

/**
 * Computes an RFC 7636 S256 challenge from a redacted 43–128-character PKCE verifier. Invalid input and crypto failures return OAuthUnavailable.
 *
 * **Example** (Checking the RFC 7636 Appendix B vector)
 *
 * ```ts import.meta.vitest
 * import { Pkce } from "@effect/oauth"
 * import { NodeCrypto } from "@effect/platform-node"
 * import { Effect, Redacted } from "effect"
 *
 * const challenge = await Effect.runPromise(
 *   Pkce.challenge(Redacted.make("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).pipe(
 *     Effect.provide(NodeCrypto.layer)
 *   )
 * )
 * challenge // => "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
 * ```
 *
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const challenge = Effect.fnUntraced(
  function*(input: Redacted.Redacted<string>) {
    const verifier = yield* V.reveal(yield* V.decode(V.Verifier, input))
    const crypto = yield* Crypto.Crypto
    const digest = yield* crypto.digest("SHA-256", new TextEncoder().encode(verifier))

    if (digest.length !== 32) return yield* Unavailable.make({})

    return Base64Url.encode(digest)
  },
  Effect.mapError(() => Unavailable.make({}))
)

/**
 * Generates a fresh private PKCE verifier and its public S256 challenge using Effect Crypto.
 *
 * **Example** (Creating an S256 transaction)
 *
 * ```ts import.meta.vitest
 * import { Pkce } from "@effect/oauth"
 * import { NodeCrypto } from "@effect/platform-node"
 * import { Effect, Redacted } from "effect"
 *
 * const transaction = await Effect.runPromise(Pkce.make().pipe(Effect.provide(NodeCrypto.layer)))
 * Redacted.value(transaction.verifier).length // => 43
 * transaction.challenge.length // => 43
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const make = Effect.fnUntraced(function*() {
  const verifier = yield* random()

  return { verifier, challenge: yield* challenge(verifier) }
})
