/**
 * SSH public key signatures: algorithm tables, conversion between SSH wire
 * formats and the `Crypto` service's key and signature formats, signature
 * verification, and fingerprints.
 *
 * @internal
 */
import * as Context from "../../Context.ts"
import * as Crypto from "../../Crypto.ts"
import * as Effect from "../../Effect.ts"
import * as Base64 from "../../encoding/Base64.ts"
import * as Base64Url from "../../encoding/Base64Url.ts"
import * as Layer from "../../Layer.ts"
import type { SshError } from "../SshError.ts"
import { protocolErrorFrom, trySync } from "./errors.ts"
import type { Bytes } from "./wire.ts"
import { concat, padStart, Reader, stripLeadingZeros, WireError, Writer } from "./wire.ts"

/** @internal */
export interface EcdsaCurve {
  readonly identifier: string
  readonly namedCurve: Crypto.NamedCurve
  readonly hash: Crypto.HmacAlgorithm
  readonly size: number
}

/** @internal */
export const ecdsaCurves: Record<string, EcdsaCurve> = {
  "ecdsa-sha2-nistp256": { identifier: "nistp256", namedCurve: "P-256", hash: "SHA-256", size: 32 },
  "ecdsa-sha2-nistp384": { identifier: "nistp384", namedCurve: "P-384", hash: "SHA-384", size: 48 },
  "ecdsa-sha2-nistp521": { identifier: "nistp521", namedCurve: "P-521", hash: "SHA-512", size: 66 }
}

/** @internal */
export const rsaSignatureHashes: Record<string, Crypto.HmacAlgorithm> = {
  "rsa-sha2-256": "SHA-256",
  "rsa-sha2-512": "SHA-512"
}

/**
 * Returns the signature algorithms usable with a public key type.
 *
 * @internal
 */
export const signatureAlgorithmsForKeyType = (keyType: string): ReadonlyArray<string> => {
  switch (keyType) {
    case "ssh-rsa":
      return ["rsa-sha2-512", "rsa-sha2-256"]
    case "ssh-ed25519":
    case "ecdsa-sha2-nistp256":
    case "ecdsa-sha2-nistp384":
    case "ecdsa-sha2-nistp521":
      return [keyType]
    default:
      return []
  }
}

/**
 * Returns the public key type used by a signature algorithm.
 *
 * @internal
 */
export const keyTypeForSignatureAlgorithm = (algorithm: string): string =>
  algorithm in rsaSignatureHashes ? "ssh-rsa" : algorithm

/**
 * Converts an IEEE P1363 ECDSA signature (`r || s`) into the SSH
 * `mpint r, mpint s` encoding.
 *
 * @internal
 */
export const ecdsaP1363ToSsh = (signature: Uint8Array): Bytes => {
  const half = signature.length / 2
  return new Writer().mpint(signature.subarray(0, half)).mpint(signature.subarray(half)).finish()
}

/**
 * Converts an SSH `mpint r, mpint s` ECDSA signature into IEEE P1363.
 *
 * @internal
 */
export const ecdsaSshToP1363 = (signature: Uint8Array, size: number): Bytes => {
  const reader = new Reader(signature)
  const r = reader.mpint()
  const s = reader.mpint()
  return concat([padStart(r, size), padStart(s, size)])
}

/**
 * Describes how to verify signatures for a public key blob with the `Crypto`
 * service.
 */
interface VerifyPlan {
  readonly jwk: Crypto.Jwk
  readonly algorithm: Crypto.KeyPairAlgorithm
  readonly options: Crypto.SigningOptions
  readonly signature: (raw: Uint8Array) => Uint8Array | undefined
}

const verifyPlan = (blob: Uint8Array, algorithm: string): VerifyPlan => {
  const reader = new Reader(blob)
  const keyType = reader.utf8()
  if (keyType !== keyTypeForSignatureAlgorithm(algorithm)) {
    throw new WireError(`key type ${keyType} does not match signature algorithm ${algorithm}`)
  }
  if (keyType === "ssh-ed25519") {
    const key = reader.string()
    if (key.length !== 32) throw new WireError("invalid ed25519 public key")
    return {
      jwk: { kty: "OKP", crv: "Ed25519", x: Base64Url.encode(key) },
      algorithm: { name: "Ed25519" },
      options: { name: "Ed25519" },
      signature: (raw) => raw
    }
  }
  const curve = ecdsaCurves[keyType]
  if (curve !== undefined) {
    if (reader.utf8() !== curve.identifier) throw new WireError("ecdsa curve mismatch")
    const point = reader.string()
    if (point[0] !== 4 || point.length !== 1 + curve.size * 2) throw new WireError("invalid ecdsa public point")
    return {
      jwk: {
        kty: "EC",
        crv: curve.namedCurve,
        x: Base64Url.encode(point.subarray(1, 1 + curve.size)),
        y: Base64Url.encode(point.subarray(1 + curve.size))
      },
      algorithm: { name: "ECDSA", namedCurve: curve.namedCurve },
      options: { name: "ECDSA", hash: curve.hash },
      signature: (raw) => ecdsaSshToP1363(raw, curve.size)
    }
  }
  const rsaHash = rsaSignatureHashes[algorithm]
  if (keyType === "ssh-rsa" && rsaHash !== undefined) {
    const e = stripLeadingZeros(reader.mpint())
    const n = stripLeadingZeros(reader.mpint())
    return {
      jwk: { kty: "RSA", e: Base64Url.encode(e), n: Base64Url.encode(n) },
      algorithm: { name: "RSASSA-PKCS1-v1_5", hash: rsaHash },
      options: { name: "RSASSA-PKCS1-v1_5" },
      // OpenSSH may strip leading zero bytes from RSA signatures.
      signature: (raw) => raw.length > n.length ? undefined : padStart(raw, n.length)
    }
  }
  throw new WireError(`unsupported public key algorithm ${algorithm}`)
}

/**
 * Signature operations backed by the `Crypto` service.
 *
 * @internal
 */
export class Signatures extends Context.Service<Signatures, {
  /**
   * Verifies an SSH signature blob (`string algorithm, string signature`)
   * against a public key blob. When `expectedAlgorithm` is provided, the
   * signature must use exactly that algorithm.
   */
  readonly verify: (options: {
    readonly publicKey: Uint8Array
    readonly signature: Uint8Array
    readonly data: Uint8Array
    readonly expectedAlgorithm?: string | undefined
  }) => Effect.Effect<boolean, SshError>
  /**
   * Computes the OpenSSH `SHA256:` fingerprint of a public key blob.
   */
  readonly fingerprint: (blob: Uint8Array) => Effect.Effect<string, SshError>
}>()("effect/ssh/internal/Signatures", {
  make: Effect.map(Crypto.Crypto, (crypto) => {
    const verify = Effect.fnUntraced(function*(options: {
      readonly publicKey: Uint8Array
      readonly signature: Uint8Array
      readonly data: Uint8Array
      readonly expectedAlgorithm?: string | undefined
    }) {
      const { algorithm, raw } = yield* trySync("malformed signature", () => {
        const reader = new Reader(options.signature)
        return { algorithm: reader.utf8(), raw: reader.string() }
      })
      if (options.expectedAlgorithm !== undefined && algorithm !== options.expectedAlgorithm) return false
      const plan = yield* trySync("malformed public key", () => verifyPlan(options.publicKey, algorithm))
      const signature = yield* trySync("malformed signature", () => plan.signature(raw))
      if (signature === undefined) return false
      const key = yield* Effect.mapError(
        crypto.importJwk(plan.jwk, plan.algorithm, { usages: ["verify"] }),
        protocolErrorFrom(`could not import ${algorithm} public key`)
      )
      return yield* Effect.mapError(
        crypto.verify(plan.options, key, signature, options.data),
        protocolErrorFrom(`could not verify ${algorithm} signature`)
      )
    })

    const fingerprint = (blob: Uint8Array): Effect.Effect<string, SshError> =>
      crypto.digest("SHA-256", blob).pipe(
        Effect.map((hash) => "SHA256:" + Base64.encode(hash).replace(/=+$/, "")),
        Effect.mapError(protocolErrorFrom("could not compute fingerprint"))
      )

    return { verify, fingerprint }
  })
}) {
  static readonly layer: Layer.Layer<Signatures, never, Crypto.Crypto> = Layer.effect(this)(this.make)
}
