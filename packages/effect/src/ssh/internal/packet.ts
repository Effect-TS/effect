/**
 * The SSH binary packet protocol (RFC 4253 §6) and OpenSSH's variants:
 * padding, sequence numbers, MAC-then-encrypt and encrypt-then-MAC with
 * AES-CTR, and AES-GCM framing (RFC 5647), all on top of the `Crypto` service.
 *
 * @internal
 */
import * as Context from "../../Context.ts"
import * as Crypto from "../../Crypto.ts"
import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import type { SshError } from "../SshError.ts"
import { protocolError, protocolErrorFrom } from "./errors.ts"
import type { Bytes } from "./wire.ts"
import { concat, copy } from "./wire.ts"

/** @internal */
export interface CipherAlgorithm {
  readonly name: string
  readonly keyLength: number
  readonly ivLength: number
  readonly blockSize: number
  readonly mode: "gcm" | "ctr"
}

/** @internal */
export const cipherAlgorithms: Record<string, CipherAlgorithm> = {
  "aes256-gcm@openssh.com": { name: "aes256-gcm@openssh.com", keyLength: 32, ivLength: 12, blockSize: 16, mode: "gcm" },
  "aes128-gcm@openssh.com": { name: "aes128-gcm@openssh.com", keyLength: 16, ivLength: 12, blockSize: 16, mode: "gcm" },
  "aes256-ctr": { name: "aes256-ctr", keyLength: 32, ivLength: 16, blockSize: 16, mode: "ctr" },
  "aes128-ctr": { name: "aes128-ctr", keyLength: 16, ivLength: 16, blockSize: 16, mode: "ctr" }
}

/** @internal */
export interface MacAlgorithm {
  readonly name: string
  readonly hash: Crypto.HmacAlgorithm
  readonly keyLength: number
  readonly etm: boolean
}

/** @internal */
export const macAlgorithms: Record<string, MacAlgorithm> = {
  "hmac-sha2-256-etm@openssh.com": { name: "hmac-sha2-256-etm@openssh.com", hash: "SHA-256", keyLength: 32, etm: true },
  "hmac-sha2-512-etm@openssh.com": { name: "hmac-sha2-512-etm@openssh.com", hash: "SHA-512", keyLength: 64, etm: true },
  "hmac-sha2-256": { name: "hmac-sha2-256", hash: "SHA-256", keyLength: 32, etm: false },
  "hmac-sha2-512": { name: "hmac-sha2-512", hash: "SHA-512", keyLength: 64, etm: false }
}

/** @internal */
export const MAX_PACKET_LENGTH = 256 * 1024

/**
 * Seals outgoing payloads into complete wire packets.
 *
 * @internal
 */
export interface Sealer {
  readonly seal: (sequence: number, payload: Uint8Array) => Effect.Effect<Bytes, SshError>
}

/**
 * Opens incoming packets in two phases: `headerLength` bytes are read and
 * passed to `begin`, which returns the number of remaining bytes; those are
 * then passed to `finish`, which returns the payload.
 *
 * @internal
 */
export interface Opener {
  readonly headerLength: number
  readonly begin: (header: Bytes) => Effect.Effect<number, SshError>
  readonly finish: (sequence: number, header: Bytes, rest: Bytes) => Effect.Effect<Uint8Array, SshError>
}

const macFailure = () => protocolError("message authentication failed")

const paddingFor = (unpaddedLength: number, blockSize: number): number => {
  let padding = blockSize - (unpaddedLength % blockSize)
  if (padding < 4) padding += blockSize
  return padding
}

const sequenceBytes = (sequence: number): Bytes => {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, sequence >>> 0)
  return out
}

const readLength = (bytes: Uint8Array): number =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0)

const checkPacketLength = (length: number, blockSize: number, aligned: number): Effect.Effect<void, SshError> =>
  length < 5 || length > MAX_PACKET_LENGTH || aligned % blockSize !== 0
    ? Effect.fail(protocolError(`invalid packet length ${length}`))
    : Effect.void

const extractPayload = (body: Uint8Array): Effect.Effect<Uint8Array, SshError> => {
  const padding = body[0]
  if (padding < 4 || padding + 1 > body.length) return Effect.fail(protocolError("invalid packet padding"))
  return Effect.succeed(body.subarray(1, body.length - padding))
}

/** @internal */
export const noneOpener: Opener = {
  headerLength: 4,
  begin: (header) => {
    const length = readLength(header)
    return Effect.as(checkPacketLength(length, 1, length), length)
  },
  finish: (_sequence, _header, rest) => extractPayload(rest)
}

const incrementGcmIv = (iv: Bytes): void => {
  // The final 8 bytes form a big-endian invocation counter.
  for (let i = iv.length - 1; i >= 4; i--) {
    iv[i] = (iv[i] + 1) & 0xff
    if (iv[i] !== 0) break
  }
}

/** @internal */
export interface DirectionKeys {
  readonly cipher: CipherAlgorithm
  readonly mac: MacAlgorithm | undefined
  readonly key: Uint8Array
  readonly iv: Uint8Array
  readonly macKey: Uint8Array | undefined
}

const addCounter = (counter: Bytes, blocks: number): void => {
  let carry = blocks
  for (let i = counter.length - 1; i >= 0 && carry > 0; i--) {
    const sum = counter[i] + (carry & 0xff)
    counter[i] = sum & 0xff
    carry = Math.floor(carry / 256) + (sum >> 8)
  }
}

/**
 * Packet sealing and opening backed by the `Crypto` service.
 *
 * @internal
 */
export class Packet extends Context.Service<Packet, {
  /**
   * Seals packets before the first key exchange completes.
   */
  readonly noneSealer: Sealer
  readonly makeSealer: (keys: DirectionKeys) => Effect.Effect<Sealer, SshError>
  readonly makeOpener: (keys: DirectionKeys) => Effect.Effect<Opener, SshError>
}>()("effect/ssh/internal/Packet", {
  make: Effect.map(Crypto.Crypto, (crypto) => {
    /**
     * Builds `padding_length || payload || padding`, optionally aligning the
     * packet length field with the cipher blocks.
     */
    const buildPlaintext = Effect.fnUntraced(function*(
      payload: Uint8Array,
      blockSize: number,
      lengthAligned: boolean
    ) {
      const padding = paddingFor(lengthAligned ? 5 + payload.length : 1 + payload.length, blockSize)
      const random = yield* Effect.mapError(
        crypto.randomBytes(padding),
        protocolErrorFrom("could not generate padding")
      )
      const body = new Uint8Array(1 + payload.length + padding)
      body[0] = padding
      body.set(payload, 1)
      body.set(random, 1 + payload.length)
      const lengthBytes = new Uint8Array(4)
      new DataView(lengthBytes.buffer).setUint32(0, body.length)
      return { lengthBytes, body }
    })

    const noneSealer: Sealer = {
      seal: (_sequence, payload) =>
        Effect.map(buildPlaintext(payload, 8, true), ({ body, lengthBytes }) => concat([lengthBytes, body]))
    }

    /**
     * Creates a stateful AES-CTR keystream: each call continues the 128-bit
     * counter where the previous one stopped.
     */
    const aesCtr = Effect.fnUntraced(function*(keyBytes: Uint8Array, iv: Uint8Array) {
      const key = yield* Effect.mapError(
        crypto.importKey("raw", keyBytes, { name: "AES-CTR", length: keyBytes.length * 8 as 128 | 256 }, {
          usages: ["encrypt"]
        }),
        protocolErrorFrom("could not import AES-CTR key")
      )
      const counter = copy(iv)
      return (data: Uint8Array): Effect.Effect<Uint8Array, SshError> => {
        if (data.length === 0) return Effect.succeed(data)
        const current = copy(counter)
        addCounter(counter, Math.ceil(data.length / 16))
        return Effect.mapError(
          crypto.encrypt({ name: "AES-CTR", counter: current, length: 128 }, key, data),
          protocolErrorFrom("AES-CTR encryption failed")
        )
      }
    })

    const importGcm = (key: Uint8Array, usage: Crypto.KeyUsage) =>
      Effect.mapError(
        crypto.importKey("raw", key, { name: "AES-GCM", length: key.length * 8 as 128 | 256 }, { usages: [usage] }),
        protocolErrorFrom("could not import AES-GCM key")
      )

    const importMac = (mac: MacAlgorithm, key: Uint8Array) =>
      Effect.mapError(
        crypto.importKey("raw", key, { name: "HMAC", hash: mac.hash, length: key.length * 8 }, {
          usages: ["sign", "verify"]
        }),
        protocolErrorFrom("could not import MAC key")
      )

    const makeSealer = Effect.fnUntraced(function*(keys: DirectionKeys) {
      const blockSize = keys.cipher.blockSize
      if (keys.cipher.mode === "gcm") {
        const key = yield* importGcm(keys.key, "encrypt")
        const iv = copy(keys.iv)
        return {
          seal: Effect.fnUntraced(function*(_sequence: number, payload: Uint8Array) {
            const { body, lengthBytes } = yield* buildPlaintext(payload, blockSize, false)
            const encrypted = yield* Effect.mapError(
              crypto.encrypt({ name: "AES-GCM", iv: copy(iv), additionalData: lengthBytes }, key, body),
              protocolErrorFrom("AES-GCM encryption failed")
            )
            incrementGcmIv(iv)
            return concat([lengthBytes, encrypted])
          })
        } satisfies Sealer
      }
      const mac = keys.mac!
      const ctr = yield* aesCtr(keys.key, keys.iv)
      const macKey = yield* importMac(mac, keys.macKey!)
      const sign = (data: Uint8Array) =>
        Effect.mapError(crypto.sign({ name: "HMAC" }, macKey, data), protocolErrorFrom("MAC computation failed"))
      if (mac.etm) {
        return {
          seal: Effect.fnUntraced(function*(sequence: number, payload: Uint8Array) {
            const { body, lengthBytes } = yield* buildPlaintext(payload, blockSize, false)
            const encrypted = yield* ctr(body)
            const tag = yield* sign(concat([sequenceBytes(sequence), lengthBytes, encrypted]))
            return concat([lengthBytes, encrypted, tag])
          })
        } satisfies Sealer
      }
      return {
        seal: Effect.fnUntraced(function*(sequence: number, payload: Uint8Array) {
          const { body, lengthBytes } = yield* buildPlaintext(payload, blockSize, true)
          const plain = concat([lengthBytes, body])
          const tag = yield* sign(concat([sequenceBytes(sequence), plain]))
          return concat([yield* ctr(plain), tag])
        })
      } satisfies Sealer
    })

    const makeOpener = Effect.fnUntraced(function*(keys: DirectionKeys) {
      const blockSize = keys.cipher.blockSize
      if (keys.cipher.mode === "gcm") {
        const key = yield* importGcm(keys.key, "decrypt")
        const iv = copy(keys.iv)
        return {
          headerLength: 4,
          begin: (header) => {
            const length = readLength(header)
            return Effect.as(checkPacketLength(length, blockSize, length), length + 16)
          },
          finish: (_sequence, header, rest) =>
            crypto.decrypt({ name: "AES-GCM", iv: copy(iv), additionalData: header }, key, rest).pipe(
              Effect.mapError(macFailure),
              Effect.flatMap((plain) => {
                incrementGcmIv(iv)
                return extractPayload(plain)
              })
            )
        } satisfies Opener
      }
      const mac = keys.mac!
      const macLength = mac.keyLength
      const ctr = yield* aesCtr(keys.key, keys.iv)
      const macKey = yield* importMac(mac, keys.macKey!)
      const verify = (tag: Uint8Array, data: Uint8Array) =>
        crypto.verify({ name: "HMAC" }, macKey, tag, data).pipe(
          Effect.mapError(protocolErrorFrom("MAC verification failed")),
          Effect.flatMap((valid) => valid ? Effect.void : Effect.fail(macFailure()))
        )
      if (mac.etm) {
        return {
          headerLength: 4,
          begin: (header) => {
            const length = readLength(header)
            return Effect.as(checkPacketLength(length, blockSize, length), length + macLength)
          },
          finish: Effect.fnUntraced(function*(sequence: number, header: Bytes, rest: Bytes) {
            const encrypted = rest.subarray(0, rest.length - macLength)
            yield* verify(rest.subarray(rest.length - macLength), concat([sequenceBytes(sequence), header, encrypted]))
            return yield* extractPayload(yield* ctr(encrypted))
          })
        } satisfies Opener
      }
      let firstBlock: Uint8Array | undefined
      return {
        headerLength: blockSize,
        begin: Effect.fnUntraced(function*(header: Bytes) {
          firstBlock = yield* ctr(header)
          const length = readLength(firstBlock)
          yield* checkPacketLength(length, blockSize, length + 4)
          return length + 4 - blockSize + macLength
        }),
        finish: Effect.fnUntraced(function*(sequence: number, _header: Bytes, rest: Bytes) {
          const plain = concat([firstBlock!, yield* ctr(rest.subarray(0, rest.length - macLength))])
          firstBlock = undefined
          yield* verify(rest.subarray(rest.length - macLength), concat([sequenceBytes(sequence), plain]))
          return yield* extractPayload(plain.subarray(4))
        })
      } satisfies Opener
    })

    return { noneSealer, makeSealer, makeOpener }
  })
}) {
  static readonly layer: Layer.Layer<Packet, never, Crypto.Crypto> = Layer.effect(this)(this.make)
}
