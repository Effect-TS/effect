/**
 * Argon2id password hashing, as specified in RFC 9106.
 *
 * Web Crypto does not provide Argon2id; the Node.js platform package does on
 * Node.js versions with native support.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import type * as Effect from "../Effect.ts"
import type * as Redacted from "../Redacted.ts"
import type * as CryptoError from "./CryptoError.ts"

/**
 * Parameters for Argon2id version 19 password derivation.
 *
 * **Details**
 *
 * Memory is measured in KiB and must be at least eight times parallelism.
 * The salt must contain at least eight bytes and the output at least four.
 * Secret and associated data are optional inputs to the derivation.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly password: Redacted.Redacted<Uint8Array>
  readonly salt: Uint8Array
  readonly memoryKiB: number
  readonly passes: number
  readonly parallelism: number
  readonly length: number
  readonly secret?: Redacted.Redacted<Uint8Array> | undefined
  readonly associatedData?: Uint8Array | undefined
}

/**
 * Service for Argon2id password hashing.
 *
 * **Details**
 *
 * Implements RFC 9106 Argon2id, version 19. Passwords, secrets, and derived
 * bytes are `Redacted`, so a derived key can be passed directly to services
 * such as `Aes`. Store `Redacted.value` of a derived password hash and check
 * passwords against it with `verify`. Only runtimes with native Argon2id
 * provide this service; the Node.js layer fails to build with an
 * `Unsupported` reason on versions without it.
 *
 * **Gotchas**
 *
 * Callers choose password-strength policy and must bound memory, work
 * factors, and concurrent derivations. Node's implementation waits for native
 * work to complete on interruption, so an enclosing concurrency permit remains
 * held until the native job finishes.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Argon2id extends Context.Service<Argon2id, {
  /**
   * Derives a password hash with Argon2id. Invalid memory, passes,
   * parallelism, output lengths, or salts fail with an `InvalidArgument` reason.
   */
  readonly derive: (options: Options) => Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError.CryptoError>
  /**
   * Checks a password against a stored Argon2id hash by deriving
   * `expected.length` bytes and comparing them in constant time. A stored
   * hash whose length is not a valid output length never matches.
   */
  readonly verify: (
    options: Omit<Options, "length"> & { readonly expected: Uint8Array }
  ) => Effect.Effect<boolean, CryptoError.CryptoError>
}>()("effect/crypto/Argon2id") {}
