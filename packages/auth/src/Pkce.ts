/**
 * Fresh private transaction secrets and RFC 7636 S256 PKCE challenges backed by Effect's SecureRandom and Digest services.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"

import * as Validation from "./internal/validation.ts"
import { Unavailable } from "./OAuthError.ts"

/**
 * Generates a fresh 256-bit state, nonce, or PKCE verifier as an unpadded base64url secret. Application policy owns storage and one-time use.
 *
 * **Details**
 *
 * Requires the SecureRandom service for entropy.
 *
 * **Example** (Creating a private transaction state)
 *
 * ```ts import.meta.vitest
 * import { Pkce } from "@effect/auth"
 * import { NodeCrypto } from "@effect/platform-node"
 * import { Effect, Redacted } from "effect"
 *
 * const state = await Effect.runPromise(Pkce.random().pipe(Effect.provide(NodeCrypto.layerSecureRandom)))
 * Redacted.value(state).length // => 43
 * ```
 *
 * @see {@link make} for a verifier and its S256 challenge
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const random = Effect.fnUntraced(
  function*(): Effect.fn.Return<
    Redacted.Redacted<string>,
    Unavailable,
    SecureRandom.SecureRandom
  > {
    const random = yield* SecureRandom.SecureRandom
    const bytes = yield* random.randomBytes(32).pipe(Effect.uninterruptible)

    if (bytes.length !== 32) return yield* Unavailable.make({})

    return Redacted.make(Base64Url.encode(bytes))
  },
  Effect.catchDefect(() => Unavailable.make({}))
)

/**
 * Computes an RFC 7636 S256 challenge from a redacted 43–128-character PKCE verifier. Invalid input and crypto failures return OAuthUnavailable.
 *
 * **Details**
 *
 * Requires the Digest service for SHA-256 hashing.
 *
 * **Example** (Checking the RFC 7636 Appendix B vector)
 *
 * ```ts import.meta.vitest
 * import { Pkce } from "@effect/auth"
 * import { NodeCrypto } from "@effect/platform-node"
 * import { Effect, Redacted } from "effect"
 *
 * const challenge = await Effect.runPromise(
 *   Pkce.challenge(Redacted.make("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).pipe(
 *     Effect.provide(NodeCrypto.layerDigest)
 *   )
 * )
 * challenge // => "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
 * ```
 *
 * @see {@link make} for generating a verifier and its challenge together
 *
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const challenge = Effect.fnUntraced(
  function*(
    input: Redacted.Redacted<string>
  ): Effect.fn.Return<string, Unavailable, Digest.Digest> {
    const verifier = yield* Validation.reveal(yield* Validation.decode(Validation.Verifier, input))
    const digests = yield* Digest.Digest
    const digest = yield* digests.digest(Digest.sha256, new TextEncoder().encode(verifier)).pipe(Effect.uninterruptible)

    if (digest.length !== 32) return yield* Unavailable.make({})

    return Base64Url.encode(digest)
  },
  Effect.catchDefect(() => Unavailable.make({}))
)

/**
 * Generates a fresh private PKCE verifier and its public S256 challenge using the SecureRandom and Digest services.
 *
 * **Example** (Creating an S256 transaction)
 *
 * ```ts import.meta.vitest
 * import { Pkce } from "@effect/auth"
 * import { NodeCrypto } from "@effect/platform-node"
 * import { Effect, Redacted } from "effect"
 *
 * const transaction = await Effect.runPromise(Pkce.make().pipe(Effect.provide([NodeCrypto.layerDigest, NodeCrypto.layerSecureRandom])))
 * Redacted.value(transaction.verifier).length // => 43
 * transaction.challenge.length // => 43
 * ```
 *
 * @see {@link random}
 * @see {@link challenge}
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const make = Effect.fnUntraced(function*(): Effect.fn.Return<
  { verifier: Redacted.Redacted<string>; challenge: string },
  Unavailable,
  SecureRandom.SecureRandom | Digest.Digest
> {
  const verifier = yield* random()

  return { verifier, challenge: yield* challenge(verifier) }
})
