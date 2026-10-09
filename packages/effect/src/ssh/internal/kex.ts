/**
 * SSH key exchange (RFC 4253 §7–8, RFC 5656, RFC 8731): the supported
 * methods, ephemeral key agreement through the `Crypto` service, and session
 * key derivation.
 *
 * @internal
 */
import type * as Crypto from "../../Crypto.ts"
import * as Effect from "../../Effect.ts"
import type { SshError } from "../SshError.ts"
import { protocolErrorFrom } from "./errors.ts"
import { concat, utf8, Writer } from "./wire.ts"

/** @internal */
export interface KeyAgreement {
  readonly publicKey: Uint8Array
  /**
   * Computes the shared secret as an unsigned big-endian magnitude.
   */
  readonly agree: (peerPublicKey: Uint8Array) => Effect.Effect<Uint8Array, SshError>
}

/** @internal */
export interface KexMethod {
  readonly name: string
  readonly hash: Crypto.HmacAlgorithm
  readonly algorithm: { readonly name: "X25519" } | { readonly name: "ECDH"; readonly namedCurve: Crypto.NamedCurve }
}

/**
 * Generates an ephemeral key pair for a key exchange method. The public key
 * and the peer's public key travel as raw bytes (RFC 8731, RFC 5656).
 *
 * @internal
 */
export const generateKeyAgreement = Effect.fnUntraced(function*(crypto: Crypto.Crypto, method: KexMethod) {
  const { algorithm } = method
  const pair = yield* Effect.mapError(
    crypto.generateKeyPair(algorithm),
    protocolErrorFrom(`${method.name} key generation failed`)
  )
  const publicKey = yield* Effect.mapError(
    crypto.exportKey("raw", pair.publicKey),
    protocolErrorFrom(`${method.name} key generation failed`)
  )
  return {
    publicKey,
    agree: (peer) =>
      crypto.importKey("raw", peer, algorithm).pipe(
        Effect.flatMap((peerKey) => crypto.deriveSharedSecret(pair.privateKey, peerKey)),
        Effect.mapError(protocolErrorFrom(`${method.name} key agreement failed`))
      )
  } satisfies KeyAgreement
})

const curve25519 = (name: string): KexMethod => ({ name, hash: "SHA-256", algorithm: { name: "X25519" } })

const ecdh = (name: string, namedCurve: Crypto.NamedCurve, hash: Crypto.HmacAlgorithm): KexMethod => ({
  name,
  hash,
  algorithm: { name: "ECDH", namedCurve }
})

/** @internal */
export const kexMethods: Record<string, KexMethod> = {
  "curve25519-sha256": curve25519("curve25519-sha256"),
  "curve25519-sha256@libssh.org": curve25519("curve25519-sha256@libssh.org"),
  "ecdh-sha2-nistp256": ecdh("ecdh-sha2-nistp256", "P-256", "SHA-256"),
  "ecdh-sha2-nistp384": ecdh("ecdh-sha2-nistp384", "P-384", "SHA-384"),
  "ecdh-sha2-nistp521": ecdh("ecdh-sha2-nistp521", "P-521", "SHA-512")
}

/**
 * Derives session key material (RFC 4253 §7.2).
 *
 * @internal
 */
export const deriveKey = Effect.fnUntraced(function*(
  crypto: Crypto.Crypto,
  hash: Crypto.HmacAlgorithm,
  sharedSecret: Uint8Array,
  exchangeHash: Uint8Array,
  letter: string,
  sessionId: Uint8Array,
  length: number
) {
  const k = new Writer().mpint(sharedSecret).finish()
  const hashOf = (data: Uint8Array) =>
    Effect.mapError(crypto.digest(hash, data), protocolErrorFrom("key derivation failed"))
  let out = yield* hashOf(concat([k, exchangeHash, utf8(letter), sessionId]))
  while (out.length < length) {
    out = concat([out, yield* hashOf(concat([k, exchangeHash, out]))])
  }
  return out.subarray(0, length)
})
