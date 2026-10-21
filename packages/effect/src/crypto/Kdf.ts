/**
 * Key derivation: HKDF, PBKDF2, scrypt, and Argon2id.
 *
 * The {@link Kdf} service derives bytes from a secret with an algorithm value
 * such as {@link hkdfSha256}, {@link pbkdf2Sha256}, or `argon2id()`. The
 * output is plain bytes: turn it into a typed key with the target family's raw
 * constructor, such as `Mac.key`.
 *
 * **Gotchas**
 *
 * - The secret is bytes, with no string overload. Encode passwords yourself,
 *   and normalize their Unicode form first if users type them on different
 *   platforms.
 * - `layerWebCrypto` does not provide Argon2id, because WebCrypto has no
 *   Argon2. Deriving with it fails with an `Unsupported` reason, so programs
 *   can use `layerPortable` or `layerWasm` for Argon2id instead.
 *   `NodeCrypto.layerKdf` provides Argon2id on Node.js 24.7 or later and Bun
 *   1.4, and native scrypt on runtimes that expose it.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as CryptoError from "./CryptoError.ts"
import * as Digest from "./Digest.ts"
import * as argon2 from "./internal/argon2.ts"
import * as argon2Wasm from "./internal/argon2Wasm.ts"
import type { Argon2 } from "./internal/kdf.ts"
import * as internal from "./internal/webCrypto.ts"
import { WebCrypto } from "./WebCrypto.ts"

/**
 * HKDF (RFC 5869) with a hash, from {@link hkdf}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Hkdf {
  readonly _tag: "Hkdf"
  readonly name: string
  readonly hash: Digest.Algorithm
}

/**
 * PBKDF2 (RFC 8018) with a hash and an iteration count, from {@link pbkdf2}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Pbkdf2 {
  readonly _tag: "Pbkdf2"
  readonly name: string
  readonly hash: Digest.Algorithm
  readonly iterations: number
}

/**
 * Argon2id (RFC 9106) with its cost parameters, from {@link argon2id}.
 *
 * **Details**
 *
 * `memory` is in KiB, `passes` is the number of passes over the memory, and
 * `parallelism` is the number of lanes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Argon2id {
  readonly _tag: "Argon2id"
  readonly name: string
  readonly memory: number
  readonly passes: number
  readonly parallelism: number
}

/**
 * Scrypt (RFC 7914), with N, r, and p named cost, blockSize, and parallelism.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Scrypt {
  readonly _tag: "Scrypt"
  readonly name: "scrypt"
  readonly cost: number
  readonly blockSize: number
  readonly parallelism: number
}

/**
 * Builds a scrypt algorithm. Defaults to N=16384, r=8, and p=1.
 *
 * **Details**
 *
 * The cost must be a power of two greater than one. Native scrypt is
 * available through `NodeCrypto.layerKdf`, including on Bun.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.1.0
 */
export const scrypt = (options?: {
  readonly cost?: number | undefined
  readonly blockSize?: number | undefined
  readonly parallelism?: number | undefined
}): Scrypt => ({
  _tag: "Scrypt",
  name: "scrypt",
  cost: options?.cost ?? 16384,
  blockSize: options?.blockSize ?? 8,
  parallelism: options?.parallelism ?? 1
})

/**
 * A key derivation algorithm.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Algorithm = Hkdf | Pbkdf2 | Argon2id | Scrypt

/**
 * Builds the HKDF algorithm for a hash.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const hkdf = (hash: Digest.Algorithm): Hkdf => ({ _tag: "Hkdf", name: `hkdf${Digest.nameSuffix(hash)}`, hash })

/**
 * Builds a PBKDF2 algorithm for a hash and an iteration count.
 *
 * **Details**
 *
 * Deriving with an iteration count outside 1 to 2^31 - 1 fails with an
 * `InvalidArgument` reason.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const pbkdf2 = (options: { readonly hash: Digest.Algorithm; readonly iterations: number }): Pbkdf2 => ({
  _tag: "Pbkdf2",
  name: `pbkdf2${Digest.nameSuffix(options.hash)}`,
  hash: options.hash,
  iterations: options.iterations
})

/**
 * HKDF with SHA-1.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const hkdfSha1: Hkdf = hkdf(Digest.sha1)

/**
 * HKDF with SHA-256.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const hkdfSha256: Hkdf = hkdf(Digest.sha256)

/**
 * HKDF with SHA-384.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const hkdfSha384: Hkdf = hkdf(Digest.sha384)

/**
 * HKDF with SHA-512.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const hkdfSha512: Hkdf = hkdf(Digest.sha512)

/**
 * PBKDF2 with SHA-256 at 600,000 iterations, OWASP's current figure.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const pbkdf2Sha256: Pbkdf2 = pbkdf2({ hash: Digest.sha256, iterations: 600_000 })

/**
 * Builds an Argon2id algorithm, with `memory` in KiB.
 *
 * **Details**
 *
 * Omitted costs default to RFC 9106's second recommended setting: 64 MiB of
 * memory (`65_536`), 3 passes, and 4 lanes.
 *
 * **Gotchas**
 *
 * `Kdf.layerWebCrypto` does not provide Argon2id. Use `NodeCrypto.layerKdf`,
 * `layerPortable`, or `layerWasm`.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const argon2id = (options?: {
  readonly memory?: number | undefined
  readonly passes?: number | undefined
  readonly parallelism?: number | undefined
}): Argon2id => ({
  _tag: "Argon2id",
  name: "argon2id",
  memory: options?.memory ?? 65_536,
  passes: options?.passes ?? 3,
  parallelism: options?.parallelism ?? 4
})

/**
 * Service that derives bytes from a secret.
 *
 * **Example** (Deriving a key with HKDF)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { Kdf } from "effect/crypto"
 *
 * const program = Effect.gen(function*() {
 *   const kdf = yield* Kdf.Kdf
 *   return yield* kdf.derive(Kdf.hkdfSha256, new Uint8Array(32), {
 *     salt: new Uint8Array(16),
 *     info: new TextEncoder().encode("encryption"),
 *     length: 32
 *   })
 * })
 *
 * const bytes = await Effect.runPromise(program.pipe(Effect.provide(Kdf.layerWebCrypto)))
 * bytes.length // => 32
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Kdf extends Context.Service<Kdf, {
  /**
   * Derives `length` bytes from `secret`.
   *
   * `info` only applies to HKDF. `secret` and `associatedData` only apply
   * to Argon2id. Passing them to other algorithms fails with an
   * `InvalidArgument` reason.
   */
  readonly derive: (
    algorithm: Algorithm,
    secret: Uint8Array,
    options: {
      readonly salt: Uint8Array
      readonly length: number
      readonly info?: Uint8Array | undefined
      readonly secret?: Uint8Array | undefined
      readonly associatedData?: Uint8Array | undefined
    }
  ) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
}>()("effect/crypto/Kdf") {}

type DeriveOptions = Parameters<Kdf["Service"]["derive"]>[2]

const invalidArgument = (description: string) =>
  internal.fail("Kdf", "derive", new CryptoError.InvalidArgument({ description }))

const isIntegerIn = (n: number, min: number, max: number): boolean => Number.isSafeInteger(n) && n >= min && n <= max

// Checks the arguments before they reach Web Crypto, which takes a 32-bit bit
// length that some backends wrap instead of rejecting. Node.js aborts the
// process on PBKDF2 iteration counts above 2^31 - 1.
const checkArguments = (
  algorithm: Algorithm,
  options: DeriveOptions
): Effect.Effect<never, CryptoError.CryptoError> | undefined => {
  if (algorithm._tag !== "Hkdf" && options.info !== undefined) return invalidArgument("info only applies to HKDF")
  if (algorithm._tag !== "Argon2id" && (options.secret !== undefined || options.associatedData !== undefined)) {
    return invalidArgument("secret and associatedData only apply to Argon2id")
  }
  if (algorithm._tag === "Argon2id") {
    if (!isIntegerIn(algorithm.passes, 1, 0xffff_ffff) || !isIntegerIn(algorithm.parallelism, 1, 0xff_ffff)) {
      return invalidArgument("passes must be between 1 and 2^32 - 1 and parallelism between 1 and 2^24 - 1")
    }
    if (!isIntegerIn(algorithm.memory, 8 * algorithm.parallelism, 0xffff_ffff)) {
      return invalidArgument("memory must be at least 8 KiB per lane and below 2^32 KiB")
    }
    if (options.salt.length < 8) return invalidArgument("salt must be at least 8 bytes")
    return isIntegerIn(options.length, 4, 0xffff_ffff)
      ? undefined
      : invalidArgument("length must be between 4 and 2^32 - 1 bytes")
  }
  if (algorithm._tag === "Scrypt") {
    if (!isIntegerIn(algorithm.cost, 2, 0x8000_0000) || !Number.isInteger(Math.log2(algorithm.cost))) {
      return invalidArgument("cost must be a power of two between 2 and 2^31")
    }
    if (
      !isIntegerIn(algorithm.blockSize, 1, 0xffff_ffff) || !isIntegerIn(algorithm.parallelism, 1, 0xffff_ffff) ||
      Math.log2(algorithm.cost) >= 16 * algorithm.blockSize || algorithm.blockSize * algorithm.parallelism >= 2 ** 30
    ) {
      return invalidArgument("invalid scrypt blockSize or parallelism")
    }
    return isIntegerIn(options.length, 1, 0x7fff_ffff)
      ? undefined
      : invalidArgument("length must be between 1 and 2^31 - 1 bytes")
  }
  if (algorithm.hash.name === "MD5") return invalidArgument(`${algorithm._tag} needs a SHA hash, not MD5`)
  if (algorithm._tag === "Hkdf") {
    const maxLength = 255 * algorithm.hash.outputLength
    return isIntegerIn(options.length, 1, maxLength)
      ? undefined
      : invalidArgument(`length must be between 1 and ${maxLength} bytes for ${algorithm.name}`)
  }
  if (!isIntegerIn(algorithm.iterations, 1, 0x7fff_ffff)) {
    return invalidArgument("iterations must be between 1 and 2^31 - 1")
  }
  return isIntegerIn(options.length, 1, 0x1fff_ffff)
    ? undefined
    : invalidArgument("length must be between 1 and 2^29 - 1 bytes")
}

const webCryptoParams = (algorithm: Hkdf | Pbkdf2, options: DeriveOptions): HkdfParams | Pbkdf2Params =>
  algorithm._tag === "Hkdf"
    ? {
      name: "HKDF",
      hash: algorithm.hash.name,
      salt: options.salt as BufferSource,
      info: (options.info ?? new Uint8Array()) as BufferSource
    }
    : {
      name: "PBKDF2",
      hash: algorithm.hash.name,
      salt: options.salt as BufferSource,
      iterations: algorithm.iterations
    }

/**
 * Layer that provides `Kdf` on the `WebCrypto` reference.
 *
 * **Details**
 *
 * HKDF and PBKDF2 run on `crypto.subtle`, off the event loop where the runtime
 * supports it. Argon2id and scrypt fail with an `Unsupported` reason.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerWebCrypto: Layer.Layer<Kdf> = Layer.effect(
  Kdf,
  WebCrypto.use((crypto) =>
    Effect.succeed(Kdf.of({
      derive: (algorithm, secret, options) =>
        Effect.suspend(() => {
          const failure = checkArguments(algorithm, options)
          if (failure !== undefined) return failure
          if (algorithm._tag === "Argon2id" || algorithm._tag === "Scrypt") {
            return internal.fail(
              "Kdf",
              "derive",
              new CryptoError.Unsupported({ description: `Kdf.layerWebCrypto does not provide ${algorithm.name}` })
            )
          }
          const name = algorithm._tag === "Hkdf" ? "HKDF" : "PBKDF2"
          return Effect.acquireUseRelease(
            Effect.sync(() => ({
              secret: new Uint8Array(secret),
              options: {
                ...options,
                salt: new Uint8Array(options.salt),
                info: options.info === undefined ? undefined : new Uint8Array(options.info)
              }
            })),
            (owned) =>
              internal.run("Kdf", "derive", algorithm.name, crypto, async (subtle) => {
                const handle = await subtle.importKey("raw", owned.secret as BufferSource, name, false, ["deriveBits"])
                return new Uint8Array(
                  await subtle.deriveBits(webCryptoParams(algorithm, owned.options), handle, owned.options.length * 8)
                )
              }).pipe(Effect.uninterruptible),
            (owned) => Effect.sync(() => owned.secret.fill(0))
          )
        })
    }))
  )
)

/**
 * Per-derivation resource ceilings, separate from password-strength policy.
 *
 * **Details**
 *
 * Scrypt memory is `128 * blockSize * (cost + parallelism + 2)` bytes and
 * its memory-pass cost is `cost * blockSize * parallelism / 8`. The passes
 * and parallelism ceilings apply to Argon2id. Input ceilings apply to each
 * input byte array independently.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Limits {
  readonly maximumMemoryKiB: number
  readonly maximumPasses: number
  readonly maximumParallelism: number
  readonly maximumMemoryPasses: number
  readonly maximumIterations: number
  readonly maximumInputBytes: number
  readonly maximumOutputBytes: number
}

/**
 * Default resource ceilings for an individual key derivation.
 *
 * **Gotchas**
 *
 * The memory-pass ceiling is 131,072 KiB-passes. The default `argon2id()`
 * parameters require 196,608 KiB-passes, so increase that ceiling explicitly
 * when using those parameters with `withLimits`.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.0
 */
export const defaultLimits: Limits = Object.freeze({
  maximumMemoryKiB: 65_536,
  maximumPasses: 6,
  maximumParallelism: 4,
  maximumMemoryPasses: 131_072,
  maximumIterations: 1_000_000,
  maximumInputBytes: 65_536,
  maximumOutputBytes: 1024
})

/**
 * Wraps a KDF service with resource ceilings checked before invoking its
 * implementation. Invalid limits fail on derivation with `InvalidArgument`.
 *
 * **Details**
 *
 * Share a `KdfAdmission` service to bound concurrent work as well. This
 * wrapper changes neither algorithms nor bytes and never retries work.
 *
 * @see {@link defaultLimits} for the default resource ceilings
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const withLimits = (service: Kdf["Service"], options: Partial<Limits> = {}): Kdf["Service"] => {
  const limits = { ...defaultLimits, ...options }
  return Kdf.of({
    derive: (algorithm, secret, options) =>
      Effect.suspend(() => {
        if (Object.values(limits).some((value) => !Number.isSafeInteger(value) || value <= 0)) {
          return invalidArgument("KDF resource ceilings must be positive safe integers")
        }
        const failure = checkArguments(algorithm, options)
        if (failure !== undefined) return failure
        if (
          options.length > limits.maximumOutputBytes ||
          [secret, options.salt, options.info, options.secret, options.associatedData].some((bytes) =>
            bytes !== undefined && bytes.length > limits.maximumInputBytes
          )
        ) {
          return invalidArgument("KDF input or output exceeds its resource ceiling")
        }
        switch (algorithm._tag) {
          case "Argon2id":
            if (
              algorithm.memory > limits.maximumMemoryKiB || algorithm.passes > limits.maximumPasses ||
              algorithm.parallelism > limits.maximumParallelism ||
              algorithm.memory * algorithm.passes > limits.maximumMemoryPasses
            ) {
              return invalidArgument("Argon2id exceeds its resource ceiling")
            }
            break
          case "Scrypt":
            if (
              128 * algorithm.blockSize * (algorithm.cost + algorithm.parallelism + 2) >
                limits.maximumMemoryKiB * 1024 ||
              algorithm.cost * algorithm.blockSize * algorithm.parallelism / 8 > limits.maximumMemoryPasses
            ) {
              return invalidArgument("Scrypt exceeds its resource ceiling")
            }
            break
          case "Pbkdf2":
            if (algorithm.iterations > limits.maximumIterations) {
              return invalidArgument("PBKDF2 exceeds its resource ceiling")
            }
            break
        }
        return service.derive(algorithm, secret, options)
      })
  })
}

const layerArgon2 = (derive: Argon2, fallback: Layer.Layer<Kdf> = layerWebCrypto): Layer.Layer<Kdf> =>
  Layer.effect(
    Kdf,
    Kdf.use((core) =>
      Effect.succeed(Kdf.of({
        derive: (algorithm, password, options) => {
          if (algorithm._tag !== "Argon2id") return core.derive(algorithm, password, options)
          return Effect.suspend(() => {
            const failure = checkArguments(algorithm, options)
            if (failure !== undefined) return failure
            return Effect.acquireUseRelease(
              Effect.sync(() => ({
                password: new Uint8Array(password),
                salt: new Uint8Array(options.salt),
                memoryKiB: algorithm.memory,
                passes: algorithm.passes,
                parallelism: algorithm.parallelism,
                length: options.length,
                secret: options.secret === undefined ? undefined : new Uint8Array(options.secret),
                associatedData: new Uint8Array(options.associatedData ?? [])
              })),
              derive,
              (owned) =>
                Effect.sync(() => {
                  owned.password.fill(0)
                  owned.secret?.fill(0)
                })
            )
          })
        }
      }))
    )
  ).pipe(Layer.provide(fallback))

/**
 * Provides Argon2id v19 in portable TypeScript, with HKDF and PBKDF2 on
 * WebCrypto. Scrypt is unsupported. Argon2 yields between bounded batches
 * and wipes its owned work buffers on completion, failure, or interruption.
 *
 * **Gotchas**
 *
 * Use `withLimits` and `KdfAdmission` for untrusted derivation parameters.
 *
 * @see {@link layerWasm} for the WASM implementation
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerPortable: Layer.Layer<Kdf> = /* @__PURE__ */ layerArgon2(argon2.argon2)

/**
 * Provides Argon2id v19 using the SIMD block compressor exported by the
 * bundled `effect/crypto/argon2.wasm` module. Statically import that module
 * when bundling for Cloudflare Workers.
 *
 * **Details**
 *
 * Algorithms other than Argon2id use `fallback`, which defaults to
 * `layerWebCrypto`. Pass `NodeCrypto.layerKdf` as the fallback on Workers
 * with Node.js compatibility to include native scrypt.
 *
 * Each derivation owns a WASM instance, yields between batches, and wipes
 * its entire linear memory before releasing its resources. This function
 * performs no runtime fetching or compilation.
 *
 * @see {@link layerPortable} for the TypeScript implementation
 * @see {@link withLimits} for resource ceilings
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerWasm = (module: WebAssembly.Module, fallback: Layer.Layer<Kdf> = layerWebCrypto): Layer.Layer<Kdf> =>
  layerArgon2(argon2Wasm.makeArgon2(module), fallback)
