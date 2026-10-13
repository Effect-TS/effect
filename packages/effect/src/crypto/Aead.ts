/**
 * The interface shared by authenticated encryption services, and their
 * inputs.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as Effect from "../Effect.ts"
import type * as Redacted from "../Redacted.ts"
import type * as CryptoError from "./CryptoError.ts"

/**
 * Inputs for authenticated encryption and decryption with AES-GCM,
 * ChaCha20-Poly1305, or XChaCha20-Poly1305.
 *
 * **Details**
 *
 * `data` is plaintext for encryption and ciphertext with its appended 16-byte
 * tag for decryption. Additional data is authenticated without being
 * encrypted and defaults to empty.
 *
 * **Gotchas**
 *
 * Never reuse a nonce with the same key. Decryption must use the same nonce
 * and additional data as encryption.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly key: Redacted.Redacted<Uint8Array>
  readonly nonce: Uint8Array
  readonly data: Uint8Array
  readonly additionalData?: Uint8Array | undefined
}

/**
 * The operations of an authenticated cipher with 32-byte keys.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Aead {
  /**
   * Generates a random 32-byte key.
   */
  readonly generateKey: () => Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError.CryptoError>
  /**
   * Encrypts plaintext and appends the 16-byte authentication tag.
   */
  readonly encrypt: (options: Options) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
  /**
   * Authenticates and decrypts ciphertext.
   */
  readonly decrypt: (options: Options) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
}
