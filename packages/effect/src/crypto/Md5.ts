/**
 * MD5 digests, for interoperability with existing protocols and checksums.
 *
 * Web Crypto does not provide MD5; the Node.js, Bun, and Deno platform packages
 * do.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import type * as Effect from "../Effect.ts"
import type * as CryptoError from "./CryptoError.ts"

/**
 * Service that computes MD5 digests.
 *
 * **Gotchas**
 *
 * MD5 is broken for security purposes. Use it only for interoperability with
 * existing protocols and checksums. Web Crypto does not provide MD5, so
 * browser platforms do not provide this service.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Md5 extends Context.Service<Md5, {
  /**
   * Computes an MD5 digest of the supplied data.
   */
  readonly digest: (data: Uint8Array) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
}>()("effect/crypto/Md5") {}
