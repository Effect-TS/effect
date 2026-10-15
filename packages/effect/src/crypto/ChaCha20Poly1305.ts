/**
 * ChaCha20-Poly1305 and XChaCha20-Poly1305 authenticated encryption.
 *
 * Web Crypto does not provide either; the Node.js and Deno platform packages
 * do.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import type * as Aead from "./Aead.ts"

/**
 * Service for RFC 8439 ChaCha20-Poly1305 authenticated encryption.
 *
 * **Details**
 *
 * Keys are 32 `Redacted` bytes and nonces contain 12 bytes. Decryption fails
 * with a `DecryptionFailed` reason when the tag does not match.
 *
 * **Gotchas**
 *
 * Random 12-byte nonces risk collisions after many messages under one key.
 * Use a counter nonce, or `XChaCha20Poly1305` for random nonces. Web Crypto
 * does not provide ChaCha20-Poly1305; the Node.js and Deno platform packages
 * do.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class ChaCha20Poly1305
  extends Context.Service<ChaCha20Poly1305, Aead.Aead>()("effect/crypto/ChaCha20Poly1305")
{}

/**
 * Service for XChaCha20-Poly1305 authenticated encryption.
 *
 * **When to use**
 *
 * Use when nonces are generated randomly, since 24-byte nonces make
 * collisions negligible.
 *
 * **Details**
 *
 * Implements draft-irtf-cfrg-xchacha-03: HChaCha20 derives a subkey from the
 * key and the first 16 nonce bytes, and ChaCha20-Poly1305 encrypts with the
 * remaining 8. Keys are 32 `Redacted` bytes and nonces contain 24 bytes. The
 * output is compatible with libsodium's `crypto_aead_xchacha20poly1305_ietf`.
 *
 * **Gotchas**
 *
 * Web Crypto does not provide ChaCha20-Poly1305; the Node.js and Deno
 * platform packages provide this service.
 *
 * **Example** (Encrypting with a random nonce)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { ChaCha20Poly1305, SecureRandom } from "effect/crypto"
 *
 * const program = Effect.gen(function*() {
 *   const xchacha = yield* ChaCha20Poly1305.XChaCha20Poly1305
 *   const key = yield* xchacha.generateKey()
 *   const nonce = yield* SecureRandom.randomBytes(24)
 *   return yield* xchacha.encrypt({ key, nonce, data: new TextEncoder().encode("secret") })
 * })
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class XChaCha20Poly1305
  extends Context.Service<XChaCha20Poly1305, Aead.Aead>()("effect/crypto/XChaCha20Poly1305")
{}
