/**
 * SSH transport layer (RFC 4253): version exchange, binary packet protocol,
 * key exchange, re-keying, and ordered packet output.
 *
 * @internal
 */
import type { NonEmptyReadonlyArray } from "../../Array.ts"
import type * as EffectCrypto from "../../Crypto.ts"
import * as Deferred from "../../Deferred.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Latch from "../../Latch.ts"
import * as Queue from "../../Queue.ts"
import * as Result from "../../Result.ts"
import type * as Scope from "../../Scope.ts"
import * as Semaphore from "../../Semaphore.ts"
import * as Socket from "../../socket/Socket.ts"
import {
  SshConnectionError,
  SshDisconnectError,
  SshError,
  SshHostKeyError,
  SshNegotiationError,
  SshProtocolError
} from "../SshError.ts"
import * as SshKey from "../SshKey.ts"
import * as Constants from "./constants.ts"
import * as Crypto from "./crypto.ts"
import type { Bytes } from "./wire.ts"
import { equals, fromUtf8, Reader, utf8, WireError, Writer } from "./wire.ts"

/** @internal */
export interface AlgorithmPreferences {
  readonly kex: ReadonlyArray<string>
  readonly hostKey: ReadonlyArray<string>
  readonly cipher: ReadonlyArray<string>
  readonly mac: ReadonlyArray<string>
}

/** @internal */
export const defaultAlgorithms: AlgorithmPreferences = {
  kex: [
    "curve25519-sha256",
    "curve25519-sha256@libssh.org",
    "ecdh-sha2-nistp256",
    "ecdh-sha2-nistp384",
    "ecdh-sha2-nistp521"
  ],
  hostKey: [
    "ssh-ed25519",
    "ecdsa-sha2-nistp256",
    "ecdsa-sha2-nistp384",
    "ecdsa-sha2-nistp521",
    "rsa-sha2-512",
    "rsa-sha2-256"
  ],
  cipher: [
    "aes256-gcm@openssh.com",
    "aes128-gcm@openssh.com",
    "aes256-ctr",
    "aes128-ctr"
  ],
  mac: [
    "hmac-sha2-256-etm@openssh.com",
    "hmac-sha2-512-etm@openssh.com",
    "hmac-sha2-256",
    "hmac-sha2-512"
  ]
}

/** @internal */
export interface NegotiatedAlgorithms {
  readonly kex: string
  readonly hostKey: string
  readonly cipherClientToServer: string
  readonly cipherServerToClient: string
  readonly macClientToServer: string | undefined
  readonly macServerToClient: string | undefined
}

/** @internal */
export interface TransportOptions {
  readonly host: string
  readonly clientVersion: string
  readonly algorithms: AlgorithmPreferences
  readonly crypto: EffectCrypto.Crypto
  readonly verifyHostKey: (key: SshKey.PublicKey) => Effect.Effect<void, SshError>
  readonly rekeyBytes: number
  readonly rekeyInterval: Duration.Duration | undefined
}

/** @internal */
export interface Transport {
  readonly serverVersion: string
  readonly sessionId: Bytes
  readonly hostKey: SshKey.PublicKey
  readonly negotiated: () => NegotiatedAlgorithms
  readonly serverSignatureAlgorithms: () => ReadonlyArray<string> | undefined
  /**
   * Queues a payload and waits until it has been written to the socket.
   */
  readonly send: (payload: Uint8Array) => Effect.Effect<void, SshError>
  /**
   * Queues a payload without waiting. Payloads keep their relative order with
   * `send`.
   */
  readonly post: (payload: Uint8Array) => void
  /**
   * Reads the next non-transport message. Transport messages, including key
   * re-exchanges, are handled internally. Must only be called by one fiber at
   * a time.
   */
  readonly receive: Effect.Effect<Uint8Array, SshError>
  /**
   * Starts a client-initiated key re-exchange. Has no effect until
   * `enableRekey` has been called, because servers may reject re-keying
   * during user authentication.
   */
  readonly rekey: Effect.Effect<void, SshError>
  readonly enableRekey: () => void
  readonly failed: Effect.Effect<never, SshError>
  readonly fail: (error: SshError) => void
}

/** @internal */
export const protocolError = (description: string, cause?: unknown) =>
  new SshError({ reason: new SshProtocolError({ description, cause }) })

/** @internal */
export const trySync = <A>(f: () => A): Effect.Effect<A, SshError> =>
  Effect.try({
    try: f,
    catch: (cause) =>
      cause instanceof SshError
        ? cause
        : protocolError(cause instanceof WireError ? cause.message : "malformed message", cause)
  })

const connectionError = (cause: unknown) => new SshError({ reason: new SshConnectionError({ cause }) })

class ByteQueue {
  private chunks: Array<Uint8Array> = []
  private head = 0
  available = 0

  push(chunk: Uint8Array): void {
    if (chunk.length === 0) return
    this.chunks.push(chunk)
    this.available += chunk.length
  }

  take(size: number): Bytes {
    const out = new Uint8Array(size)
    let offset = 0
    while (offset < size) {
      const chunk = this.chunks[0]
      const count = Math.min(chunk.length - this.head, size - offset)
      out.set(chunk.subarray(this.head, this.head + count), offset)
      offset += count
      this.head += count
      if (this.head === chunk.length) {
        this.chunks.shift()
        this.head = 0
      }
    }
    this.available -= size
    return out
  }

  indexOf(byte: number): number {
    let position = 0
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i]
      const start = i === 0 ? this.head : 0
      for (let j = start; j < chunk.length; j++) {
        if (chunk[j] === byte) return position + (j - start)
      }
      position += chunk.length - start
    }
    return -1
  }
}

interface KexInit {
  readonly payload: Uint8Array
  readonly kex: ReadonlyArray<string>
  readonly hostKey: ReadonlyArray<string>
  readonly cipherClientToServer: ReadonlyArray<string>
  readonly cipherServerToClient: ReadonlyArray<string>
  readonly macClientToServer: ReadonlyArray<string>
  readonly macServerToClient: ReadonlyArray<string>
  readonly compressionClientToServer: ReadonlyArray<string>
  readonly compressionServerToClient: ReadonlyArray<string>
  readonly firstKexPacketFollows: boolean
}

const parseKexInit = (payload: Uint8Array): KexInit => {
  const reader = new Reader(payload, 17)
  const kex = reader.nameList()
  const hostKey = reader.nameList()
  const cipherClientToServer = reader.nameList()
  const cipherServerToClient = reader.nameList()
  const macClientToServer = reader.nameList()
  const macServerToClient = reader.nameList()
  const compressionClientToServer = reader.nameList()
  const compressionServerToClient = reader.nameList()
  reader.nameList()
  reader.nameList()
  const firstKexPacketFollows = reader.bool()
  return {
    payload,
    kex,
    hostKey,
    cipherClientToServer,
    cipherServerToClient,
    macClientToServer,
    macServerToClient,
    compressionClientToServer,
    compressionServerToClient,
    firstKexPacketFollows
  }
}

const choose = (
  algorithm: string,
  client: ReadonlyArray<string>,
  server: ReadonlyArray<string>
): Result.Result<string, SshError> => {
  for (const name of client) {
    if (server.includes(name)) return Result.succeed(name)
  }
  return Result.fail(
    new SshError({ reason: new SshNegotiationError({ algorithm, client: [...client], server: [...server] }) })
  )
}

const negotiate = (client: AlgorithmPreferences, server: KexInit): Result.Result<NegotiatedAlgorithms, SshError> =>
  Result.gen(function*() {
    const kex = yield* choose("key exchange", client.kex, server.kex)
    const hostKey = yield* choose("host key", client.hostKey, server.hostKey)
    const cipherClientToServer = yield* choose("cipher", client.cipher, server.cipherClientToServer)
    const cipherServerToClient = yield* choose("cipher", client.cipher, server.cipherServerToClient)
    const macClientToServer = Crypto.cipherAlgorithms[cipherClientToServer].mode === "gcm"
      ? undefined
      : yield* choose("MAC", client.mac, server.macClientToServer)
    const macServerToClient = Crypto.cipherAlgorithms[cipherServerToClient].mode === "gcm"
      ? undefined
      : yield* choose("MAC", client.mac, server.macServerToClient)
    yield* choose("compression", ["none"], server.compressionClientToServer)
    yield* choose("compression", ["none"], server.compressionServerToClient)
    return { kex, hostKey, cipherClientToServer, cipherServerToClient, macClientToServer, macServerToClient }
  })

const STRICT_KEX_CLIENT = "kex-strict-c-v00@openssh.com"
const STRICT_KEX_SERVER = "kex-strict-s-v00@openssh.com"
const EXT_INFO_CLIENT = "ext-info-c"

/** @internal */
export const make = Effect.fnUntraced(function*(
  socket: Socket.Socket,
  options: TransportOptions
): Effect.fn.Return<Transport, SshError, Scope.Scope> {
  const scope = yield* Effect.scope
  const pull = yield* Socket.readerBytes(socket).pipe(Effect.mapError(connectionError))
  const socketWriter = yield* socket.writer

  const inbox = new ByteQueue()
  const fill = (size: number): Effect.Effect<void, SshError> =>
    inbox.available >= size ? Effect.void : Effect.flatMap(
      Effect.mapError(pull, connectionError),
      (chunks) => {
        for (let i = 0; i < chunks.length; i++) inbox.push(chunks[i])
        return fill(size)
      }
    )

  const writeSocket = (chunks: NonEmptyReadonlyArray<Uint8Array>) =>
    Effect.mapError(socketWriter.writeAll(chunks), connectionError)

  // ---------------------------------------------------------------------------
  // Failure tracking
  // ---------------------------------------------------------------------------

  const failure = Deferred.makeUnsafe<never, SshError>()
  let failedWith: SshError | undefined
  const fail = (error: SshError): void => {
    if (failedWith !== undefined) return
    failedWith = error
    Deferred.doneUnsafe(failure, Effect.fail(error))
  }
  const failOnError = <A, R>(effect: Effect.Effect<A, SshError, R>): Effect.Effect<A, SshError, R> =>
    Effect.tapError(effect, (error) => Effect.sync(() => fail(error)))

  // ---------------------------------------------------------------------------
  // Version exchange
  // ---------------------------------------------------------------------------

  yield* writeSocket([utf8(options.clientVersion + "\r\n")])
  let serverVersion: string | undefined
  for (let lines = 0; serverVersion === undefined; lines++) {
    if (lines > 1024) return yield* protocolError("too many lines before the SSH version")
    let newline = inbox.indexOf(0x0a)
    while (newline === -1) {
      if (inbox.available > 8192) return yield* protocolError("SSH version line too long")
      yield* fill(inbox.available + 1)
      newline = inbox.indexOf(0x0a)
    }
    const line = fromUtf8(inbox.take(newline + 1)).replace(/\r?\n$/, "")
    if (line.startsWith("SSH-")) serverVersion = line
  }
  if (!serverVersion.startsWith("SSH-2.0-") && !serverVersion.startsWith("SSH-1.99-")) {
    return yield* protocolError(`unsupported protocol version: ${serverVersion}`)
  }
  const clientVersion = options.clientVersion

  // ---------------------------------------------------------------------------
  // Packet I/O
  // ---------------------------------------------------------------------------

  const crypto = options.crypto
  let sealer: Crypto.Sealer = Crypto.noneSealer(crypto)
  let opener: Crypto.Opener = Crypto.noneOpener
  let sendSequence = 0
  let receiveSequence = 0
  let bytesSinceKex = 0

  const readPacket: Effect.Effect<Uint8Array, SshError> = Effect.gen(function*() {
    const current = opener
    yield* fill(current.headerLength)
    const header = inbox.take(current.headerLength)
    const remaining = yield* current.begin(header)
    yield* fill(remaining)
    const rest = inbox.take(remaining)
    const sequence = receiveSequence
    receiveSequence = (receiveSequence + 1) >>> 0
    const payload = yield* current.finish(sequence, header, rest)
    bytesSinceKex += header.length + rest.length
    if (payload.length === 0) return yield* protocolError("empty packet")
    return payload
  })

  // Outgoing packets are serialized by `lock`. While a key exchange is in
  // progress, only key exchange packets may be written, so the outbox is
  // gated until NEWKEYS has been sent.
  const lock = Semaphore.makeUnsafe(1)
  const gate = Latch.makeUnsafe(true)
  let kexInProgress = false

  const writeUnlocked = Effect.fnUntraced(function*(payloads: NonEmptyReadonlyArray<Uint8Array>) {
    const wires: Array<Uint8Array> = []
    for (const payload of payloads) {
      const sequence = sendSequence
      sendSequence = (sendSequence + 1) >>> 0
      const current = sealer
      const wire = yield* current.seal(sequence, payload)
      bytesSinceKex += wire.length
      wires.push(wire)
    }
    yield* writeSocket(wires as unknown as NonEmptyReadonlyArray<Uint8Array>)
  })

  const writeKex = (payload: Uint8Array) => lock.withPermit(writeUnlocked([payload]))

  interface OutboxEntry {
    readonly payload: Uint8Array
    readonly done: Deferred.Deferred<void, SshError> | undefined
  }
  const outbox = yield* Queue.unbounded<OutboxEntry>()

  const writerLoop = Effect.gen(function*() {
    while (true) {
      const entries = yield* Queue.takeAll(outbox)
      let index = 0
      while (index < entries.length) {
        yield* gate.await
        const next = yield* lock.withPermit(Effect.suspend(() => {
          if (kexInProgress) return Effect.succeed(index)
          const batch = entries.slice(index).map((entry) => entry.payload)
          return Effect.as(
            writeUnlocked(batch as unknown as NonEmptyReadonlyArray<Uint8Array>),
            entries.length
          )
        }))
        for (let i = index; i < next; i++) {
          const done = entries[i].done
          if (done !== undefined) Deferred.doneUnsafe(done, Effect.void)
        }
        index = next
        yield* maybeRekey
      }
    }
  }).pipe(failOnError)

  const send = (payload: Uint8Array): Effect.Effect<void, SshError> =>
    Effect.suspend(() => {
      if (failedWith !== undefined) return Effect.fail(failedWith)
      const done = Deferred.makeUnsafe<void, SshError>()
      Queue.offerUnsafe(outbox, { payload, done })
      return Effect.raceFirst(Deferred.await(done), Deferred.await(failure))
    })

  const post = (payload: Uint8Array): void => {
    if (failedWith !== undefined) return
    Queue.offerUnsafe(outbox, { payload, done: undefined })
  }

  // ---------------------------------------------------------------------------
  // Key exchange
  // ---------------------------------------------------------------------------

  let firstKex = true
  let strictKex = false
  let ourKexInit: Bytes | undefined
  let sessionId: Bytes | undefined
  let hostKey: SshKey.PublicKey | undefined
  let negotiated: NegotiatedAlgorithms | undefined
  let serverSignatureAlgorithms: ReadonlyArray<string> | undefined

  const buildKexInit = (cookie: Uint8Array): Bytes => {
    const kex = firstKex ? [...options.algorithms.kex, EXT_INFO_CLIENT, STRICT_KEX_CLIENT] : options.algorithms.kex
    return new Writer(512)
      .byte(Constants.MSG_KEXINIT)
      .raw(cookie)
      .nameList(kex)
      .nameList(options.algorithms.hostKey)
      .nameList(options.algorithms.cipher)
      .nameList(options.algorithms.cipher)
      .nameList(options.algorithms.mac)
      .nameList(options.algorithms.mac)
      .nameList(["none"])
      .nameList(["none"])
      .nameList([])
      .nameList([])
      .bool(false)
      .uint32(0)
      .finish()
  }

  const startKex: Effect.Effect<void, SshError> = lock.withPermit(Effect.gen(function*() {
    if (kexInProgress) return
    const cookie = yield* Effect.mapError(crypto.randomBytes(16), Crypto.cryptoError("could not generate cookie"))
    kexInProgress = true
    gate.closeUnsafe()
    const payload = buildKexInit(cookie)
    ourKexInit = payload
    yield* writeUnlocked([payload])
  }))

  let rekeyEnabled = false
  const rekey: Effect.Effect<void, SshError> = Effect.suspend(() => rekeyEnabled ? startKex : Effect.void)
  const maybeRekey: Effect.Effect<void, SshError> = Effect.suspend(() =>
    rekeyEnabled && !kexInProgress && bytesSinceKex >= options.rekeyBytes ? startKex : Effect.void
  )

  const readKexMessage = Effect.fnUntraced(function*(expected: number) {
    while (true) {
      const payload = yield* readPacket
      const type = payload[0]
      if (type === expected) return payload
      if (type === Constants.MSG_DISCONNECT) return yield* disconnected(payload)
      if (
        !(strictKex && firstKex) &&
        (type === Constants.MSG_IGNORE || type === Constants.MSG_DEBUG || type === Constants.MSG_UNIMPLEMENTED)
      ) {
        continue
      }
      return yield* protocolError(`unexpected message ${type} during key exchange`)
    }
  })

  const runKex = Effect.fnUntraced(function*(serverPayload: Uint8Array) {
    yield* startKex
    const clientPayload = ourKexInit!
    const server = yield* trySync(() => parseKexInit(serverPayload))
    const algorithms = yield* Effect.fromResult(negotiate(options.algorithms, server))
    if (firstKex) {
      strictKex = server.kex.includes(STRICT_KEX_SERVER)
      if (strictKex && receiveSequence !== 1) {
        return yield* protocolError("strict key exchange violation: KEXINIT was not the first packet")
      }
    }
    if (
      server.firstKexPacketFollows &&
      (server.kex[0] !== algorithms.kex || server.hostKey[0] !== algorithms.hostKey)
    ) {
      yield* readPacket
    }

    const method = Crypto.kexMethods[algorithms.kex]
    const pair = yield* Crypto.generateKeyAgreement(crypto, method)
    yield* writeKex(new Writer().byte(Constants.MSG_KEX_ECDH_INIT).string(pair.publicKey).finish())

    const reply = yield* readKexMessage(Constants.MSG_KEX_ECDH_REPLY)
    const { hostKeyBlob, serverPublic, signature } = yield* trySync(() => {
      const reader = new Reader(reply, 1)
      return { hostKeyBlob: reader.string(), serverPublic: reader.string(), signature: reader.string() }
    })
    const sharedSecret = yield* pair.agree(serverPublic)
    const exchangeHash = yield* Crypto.digest(
      crypto,
      method.hash,
      new Writer(2048)
        .string(clientVersion)
        .string(serverVersion)
        .string(clientPayload)
        .string(serverPayload)
        .string(hostKeyBlob)
        .string(pair.publicKey)
        .string(serverPublic)
        .mpint(sharedSecret)
        .finish()
    )

    const serverKey = yield* Effect.fromResult(SshKey.fromBlob(hostKeyBlob))
    const hostKeyError = (kind: SshHostKeyError["kind"]) =>
      Effect.flatMap(Crypto.fingerprintSha256(crypto, serverKey.blob), (fingerprint) =>
        Effect.fail(
          new SshError({
            reason: new SshHostKeyError({ kind, host: options.host, keyType: serverKey.type, fingerprint })
          })
        ))
    const valid = yield* Crypto.verifySignature(crypto, {
      publicKey: hostKeyBlob,
      signature,
      data: exchangeHash,
      expectedAlgorithm: algorithms.hostKey
    })
    if (!valid) return yield* hostKeyError("InvalidSignature")
    if (firstKex) {
      yield* options.verifyHostKey(serverKey)
      sessionId = exchangeHash
      hostKey = serverKey
    } else if (!equals(hostKey!.blob, serverKey.blob)) {
      return yield* hostKeyError("Changed")
    }

    const derive = (letter: string, length: number) =>
      Crypto.deriveKey(crypto, method.hash, sharedSecret, exchangeHash, letter, sessionId!, length)
    const directionKeys = Effect.fnUntraced(function*(
      cipherName: string,
      macName: string | undefined,
      letters: readonly [iv: string, key: string, mac: string]
    ) {
      const cipher = Crypto.cipherAlgorithms[cipherName]
      const mac = macName === undefined ? undefined : Crypto.macAlgorithms[macName]
      return {
        cipher,
        mac,
        iv: yield* derive(letters[0], cipher.ivLength),
        key: yield* derive(letters[1], cipher.keyLength),
        macKey: mac === undefined ? undefined : yield* derive(letters[2], mac.keyLength)
      } satisfies Crypto.DirectionKeys
    })
    const outgoingKeys = yield* directionKeys(algorithms.cipherClientToServer, algorithms.macClientToServer, [
      "A",
      "C",
      "E"
    ])
    const incomingKeys = yield* directionKeys(algorithms.cipherServerToClient, algorithms.macServerToClient, [
      "B",
      "D",
      "F"
    ])
    const nextSealer = yield* Crypto.makeSealer(crypto, outgoingKeys)
    const nextOpener = yield* Crypto.makeOpener(crypto, incomingKeys)

    yield* lock.withPermit(Effect.gen(function*() {
      yield* writeUnlocked([new Uint8Array([Constants.MSG_NEWKEYS])])
      sealer = nextSealer
      if (strictKex) sendSequence = 0
      ourKexInit = undefined
      bytesSinceKex = 0
      kexInProgress = false
      gate.openUnsafe()
    }))

    yield* readKexMessage(Constants.MSG_NEWKEYS)
    opener = nextOpener
    if (strictKex) receiveSequence = 0
    negotiated = algorithms
    firstKex = false
  })

  const disconnected = (payload: Uint8Array) =>
    Effect.flatMap(
      trySync(() => {
        const reader = new Reader(payload, 1)
        return { code: reader.uint32(), description: reader.utf8() }
      }),
      ({ code, description }) => Effect.fail(new SshError({ reason: new SshDisconnectError({ code, description }) }))
    )

  const handleExtInfo = (payload: Uint8Array) =>
    trySync(() => {
      const reader = new Reader(payload, 1)
      const count = reader.uint32()
      for (let i = 0; i < count; i++) {
        const name = reader.utf8()
        const value = reader.string()
        if (name === "server-sig-algs") {
          serverSignatureAlgorithms = fromUtf8(value).split(",")
        }
      }
    })

  const receive: Effect.Effect<Uint8Array, SshError> = Effect.gen(function*() {
    if (failedWith !== undefined) return yield* failedWith
    while (true) {
      const payload = yield* readPacket
      const type = payload[0]
      switch (type) {
        case Constants.MSG_DISCONNECT:
          return yield* disconnected(payload)
        case Constants.MSG_IGNORE:
        case Constants.MSG_DEBUG:
        case Constants.MSG_UNIMPLEMENTED:
          continue
        case Constants.MSG_KEXINIT:
          yield* runKex(payload)
          continue
        case Constants.MSG_EXT_INFO:
          yield* handleExtInfo(payload)
          continue
      }
      if (type >= Constants.MSG_KEXINIT && type < Constants.MSG_USERAUTH_REQUEST) {
        return yield* protocolError(`unexpected key exchange message ${type}`)
      }
      yield* maybeRekey
      return payload
    }
  }).pipe(failOnError)

  // ---------------------------------------------------------------------------
  // Initial key exchange
  // ---------------------------------------------------------------------------

  yield* Effect.forkIn(writerLoop, scope)

  yield* startKex
  const firstPacket = yield* failOnError(readPacket)
  if (firstPacket[0] !== Constants.MSG_KEXINIT) {
    if (firstPacket[0] === Constants.MSG_DISCONNECT) return yield* disconnected(firstPacket)
    return yield* protocolError(`expected KEXINIT, received message ${firstPacket[0]}`)
  }
  yield* failOnError(runKex(firstPacket))

  if (options.rekeyInterval !== undefined) {
    const interval = options.rekeyInterval
    yield* Effect.forkIn(
      Effect.forever(Effect.andThen(Effect.sleep(interval), rekey)).pipe(Effect.ignore),
      scope
    )
  }

  // Send a disconnect on shutdown, bypassing the outbox gate since transport
  // messages are permitted during a key exchange. Registered after the writer
  // fiber is forked so that it runs before the writer is interrupted.
  yield* Effect.addFinalizer(() =>
    failedWith !== undefined ? Effect.void : writeKex(
      new Writer()
        .byte(Constants.MSG_DISCONNECT)
        .uint32(Constants.DISCONNECT_BY_APPLICATION)
        .string("closed by client")
        .string("")
        .finish()
    ).pipe(
      Effect.timeout(Duration.seconds(1)),
      Effect.ignore
    )
  )

  return {
    serverVersion,
    sessionId: sessionId!,
    hostKey: hostKey!,
    negotiated: () => negotiated!,
    serverSignatureAlgorithms: () => serverSignatureAlgorithms,
    send,
    post,
    receive,
    rekey,
    enableRekey: () => {
      rekeyEnabled = true
    },
    failed: Deferred.await(failure),
    fail
  }
})
