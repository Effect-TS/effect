/**
 * Message digests: MD5, SHA-1, SHA-256, SHA-384, and SHA-512.
 *
 * Code built from layers uses the {@link Digest} service. The top-level
 * {@link digest} and {@link digestHex} functions require nothing and run on the
 * `WebCrypto` reference. They are for schemas, non-Effect code, and APIs with
 * fixed signatures that cannot add a requirement.
 *
 * MD5 runs a pure TypeScript implementation vendored from `@noble/hashes`
 * 2.4.0, because WebCrypto does not provide it. Whether the `@noble/hashes`
 * audit covers its MD5 code has not been confirmed. The SHA algorithms run on
 * `crypto.subtle`.
 *
 * Output is stable byte for byte, so digests can be persisted.
 *
 * **Gotchas**
 *
 * MD5 and SHA-1 are broken for collision resistance. Use them only for
 * interoperability with existing protocols and checksums.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Hex from "../encoding/Hex.ts"
import * as Layer from "../Layer.ts"
import * as Md5 from "./internal/md5.ts"
import * as internal from "./internal/webCrypto.ts"
import { WebCrypto } from "./WebCrypto.ts"

/**
 * A digest algorithm, such as {@link sha256}.
 *
 * **Details**
 *
 * `name` is the WebCrypto algorithm name. `implementation` is the pure
 * TypeScript code for algorithms that WebCrypto does not provide, which a
 * layer calls when it has no native mapping for `name`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Algorithm {
  readonly name: "MD5" | "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"
  readonly outputLength: number
  readonly implementation: ((data: Uint8Array) => Uint8Array) | undefined
}

/**
 * MD5 (RFC 1321), with a 16-byte output.
 *
 * **Gotchas**
 *
 * MD5 is broken for collision resistance. Use it only for interoperability
 * with existing protocols and checksums.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const md5: Algorithm = { name: "MD5", outputLength: 16, implementation: Md5.md5 }

/**
 * SHA-1, with a 20-byte output.
 *
 * **Gotchas**
 *
 * SHA-1 is broken for collision resistance. Use it only for interoperability
 * with existing protocols.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const sha1: Algorithm = { name: "SHA-1", outputLength: 20, implementation: undefined }

/**
 * SHA-256, with a 32-byte output.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const sha256: Algorithm = { name: "SHA-256", outputLength: 32, implementation: undefined }

/**
 * SHA-384, with a 48-byte output.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const sha384: Algorithm = { name: "SHA-384", outputLength: 48, implementation: undefined }

/**
 * SHA-512, with a 64-byte output.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const sha512: Algorithm = { name: "SHA-512", outputLength: 64, implementation: undefined }

/**
 * Service that computes message digests.
 *
 * **Example** (Hashing with SHA-256)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { Digest } from "effect/crypto"
 *
 * const program = Effect.gen(function*() {
 *   const digest = yield* Digest.Digest
 *   return yield* digest.digestHex(Digest.sha256, new TextEncoder().encode("abc"))
 * })
 *
 * const hex = await Effect.runPromise(program.pipe(Effect.provide(Digest.layerWebCrypto)))
 * hex.length // => 64
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Digest extends Context.Service<Digest, {
  /**
   * Computes the digest of `data`.
   */
  readonly digest: (algorithm: Algorithm, data: Uint8Array) => Effect.Effect<Uint8Array>
  /**
   * Computes the digest of `data` as lowercase hex.
   */
  readonly digestHex: (algorithm: Algorithm, data: Uint8Array) => Effect.Effect<string>
}>()("effect/crypto/Digest") {}

const webCryptoDigest = (crypto: Crypto, algorithm: Algorithm, data: Uint8Array): Effect.Effect<Uint8Array> => {
  const implementation = algorithm.implementation
  if (implementation !== undefined) {
    return Effect.sync(() => implementation(data))
  }
  return Effect.suspend(() => {
    const subtle = crypto?.subtle
    if (subtle === undefined) return Effect.die(internal.subtleUnavailable())
    return Effect.promise(async () => new Uint8Array(await subtle.digest(algorithm.name, data as BufferSource)))
  })
}

/**
 * Layer that provides `Digest` on the `WebCrypto` reference.
 *
 * **Details**
 *
 * The SHA algorithms run on `crypto.subtle`, and MD5 on the pure TypeScript
 * implementation. Without `crypto.subtle`, the layer still builds and MD5
 * keeps working, but SHA digests die.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerWebCrypto: Layer.Layer<Digest> = Layer.effect(
  Digest,
  WebCrypto.use((crypto) =>
    Effect.succeed({
      digest: (algorithm, data) => webCryptoDigest(crypto, algorithm, data),
      digestHex: (algorithm, data) => Effect.map(webCryptoDigest(crypto, algorithm, data), Hex.encode)
    })
  )
)

/**
 * Computes the digest of `data` on the `WebCrypto` reference, without
 * requiring the `Digest` service.
 *
 * **When to use**
 *
 * Use when the `Digest` service cannot be required, as in schemas, non-Effect
 * code, and APIs with fixed signatures. Code built from layers should use the
 * service.
 *
 * **Gotchas**
 *
 * `WebCrypto.layer` changes the `Crypto` object this function uses, but a
 * mocked `Digest` service does not reach it.
 *
 * @stability unstable
 * @category digests
 * @since 4.0.0
 */
export const digest = (algorithm: Algorithm, data: Uint8Array): Effect.Effect<Uint8Array> =>
  WebCrypto.use((crypto) => webCryptoDigest(crypto, algorithm, data))

/**
 * Computes the digest of `data` as lowercase hex on the `WebCrypto` reference,
 * without requiring the `Digest` service.
 *
 * **When to use**
 *
 * Use when the `Digest` service cannot be required, as in schemas, non-Effect
 * code, and APIs with fixed signatures. Code built from layers should use the
 * service.
 *
 * **Example** (Hashing without a service)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { Digest } from "effect/crypto"
 *
 * const hex = await Effect.runPromise(Digest.digestHex(Digest.md5, new TextEncoder().encode("abc")))
 * hex // => "900150983cd24fb0d6963f7d28e17f72"
 * ```
 *
 * @stability unstable
 * @category digests
 * @since 4.0.0
 */
export const digestHex = (algorithm: Algorithm, data: Uint8Array): Effect.Effect<string> =>
  Effect.map(digest(algorithm, data), Hex.encode)
