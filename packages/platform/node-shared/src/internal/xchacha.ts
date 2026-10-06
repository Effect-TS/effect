/**
 * @internal
 */
import type * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as PlatformError from "effect/PlatformError"
import * as NodeCrypto from "node:crypto"

// HChaCha20 is the fixed-size nonce extension in
// https://www.ietf.org/archive/id/draft-irtf-cfrg-xchacha-03.html#section-2.2
// Message encryption and Poly1305 authentication stay in the native backend.
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

const perform = (decrypt: boolean, options: Crypto.XChaCha20Poly1305Options) =>
  Effect.try({
    try: () => {
      if (!NodeCrypto.getCiphers().includes("chacha20-poly1305")) {
        throw new Error("Native ChaCha20-Poly1305 is unavailable")
      }
      const key = hchacha20(options.key, options.nonce.subarray(0, 16))
      const iv = new Uint8Array(12)
      iv.set(options.nonce.subarray(16), 4)
      let prefix: Buffer | undefined
      let suffix: Buffer | undefined
      try {
        if (decrypt) {
          if (options.data.length < 16) throw new Error("Ciphertext must include a 16-byte authentication tag")
          const cipher = NodeCrypto.createDecipheriv("chacha20-poly1305", key, iv, { authTagLength: 16 })
          if (options.additionalData !== undefined) cipher.setAAD(options.additionalData)
          cipher.setAuthTag(options.data.subarray(options.data.length - 16))
          prefix = cipher.update(options.data.subarray(0, options.data.length - 16))
          suffix = cipher.final()
          return Uint8Array.from(Buffer.concat([prefix, suffix]))
        }
        const cipher = NodeCrypto.createCipheriv("chacha20-poly1305", key, iv, { authTagLength: 16 })
        if (options.additionalData !== undefined) cipher.setAAD(options.additionalData)
        return Uint8Array.from(Buffer.concat([cipher.update(options.data), cipher.final(), cipher.getAuthTag()]))
      } finally {
        key.fill(0)
        prefix?.fill(0)
        suffix?.fill(0)
      }
    },
    catch: (cause) =>
      PlatformError.systemError({
        module: "Crypto",
        method: decrypt ? "xchacha20poly1305Decrypt" : "xchacha20poly1305Encrypt",
        _tag: "Unknown",
        description: "Could not perform XChaCha20-Poly1305 operation",
        cause
      })
  })

export const encrypt: Crypto.Crypto["xchacha20poly1305Encrypt"] = (options) => perform(false, options)
export const decrypt: Crypto.Crypto["xchacha20poly1305Decrypt"] = (options) => perform(true, options)
