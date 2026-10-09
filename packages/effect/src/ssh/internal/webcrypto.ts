/**
 * WebCrypto primitives that the `Crypto` service does not provide yet: the
 * X25519 / ECDH key agreement used by SSH key exchange and the AES-CTR
 * keystream used by the `aes*-ctr` ciphers. Everything else goes through
 * `Crypto`.
 *
 * @internal
 */
import * as Effect from "../../Effect.ts"
import { SshError, SshProtocolError } from "../SshError.ts"
import type { Bytes } from "./wire.ts"
import { copy } from "./wire.ts"

const subtle = (): SubtleCrypto => {
  const subtle = globalThis.crypto?.subtle
  if (subtle === undefined) throw new Error("globalThis.crypto.subtle is not available")
  return subtle
}

const attempt = <A>(description: string, f: () => Promise<A>): Effect.Effect<A, SshError> =>
  Effect.tryPromise({
    try: f,
    catch: (cause) => new SshError({ reason: new SshProtocolError({ description, cause }) })
  })

/** @internal */
export interface KeyAgreement {
  readonly publicKey: Bytes
  /**
   * Computes the shared secret as an unsigned big-endian magnitude.
   */
  readonly agree: (peerPublicKey: Uint8Array) => Effect.Effect<Bytes, SshError>
}

/** @internal */
export const x25519: Effect.Effect<KeyAgreement, SshError> = attempt("curve25519 key generation failed", async () => {
  const pair = await subtle().generateKey({ name: "X25519" }, true, ["deriveBits"]) as CryptoKeyPair
  return {
    publicKey: new Uint8Array(await subtle().exportKey("raw", pair.publicKey)),
    agree: (peer: Uint8Array) =>
      attempt("curve25519 key agreement failed", async () => {
        if (peer.length !== 32) throw new Error("invalid curve25519 public key length")
        const peerKey = await subtle().importKey("raw", copy(peer), { name: "X25519" }, false, [])
        const secret = new Uint8Array(
          await subtle().deriveBits({ name: "X25519", public: peerKey }, pair.privateKey, 256)
        )
        let nonZero = 0
        for (let i = 0; i < secret.length; i++) nonZero |= secret[i]
        if (nonZero === 0) throw new Error("curve25519 shared secret is zero")
        return secret
      })
  }
})

const ecdhBits: Record<string, number> = { "P-256": 256, "P-384": 384, "P-521": 528 }

/** @internal */
export const ecdh = (namedCurve: "P-256" | "P-384" | "P-521"): Effect.Effect<KeyAgreement, SshError> =>
  attempt("ECDH key generation failed", async () => {
    const pair = await subtle().generateKey({ name: "ECDH", namedCurve }, true, ["deriveBits"]) as CryptoKeyPair
    return {
      publicKey: new Uint8Array(await subtle().exportKey("raw", pair.publicKey)),
      agree: (peer: Uint8Array) =>
        attempt("ECDH key agreement failed", async () => {
          const peerKey = await subtle().importKey("raw", copy(peer), { name: "ECDH", namedCurve }, false, [])
          return new Uint8Array(
            await subtle().deriveBits({ name: "ECDH", public: peerKey }, pair.privateKey, ecdhBits[namedCurve])
          )
        })
    }
  })

const addCounter = (counter: Bytes, blocks: number): void => {
  let carry = blocks
  for (let i = counter.length - 1; i >= 0 && carry > 0; i--) {
    const sum = counter[i] + (carry & 0xff)
    counter[i] = sum & 0xff
    carry = Math.floor(carry / 256) + (sum >> 8)
  }
}

/**
 * Creates a stateful AES-CTR keystream: each call continues the counter where
 * the previous one stopped.
 *
 * @internal
 */
export const aesCtr = (
  key: Bytes,
  iv: Bytes
): Effect.Effect<(data: Bytes) => Effect.Effect<Bytes, SshError>, SshError> =>
  attempt("AES-CTR key import failed", async () => {
    const cryptoKey = await subtle().importKey("raw", key, { name: "AES-CTR" }, false, ["encrypt"])
    const counter = new Uint8Array(iv)
    return (data: Bytes) => {
      if (data.length === 0) return Effect.succeed(data)
      const current = new Uint8Array(counter)
      addCounter(counter, Math.ceil(data.length / 16))
      return attempt(
        "AES-CTR encryption failed",
        async () =>
          new Uint8Array(await subtle().encrypt({ name: "AES-CTR", counter: current, length: 128 }, cryptoKey, data))
      )
    }
  })
