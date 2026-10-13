/**
 * @internal
 */
import type * as Aead from "effect/crypto/Aead"
import * as CryptoError from "effect/crypto/CryptoError"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as NodeCrypto from "node:crypto"

// HChaCha20 is the fixed-size nonce extension in
// https://www.ietf.org/archive/id/draft-irtf-cfrg-xchacha-03.html#section-2.2
// Message encryption and Poly1305 authentication stay in the native backend.
/** @internal */
export const hchacha20 = (key: Uint8Array, nonce: Uint8Array): Uint8Array => {
  const state = new Uint32Array(16)
  state.set([0x61707865, 0x3320646e, 0x79622d32, 0x6b206574])
  const keyView = new DataView(key.buffer, key.byteOffset, key.byteLength)
  const nonceView = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength)
  for (let i = 0; i < 8; i++) state[4 + i] = keyView.getUint32(i * 4, true)
  for (let i = 0; i < 4; i++) state[12 + i] = nonceView.getUint32(i * 4, true)
  const rotate = (value: number, bits: number): number => (value << bits) | (value >>> (32 - bits))
  const quarter = (a: number, b: number, c: number, d: number): void => {
    state[a] += state[b]
    state[d] = rotate(state[d] ^ state[a], 16)
    state[c] += state[d]
    state[b] = rotate(state[b] ^ state[c], 12)
    state[a] += state[b]
    state[d] = rotate(state[d] ^ state[a], 8)
    state[c] += state[d]
    state[b] = rotate(state[b] ^ state[c], 7)
  }
  for (let round = 0; round < 10; round++) {
    quarter(0, 4, 8, 12)
    quarter(1, 5, 9, 13)
    quarter(2, 6, 10, 14)
    quarter(3, 7, 11, 15)
    quarter(0, 5, 10, 15)
    quarter(1, 6, 11, 12)
    quarter(2, 7, 8, 13)
    quarter(3, 4, 9, 14)
  }
  const output = new Uint8Array(32)
  const view = new DataView(output.buffer)
  for (let i = 0; i < 4; i++) {
    view.setUint32(i * 4, state[i], true)
    view.setUint32((i + 4) * 4, state[i + 12], true)
  }
  state.fill(0)
  return output
}

// Copies into a fresh array so no plaintext lands in Node's shared Buffer pool.
const concat = (parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  const output = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

const makeAead = (label: string, nonceLength: 12 | 24): Aead.Aead => {
  const fail = (method: string, reason: CryptoError.CryptoErrorReason) =>
    Effect.fail(new CryptoError.CryptoError({ algorithm: label, method, reason }))

  const cipher = (method: "encrypt" | "decrypt") => ({ additionalData, data, key, nonce }: Aead.Options) => {
    if (nonce.length !== nonceLength) {
      return fail(
        method,
        new CryptoError.BadArgument({ description: `${label} nonce must contain exactly ${nonceLength} bytes` })
      )
    }
    const material = Redacted.value(key)
    if (material.length !== 32) {
      return fail(method, new CryptoError.InvalidKey({ description: `${label} keys must contain exactly 32 bytes` }))
    }
    if (method === "decrypt" && data.length < 16) {
      return fail(method, new CryptoError.AuthenticationFailed({ description: "Ciphertext is shorter than the tag" }))
    }
    return Effect.try({
      try: () => {
        // XChaCha20 derives a subkey from the first 16 nonce bytes and
        // encrypts with the remaining 8, zero-padded to a 12-byte nonce.
        const subkey = nonceLength === 24 ? hchacha20(material, nonce.subarray(0, 16)) : undefined
        let iv = nonce
        if (subkey !== undefined) {
          iv = new Uint8Array(12)
          iv.set(nonce.subarray(16), 4)
        }
        let prefix: Buffer | undefined
        let suffix: Buffer | undefined
        try {
          if (method === "decrypt") {
            const decipher = NodeCrypto.createDecipheriv("chacha20-poly1305", subkey ?? material, iv, {
              authTagLength: 16
            })
            if (additionalData !== undefined) decipher.setAAD(additionalData)
            decipher.setAuthTag(data.subarray(data.length - 16))
            prefix = decipher.update(data.subarray(0, data.length - 16))
            try {
              suffix = decipher.final()
            } catch (cause) {
              // `final` throws only when the tag does not match.
              throw new CryptoError.CryptoError({
                algorithm: label,
                method,
                reason: new CryptoError.AuthenticationFailed({ description: "Could not authenticate data", cause })
              })
            }
            return concat([prefix, suffix])
          }
          const encipher = NodeCrypto.createCipheriv("chacha20-poly1305", subkey ?? material, iv, { authTagLength: 16 })
          if (additionalData !== undefined) encipher.setAAD(additionalData)
          return concat([encipher.update(data), encipher.final(), encipher.getAuthTag()])
        } finally {
          subkey?.fill(0)
          prefix?.fill(0)
          suffix?.fill(0)
        }
      },
      catch: (cause) =>
        CryptoError.isCryptoError(cause) ? cause : new CryptoError.CryptoError({
          algorithm: label,
          method,
          reason: new CryptoError.Unknown({ description: `Could not perform ${method}`, cause })
        })
    })
  }

  return {
    generateKey: () => Effect.sync(() => Redacted.make(NodeCrypto.randomFillSync(new Uint8Array(32)))),
    encrypt: cipher("encrypt"),
    decrypt: cipher("decrypt")
  }
}

/** @internal */
export const makeChaCha20Poly1305 = (): Aead.Aead => makeAead("ChaCha20-Poly1305", 12)

/** @internal */
export const makeXChaCha20Poly1305 = (): Aead.Aead => makeAead("XChaCha20-Poly1305", 24)
