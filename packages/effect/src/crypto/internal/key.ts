import * as Effect from "../../Effect.ts"
import * as Equal from "../../Equal.ts"
import { format } from "../../Formatter.ts"
import { NodeInspectSymbol } from "../../Inspectable.ts"
import * as Predicate from "../../Predicate.ts"
import * as CryptoError from "../CryptoError.ts"
import * as internal from "./webCrypto.ts"

/**
 * What a key holds: bytes, which every layer accepts, or a `CryptoKey` from a
 * `*FromCryptoKey` constructor.
 *
 * @internal
 */
export type Material =
  | { readonly _tag: "Bytes"; readonly bytes: Uint8Array }
  | { readonly _tag: "CryptoKey"; readonly cryptoKey: CryptoKey }

/**
 * The property holding a key's material. It is shared through `Symbol.for` so
 * the platform layers, which cannot import this module, can read it. It is not
 * enumerable, so it never reaches `JSON.stringify` or `inspect`.
 *
 * @internal
 */
export const MaterialId: unique symbol = Symbol.for("~effect/crypto/Key/material") as never

/** @internal */
export const material = (key: object): Material => (key as { readonly [MaterialId]: Material })[MaterialId]

/**
 * Builds the prototype of a secret or private key, which displays only its
 * algorithm.
 *
 * @internal
 */
export const redactedProto = (typeId: string, label: string): object => ({
  [typeId]: typeId,
  toJSON(this: { readonly algorithm: { readonly name: string } }) {
    return { _id: label, algorithm: this.algorithm.name }
  },
  toString(this: { toJSON(): unknown }) {
    return format(this.toJSON())
  },
  [NodeInspectSymbol](this: { toJSON(): unknown }) {
    return this.toJSON()
  }
})

/**
 * Builds a key. Keys compare by reference: comparing key bytes is not constant
 * time, and structural equality would let secret keys act as `HashMap` keys.
 *
 * @internal
 */
export const make = <K>(proto: object, algorithm: unknown, material: Material): K =>
  Equal.byReferenceUnsafe(Object.create(proto, {
    algorithm: { value: algorithm, enumerable: true },
    [MaterialId]: { value: material }
  }))

/** @internal */
export const fail = (
  module: string,
  method: string,
  reason: CryptoError.CryptoErrorReason
): Effect.Effect<never, CryptoError.CryptoError> => Effect.fail(new CryptoError.CryptoError({ module, method, reason }))

/** @internal */
export const invalidKey = (module: string, method: string, description: string) =>
  fail(module, method, new CryptoError.InvalidKey({ description }))

/**
 * Copies raw key bytes into a byte-backed key, rejecting other values.
 *
 * @internal
 */
export const fromBytes = <K>(
  module: string,
  method: string,
  proto: object,
  algorithm: unknown,
  bytes: Uint8Array,
  check: (length: number) => string | undefined
): Effect.Effect<K, CryptoError.CryptoError> =>
  Effect.suspend(() => {
    if (!(bytes instanceof Uint8Array)) return invalidKey(module, method, "Expected the key as a Uint8Array")
    const problem = check(bytes.length)
    return problem === undefined
      ? Effect.succeed(make<K>(proto, algorithm, { _tag: "Bytes", bytes: bytes.slice() }))
      : invalidKey(module, method, problem)
  })

/**
 * Checks a `CryptoKey` against the typed key it is to back, returning a
 * description of the first mismatch.
 *
 * @internal
 */
export const checkCryptoKey = (
  cryptoKey: CryptoKey,
  expected: {
    readonly type: KeyType
    readonly name: string
    readonly usages: ReadonlyArray<KeyUsage>
    readonly check?: (algorithm: KeyAlgorithm) => string | undefined
  }
): string | undefined => {
  if (
    !Predicate.hasProperty(cryptoKey, "type") || !Predicate.hasProperty(cryptoKey, "algorithm") ||
    !Predicate.hasProperty(cryptoKey, "usages") || !Array.isArray(cryptoKey.usages)
  ) {
    return "Expected a CryptoKey"
  }
  if (cryptoKey.algorithm.name !== expected.name) {
    return `Expected a ${expected.name} key, not ${cryptoKey.algorithm.name}`
  }
  if (cryptoKey.type !== expected.type) return `Expected a ${expected.type} key, not ${cryptoKey.type}`
  const problem = expected.check?.(cryptoKey.algorithm)
  if (problem !== undefined) return problem
  if (!cryptoKey.usages.some((usage) => expected.usages.includes(usage))) {
    return `Expected a key with one of the usages ${expected.usages.join(", ")}`
  }
  return undefined
}

/**
 * Exports a key's stored representation as fresh bytes. `CryptoKey`-backed
 * keys are exported on the `WebCrypto` reference.
 *
 * @internal
 */
export const toBytes = (
  module: string,
  key: object,
  format: "raw" | "spki" | "pkcs8"
): Effect.Effect<Uint8Array, CryptoError.CryptoError> =>
  Effect.suspend(() => {
    const stored = material(key)
    if (stored._tag === "Bytes") return Effect.succeed(stored.bytes.slice())
    const cryptoKey = stored.cryptoKey
    if (!cryptoKey.extractable) {
      return fail(
        module,
        "toBytes",
        new CryptoError.NotExtractable({ description: "The CryptoKey is not extractable" })
      )
    }
    return Effect.flatMap(internal.subtle, (subtle) =>
      Effect.tryPromise({
        try: async () => new Uint8Array(await subtle.exportKey(format, cryptoKey)),
        catch: (cause) => internal.webCryptoError(module, "toBytes", cause)
      }))
  })

/**
 * A per-layer cache of the `CryptoKey`s imported from byte-backed keys.
 *
 * @internal
 */
export const makeCache = (
  importKey: (subtle: SubtleCrypto, bytes: Uint8Array, algorithm: any) => Promise<CryptoKey>
) => {
  const cache = new WeakMap<object, CryptoKey>()
  return async (subtle: SubtleCrypto, key: { readonly algorithm: unknown }): Promise<CryptoKey> => {
    const stored = material(key)
    if (stored._tag === "CryptoKey") return stored.cryptoKey
    let cryptoKey = cache.get(key)
    if (cryptoKey === undefined) {
      cryptoKey = await importKey(subtle, stored.bytes, key.algorithm)
      cache.set(key, cryptoKey)
    }
    return cryptoKey
  }
}
