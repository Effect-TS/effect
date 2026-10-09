/**
 * A minimal in-memory SSH server used to exercise the client without an
 * external `sshd`. It implements the server side of the transport, user
 * authentication, and connection protocols closely enough to test the
 * client's behaviour, including failure paths that real servers rarely
 * produce on demand.
 */
import type * as Cause from "effect/Cause"
import * as EffectCrypto from "effect/Crypto"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Latch from "effect/Latch"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Socket from "effect/socket/Socket"
import * as Constants from "effect/ssh/internal/constants"
import * as Crypto from "effect/ssh/internal/crypto"
import type { Bytes } from "effect/ssh/internal/wire"
import { concat, equals, fromUtf8, Reader, utf8, Writer } from "effect/ssh/internal/wire"
import * as SshKey from "effect/ssh/SshKey"
import * as Stream from "effect/Stream"

// -----------------------------------------------------------------------------
// In-memory socket pair
// -----------------------------------------------------------------------------

export interface Pipe {
  readonly clientSocket: Socket.Socket
  readonly toServer: Queue.Queue<Uint8Array, Cause.Done>
  readonly toClient: Queue.Queue<Uint8Array, Cause.Done>
}

export const makePipe = Effect.gen(function*() {
  const toServer = yield* Queue.unbounded<Uint8Array, Cause.Done>()
  const toClient = yield* Queue.unbounded<Uint8Array, Cause.Done>()
  const closed = () => new Socket.SocketError({ reason: new Socket.SocketCloseError({ code: 1000 }) })
  const clientSocket = Socket.make({
    reader: Effect.gen(function*() {
      yield* Effect.addFinalizer(() => Queue.end(toServer))
      return {
        pull: Queue.takeAll(toClient).pipe(
          Effect.catchCause(() => Effect.fail(closed()))
        ),
        upgrade: Socket.SocketUpgradeError.unsupported
      }
    }),
    writer: Effect.succeed({
      write: (chunk) =>
        Socket.isCloseEvent(chunk) ? Effect.asVoid(Queue.end(toServer)) : Effect.asVoid(
          Queue.offer(toServer, typeof chunk === "string" ? utf8(chunk) : chunk)
        ),
      writeAll: (chunks) =>
        Effect.asVoid(Queue.offerAll(toServer, chunks.map((chunk) => typeof chunk === "string" ? utf8(chunk) : chunk)))
    })
  })
  return { clientSocket, toServer, toClient } satisfies Pipe
})

// -----------------------------------------------------------------------------
// Server
// -----------------------------------------------------------------------------

export interface ServerChannel {
  readonly id: number
  readonly type: string
  readonly extra: Reader
  readonly requests: Array<{ readonly type: string; readonly data: Uint8Array }>
  readonly input: Queue.Queue<Uint8Array, Cause.Done>
  readonly write: (data: Uint8Array | string) => Effect.Effect<void>
  readonly writeStderr: (data: Uint8Array | string) => Effect.Effect<void>
  readonly request: (type: string, data?: Uint8Array) => Effect.Effect<void>
  readonly exit: (code: number) => Effect.Effect<void>
  readonly eof: Effect.Effect<void>
  readonly close: Effect.Effect<void>
  readonly signals: Queue.Queue<string>
}

export interface ServerOptions {
  readonly hostKey: SshKey.PrivateKey
  readonly hostKeyAlgorithm?: string
  readonly kex?: ReadonlyArray<string>
  readonly ciphers?: ReadonlyArray<string>
  readonly macs?: ReadonlyArray<string>
  readonly strictKex?: boolean
  readonly extInfo?: boolean
  readonly bannerLines?: ReadonlyArray<string>
  readonly userauthBanner?: string
  readonly username?: string
  /** Groups of methods that must all succeed (multi-factor). */
  readonly methods?: ReadonlyArray<ReadonlyArray<string>>
  readonly password?: string
  readonly publicKeys?: ReadonlyArray<SshKey.PublicKey>
  readonly keyboardInteractive?: {
    readonly prompts: ReadonlyArray<{ readonly prompt: string; readonly echo: boolean }>
    readonly answers: ReadonlyArray<string>
  }
  readonly windowSize?: number
  readonly maxPacketSize?: number
  readonly answerKeepAlive?: boolean
  readonly onSession?: (
    channel: ServerChannel,
    start: { readonly type: string; readonly value: string }
  ) => Effect.Effect<void>
  readonly onChannel?: (channel: ServerChannel) => Effect.Effect<boolean>
}

export interface TestServer {
  readonly authenticated: Deferred.Deferred<string>
  readonly attempts: Array<string>
  readonly globalRequests: Array<string>
  readonly kexCount: () => number
  readonly rekey: Effect.Effect<void>
  readonly disconnect: (code: number, description: string) => Effect.Effect<void>
  readonly send: (payload: Uint8Array) => Effect.Effect<void>
  readonly openChannel: (type: string, data: Uint8Array) => Effect.Effect<ServerChannel>
  readonly forwards: Array<{ readonly address: string; readonly port: number }>
}

const defaultCiphers = ["aes256-gcm@openssh.com", "aes128-gcm@openssh.com", "aes256-ctr", "aes128-ctr"]
const defaultMacs = [
  "hmac-sha2-256-etm@openssh.com",
  "hmac-sha2-512-etm@openssh.com",
  "hmac-sha2-256",
  "hmac-sha2-512"
]
const defaultKex = [
  "curve25519-sha256",
  "curve25519-sha256@libssh.org",
  "ecdh-sha2-nistp256",
  "ecdh-sha2-nistp384",
  "ecdh-sha2-nistp521"
]

class ProtocolFailure extends Error {}

export const make = Effect.fnUntraced(function*(pipe: Pipe, options: ServerOptions) {
  const scope = yield* Effect.scope
  const crypto = yield* EffectCrypto.Crypto
  const hostKey = options.hostKey
  const hostKeyAlgorithm = options.hostKeyAlgorithm ?? SshKey.signatureAlgorithms(hostKey.type)[0]
  const kexAlgorithms = options.kex ?? defaultKex
  const ciphers = options.ciphers ?? defaultCiphers
  const macs = options.macs ?? defaultMacs
  const windowSize = options.windowSize ?? 64 * 1024
  const maxPacketSize = options.maxPacketSize ?? 16 * 1024

  // Byte input -----------------------------------------------------------------
  let buffer: Uint8Array = new Uint8Array(0)
  const fill = (size: number): Effect.Effect<void, Cause.Done> =>
    buffer.length >= size ? Effect.void : Effect.flatMap(Queue.takeAll(pipe.toServer), (chunks) => {
      buffer = concat([buffer, ...chunks])
      return fill(size)
    })
  const take = (size: number) => {
    const out = buffer.slice(0, size)
    buffer = buffer.subarray(size)
    return out
  }

  // Packet I/O -----------------------------------------------------------------
  let sealer: Crypto.Sealer = Crypto.noneSealer(crypto)
  let opener: Crypto.Opener = Crypto.noneOpener
  let sendSequence = 0
  let receiveSequence = 0
  const lock = Semaphore.makeUnsafe(1)
  const gate = Latch.makeUnsafe(true)
  let kexInProgress = false

  const writeRaw = (payload: Uint8Array) =>
    Effect.gen(function*() {
      const sequence = sendSequence
      sendSequence = (sendSequence + 1) >>> 0
      const current = sealer
      const wire = yield* Effect.orDie(current.seal(sequence, payload))
      yield* Queue.offer(pipe.toClient, wire)
    })

  const send = (payload: Uint8Array): Effect.Effect<void> =>
    Effect.gen(function*() {
      while (true) {
        yield* gate.await
        const sent = yield* lock.withPermit(
          Effect.suspend(() => kexInProgress ? Effect.succeed(false) : Effect.as(writeRaw(payload), true))
        )
        if (sent) return
      }
    })

  const readPacket = Effect.gen(function*() {
    const current = opener
    yield* fill(current.headerLength)
    const header = take(current.headerLength)
    const remaining = yield* Effect.orDie(current.begin(header))
    yield* fill(remaining)
    const rest = take(remaining)
    const sequence = receiveSequence
    receiveSequence = (receiveSequence + 1) >>> 0
    return yield* Effect.orDie(current.finish(sequence, header, rest))
  })

  // Version exchange ------------------------------------------------------------
  const serverVersion = "SSH-2.0-EffectTestServer_1.0"
  for (const line of options.bannerLines ?? []) yield* Queue.offer(pipe.toClient, utf8(line + "\r\n"))
  yield* Queue.offer(pipe.toClient, utf8(serverVersion + "\r\n"))
  let clientVersion = ""
  while (true) {
    yield* fill(1)
    const newline = buffer.indexOf(0x0a)
    if (newline === -1) {
      yield* fill(buffer.length + 1)
      continue
    }
    clientVersion = fromUtf8(take(newline + 1)).replace(/\r?\n$/, "")
    break
  }

  // Key exchange ----------------------------------------------------------------
  let sessionId: Bytes | undefined
  let firstKex = true
  let strict = false
  let ourKexInit: Uint8Array | undefined
  let kexCount = 0
  let clientWantsExtInfo = false

  const buildKexInit = () =>
    new Writer()
      .byte(Constants.MSG_KEXINIT)
      .raw(globalThis.crypto.getRandomValues(new Uint8Array(16)))
      .nameList(
        firstKex && options.strictKex !== false ? [...kexAlgorithms, "kex-strict-s-v00@openssh.com"] : kexAlgorithms
      )
      .nameList([hostKeyAlgorithm])
      .nameList(ciphers)
      .nameList(ciphers)
      .nameList(macs)
      .nameList(macs)
      .nameList(["none"])
      .nameList(["none"])
      .nameList([])
      .nameList([])
      .bool(false)
      .uint32(0)
      .finish()

  const startKex = lock.withPermit(Effect.suspend(() => {
    if (kexInProgress) return Effect.void
    kexInProgress = true
    gate.closeUnsafe()
    ourKexInit = buildKexInit()
    return writeRaw(ourKexInit)
  }))

  const choose = (client: ReadonlyArray<string>, server: ReadonlyArray<string>) => {
    const found = client.find((name) => server.includes(name))
    if (found === undefined) throw new ProtocolFailure("no common algorithm")
    return found
  }

  const readExpect = (type: number) =>
    Effect.gen(function*() {
      while (true) {
        const payload = yield* readPacket
        if (payload[0] === type) return payload
        if (payload[0] === Constants.MSG_IGNORE || payload[0] === Constants.MSG_DEBUG) continue
        return yield* Effect.die(new ProtocolFailure(`expected ${type}, got ${payload[0]}`))
      }
    })

  const runKex = (clientKexInit: Uint8Array) =>
    Effect.gen(function*() {
      yield* startKex
      const serverKexInit = ourKexInit!
      const reader = new Reader(clientKexInit, 17)
      const clientKex = reader.nameList()
      const clientHostKey = reader.nameList()
      const clientCipherCS = reader.nameList()
      const clientCipherSC = reader.nameList()
      const clientMacCS = reader.nameList()
      const clientMacSC = reader.nameList()
      if (firstKex) {
        strict = options.strictKex !== false && clientKex.includes("kex-strict-c-v00@openssh.com")
        clientWantsExtInfo = clientKex.includes("ext-info-c")
      }
      const kexName = choose(clientKex, kexAlgorithms)
      choose(clientHostKey, [hostKeyAlgorithm])
      const cipherCS = choose(clientCipherCS, ciphers)
      const cipherSC = choose(clientCipherSC, ciphers)
      const macCS = Crypto.cipherAlgorithms[cipherCS].mode === "gcm" ? undefined : choose(clientMacCS, macs)
      const macSC = Crypto.cipherAlgorithms[cipherSC].mode === "gcm" ? undefined : choose(clientMacSC, macs)

      const init = yield* readExpect(Constants.MSG_KEX_ECDH_INIT)
      const clientPublic = new Reader(init, 1).string()
      const method = Crypto.kexMethods[kexName]
      const pair = yield* Effect.orDie(Crypto.generateKeyAgreement(crypto, method))
      const secret = yield* Effect.orDie(pair.agree(clientPublic))
      const exchangeHash = yield* Effect.orDie(
        Crypto.digest(
          crypto,
          method.hash,
          new Writer()
            .string(clientVersion)
            .string(serverVersion)
            .string(clientKexInit)
            .string(serverKexInit)
            .string(hostKey.publicKey.blob)
            .string(clientPublic)
            .string(pair.publicKey)
            .mpint(secret)
            .finish()
        )
      )
      if (sessionId === undefined) sessionId = exchangeHash
      const signature = yield* Effect.orDie(hostKey.sign(exchangeHash, hostKeyAlgorithm))
      const derive = (letter: string, length: number) =>
        Effect.orDie(Crypto.deriveKey(crypto, method.hash, secret, exchangeHash, letter, sessionId!, length))
      const keys = (cipherName: string, macName: string | undefined, letters: readonly [string, string, string]) =>
        Effect.gen(function*() {
          const cipher = Crypto.cipherAlgorithms[cipherName]
          const mac = macName === undefined ? undefined : Crypto.macAlgorithms[macName]
          return {
            cipher,
            mac,
            iv: yield* derive(letters[0], cipher.ivLength),
            key: yield* derive(letters[1], cipher.keyLength),
            macKey: mac === undefined ? undefined : yield* derive(letters[2], mac.keyLength)
          }
        })
      const outgoing = yield* keys(cipherSC, macSC, ["B", "D", "F"])
      const incoming = yield* keys(cipherCS, macCS, ["A", "C", "E"])
      const nextSealer = yield* Effect.orDie(Crypto.makeSealer(crypto, outgoing))
      const nextOpener = yield* Effect.orDie(Crypto.makeOpener(crypto, incoming))

      yield* lock.withPermit(Effect.gen(function*() {
        yield* writeRaw(
          new Writer()
            .byte(Constants.MSG_KEX_ECDH_REPLY)
            .string(hostKey.publicKey.blob)
            .string(pair.publicKey)
            .string(signature)
            .finish()
        )
        yield* writeRaw(new Uint8Array([Constants.MSG_NEWKEYS]))
        sealer = nextSealer
        if (strict) sendSequence = 0
        if (firstKex && clientWantsExtInfo && options.extInfo !== false) {
          yield* writeRaw(
            new Writer()
              .byte(Constants.MSG_EXT_INFO)
              .uint32(1)
              .string("server-sig-algs")
              .string(
                "ssh-ed25519,ecdsa-sha2-nistp256,ecdsa-sha2-nistp384,ecdsa-sha2-nistp521,rsa-sha2-512,rsa-sha2-256"
              )
              .finish()
          )
        }
        kexInProgress = false
        ourKexInit = undefined
        gate.openUnsafe()
      }))
      yield* readExpect(Constants.MSG_NEWKEYS)
      opener = nextOpener
      if (strict) receiveSequence = 0
      firstKex = false
      kexCount++
    })

  // Message loop -----------------------------------------------------------------
  const authenticated = Deferred.makeUnsafe<string>()
  const attempts: Array<string> = []
  const globalRequests: Array<string> = []
  const forwards: Array<{ address: string; port: number }> = []
  const channels = new Map<number, {
    channel: ServerChannel
    remoteId: number
    remoteWindow: number
    remoteMaxPacket: number
    windowLatch: Latch.Latch
    localWindow: number
    closed: boolean
    opened?: Deferred.Deferred<void>
  }>()
  let nextChannelId = 0
  const pendingMethods = (options.methods ?? [["publickey"], ["password"], ["keyboard-interactive"]]).map((group) => [
    ...group
  ])
  let satisfied: Array<string> = []
  let kbdState: "idle" | "waiting" = "idle"

  const allowedMethods = () => {
    const remaining = new Set<string>()
    for (const group of pendingMethods) {
      if (satisfied.every((method) => group.includes(method))) {
        for (const method of group) if (!satisfied.includes(method)) remaining.add(method)
      }
    }
    return [...remaining]
  }

  const authOutcome = (method: string, ok: boolean) =>
    Effect.gen(function*() {
      if (ok) {
        satisfied = [...satisfied, method]
        const complete = pendingMethods.some((group) => group.every((m) => satisfied.includes(m)))
        if (complete) {
          yield* send(new Uint8Array([Constants.MSG_USERAUTH_SUCCESS]))
          Deferred.doneUnsafe(authenticated, Effect.succeed(method))
          return
        }
        yield* send(new Writer().byte(Constants.MSG_USERAUTH_FAILURE).nameList(allowedMethods()).bool(true).finish())
        return
      }
      yield* send(new Writer().byte(Constants.MSG_USERAUTH_FAILURE).nameList(allowedMethods()).bool(false).finish())
    })

  const handleAuth = (payload: Uint8Array) =>
    Effect.gen(function*() {
      if (payload[0] === Constants.MSG_USERAUTH_INFO_RESPONSE && kbdState === "waiting") {
        kbdState = "idle"
        const reader = new Reader(payload, 1)
        const count = reader.uint32()
        const answers: Array<string> = []
        for (let i = 0; i < count; i++) answers.push(reader.utf8())
        const expected = options.keyboardInteractive?.answers ?? []
        return yield* authOutcome(
          "keyboard-interactive",
          answers.length === expected.length && answers.every((answer, i) => answer === expected[i])
        )
      }
      const reader = new Reader(payload, 1)
      const username = reader.utf8()
      reader.utf8()
      const method = reader.utf8()
      attempts.push(method)
      if (options.userauthBanner !== undefined && attempts.length === 1) {
        yield* send(new Writer().byte(Constants.MSG_USERAUTH_BANNER).string(options.userauthBanner).string("").finish())
      }
      const userOk = options.username === undefined || options.username === username
      if (!allowedMethods().includes(method) || !userOk) return yield* authOutcome(method, false)
      switch (method) {
        case "password": {
          reader.bool()
          return yield* authOutcome("password", reader.utf8() === options.password)
        }
        case "publickey": {
          const signed = reader.bool()
          const algorithm = reader.utf8()
          const blob = reader.string()
          const known = (options.publicKeys ?? []).find((key) => equals(key.blob, blob))
          if (known === undefined) return yield* authOutcome("publickey", false)
          if (!signed) {
            return yield* send(
              new Writer().byte(Constants.MSG_USERAUTH_PK_OK).string(algorithm).string(blob).finish()
            )
          }
          const signature = reader.string()
          const data = new Writer()
            .string(sessionId!)
            .raw(payload.subarray(0, payload.length - signature.length - 4))
            .finish()
          const valid = yield* Effect.orDie(SshKey.verify(known, data, signature))
          return yield* authOutcome("publickey", valid)
        }
        case "keyboard-interactive": {
          const prompts = options.keyboardInteractive?.prompts ?? []
          const writer = new Writer()
            .byte(Constants.MSG_USERAUTH_INFO_REQUEST)
            .string("test")
            .string("answer the prompts")
            .string("")
            .uint32(prompts.length)
          for (const prompt of prompts) writer.string(prompt.prompt).bool(prompt.echo)
          kbdState = "waiting"
          return yield* send(writer.finish())
        }
        default:
          return yield* authOutcome(method, false)
      }
    })

  const makeServerChannel = (
    id: number,
    type: string,
    extra: Reader
  ) =>
    Effect.gen(function*() {
      const input = yield* Queue.unbounded<Uint8Array, Cause.Done>()
      const signals = yield* Queue.unbounded<string>()
      const write = (data: Uint8Array | string, extended?: number) =>
        Effect.gen(function*() {
          let bytes = typeof data === "string" ? utf8(data) : data
          while (bytes.length > 0) {
            const state = channels.get(id)
            if (state === undefined || state.closed) return
            if (state.remoteWindow === 0) {
              state.windowLatch.closeUnsafe()
              yield* state.windowLatch.await
              continue
            }
            const size = Math.min(bytes.length, state.remoteWindow, state.remoteMaxPacket)
            state.remoteWindow -= size
            const writer = new Writer()
            if (extended === undefined) {
              writer.byte(Constants.MSG_CHANNEL_DATA).uint32(state.remoteId)
            } else {
              writer.byte(Constants.MSG_CHANNEL_EXTENDED_DATA).uint32(state.remoteId).uint32(extended)
            }
            yield* send(writer.string(bytes.subarray(0, size)).finish())
            bytes = bytes.subarray(size)
          }
        })
      const remote = () => channels.get(id)?.remoteId ?? 0
      const channel: ServerChannel = {
        id,
        type,
        extra,
        requests: [],
        input,
        signals,
        write: (data) => write(data),
        writeStderr: (data) => write(data, 1),
        request: (requestType, data) =>
          send(
            new Writer()
              .byte(Constants.MSG_CHANNEL_REQUEST)
              .uint32(remote())
              .string(requestType)
              .bool(false)
              .raw(data ?? new Uint8Array(0))
              .finish()
          ),
        exit: (code) =>
          send(
            new Writer().byte(Constants.MSG_CHANNEL_REQUEST).uint32(remote()).string("exit-status").bool(false).uint32(
              code
            ).finish()
          ),
        eof: Effect.suspend(() => send(new Writer().byte(Constants.MSG_CHANNEL_EOF).uint32(remote()).finish())),
        close: Effect.suspend(() => {
          const state = channels.get(id)
          if (state === undefined || state.closed) return Effect.void
          state.closed = true
          state.windowLatch.openUnsafe()
          return send(new Writer().byte(Constants.MSG_CHANNEL_CLOSE).uint32(state.remoteId).finish())
        })
      }
      return channel
    })

  const forkHandler = (effect: Effect.Effect<void>) => Effect.forkIn(effect, scope)

  const handleSessionRequest = (state: NonNullable<ReturnType<typeof channels.get>>, payload: Uint8Array) =>
    Effect.gen(function*() {
      const reader = new Reader(payload, 5)
      const type = reader.utf8()
      const wantReply = reader.bool()
      const data = reader.rest()
      state.channel.requests.push({ type, data })
      const reply = (ok: boolean) =>
        wantReply
          ? send(
            new Writer().byte(ok ? Constants.MSG_CHANNEL_SUCCESS : Constants.MSG_CHANNEL_FAILURE).uint32(
              state.remoteId
            ).finish()
          )
          : Effect.void
      switch (type) {
        case "exec":
        case "subsystem":
        case "shell": {
          const value = type === "shell" ? "" : new Reader(data).utf8()
          yield* reply(true)
          if (options.onSession !== undefined) {
            yield* forkHandler(options.onSession(state.channel, { type, value }))
          }
          return
        }
        case "signal": {
          yield* Queue.offer(state.channel.signals, new Reader(data).utf8())
          return yield* reply(true)
        }
        case "pty-req":
        case "env":
        case "window-change":
        case "auth-agent-req@openssh.com":
          return yield* reply(true)
        default:
          return yield* reply(false)
      }
    })

  const handleConnection = (payload: Uint8Array) =>
    Effect.gen(function*() {
      const reader = new Reader(payload, 1)
      switch (payload[0]) {
        case Constants.MSG_GLOBAL_REQUEST: {
          const name = reader.utf8()
          const wantReply = reader.bool()
          globalRequests.push(name)
          if (name === "keepalive@openssh.com" && options.answerKeepAlive === false) return
          if (name === "tcpip-forward") {
            const address = reader.utf8()
            let port = reader.uint32()
            if (port === 0) port = 40000 + forwards.length
            forwards.push({ address, port })
            if (wantReply) {
              yield* send(new Writer().byte(Constants.MSG_REQUEST_SUCCESS).uint32(port).finish())
            }
            return
          }
          if (name === "cancel-tcpip-forward") {
            if (wantReply) yield* send(new Uint8Array([Constants.MSG_REQUEST_SUCCESS]))
            return
          }
          if (wantReply) yield* send(new Uint8Array([Constants.MSG_REQUEST_FAILURE]))
          return
        }
        case Constants.MSG_CHANNEL_OPEN: {
          const type = reader.utf8()
          const senderId = reader.uint32()
          const window = reader.uint32()
          const maxPacket = reader.uint32()
          const id = nextChannelId++
          const channel = yield* makeServerChannel(id, type, reader)
          const state = {
            channel,
            remoteId: senderId,
            remoteWindow: window,
            remoteMaxPacket: maxPacket,
            windowLatch: Latch.makeUnsafe(false),
            localWindow: windowSize,
            closed: false
          }
          const accept = type === "session" || (options.onChannel !== undefined && (yield* options.onChannel(channel)))
          if (!accept) {
            return yield* send(
              new Writer()
                .byte(Constants.MSG_CHANNEL_OPEN_FAILURE)
                .uint32(senderId)
                .uint32(Constants.OPEN_ADMINISTRATIVELY_PROHIBITED)
                .string("rejected by test server")
                .string("")
                .finish()
            )
          }
          channels.set(id, state)
          yield* send(
            new Writer()
              .byte(Constants.MSG_CHANNEL_OPEN_CONFIRMATION)
              .uint32(senderId)
              .uint32(id)
              .uint32(windowSize)
              .uint32(maxPacketSize)
              .finish()
          )
          if (type === "direct-tcpip" || type === "direct-streamlocal@openssh.com") {
            // Echo everything back, then close once the client sends EOF.
            yield* forkHandler(Effect.gen(function*() {
              yield* Stream.runForEach(Stream.fromQueue(channel.input), (chunk) => channel.write(chunk))
              yield* channel.eof
              yield* channel.close
            }))
          }
          return
        }
        case Constants.MSG_CHANNEL_OPEN_CONFIRMATION: {
          const state = channels.get(reader.uint32())
          if (state === undefined) return
          state.remoteId = reader.uint32()
          state.remoteWindow = reader.uint32()
          state.remoteMaxPacket = reader.uint32()
          if (state.opened !== undefined) Deferred.doneUnsafe(state.opened, Effect.void)
          return
        }
        case Constants.MSG_CHANNEL_WINDOW_ADJUST: {
          const state = channels.get(reader.uint32())
          if (state === undefined) return
          state.remoteWindow += reader.uint32()
          state.windowLatch.openUnsafe()
          return
        }
        case Constants.MSG_CHANNEL_DATA: {
          const state = channels.get(reader.uint32())
          if (state === undefined) return
          const data = reader.string()
          state.localWindow -= data.length
          if (state.localWindow < 0) return yield* Effect.die(new ProtocolFailure("client exceeded window"))
          yield* Queue.offer(state.channel.input, data)
          // Consumed immediately: return window space right away.
          if (state.localWindow < windowSize / 2) {
            const adjust = windowSize - state.localWindow
            state.localWindow = windowSize
            yield* send(
              new Writer().byte(Constants.MSG_CHANNEL_WINDOW_ADJUST).uint32(state.remoteId).uint32(adjust).finish()
            )
          }
          return
        }
        case Constants.MSG_CHANNEL_EOF: {
          const state = channels.get(reader.uint32())
          if (state !== undefined) yield* Queue.end(state.channel.input)
          return
        }
        case Constants.MSG_CHANNEL_CLOSE: {
          const id = reader.uint32()
          const state = channels.get(id)
          if (state === undefined) return
          yield* Queue.end(state.channel.input)
          yield* state.channel.close
          channels.delete(id)
          return
        }
        case Constants.MSG_CHANNEL_REQUEST: {
          const state = channels.get(reader.uint32())
          if (state !== undefined) yield* handleSessionRequest(state, payload)
          return
        }
      }
    })

  const loop = Effect.gen(function*() {
    while (true) {
      const payload = yield* readPacket
      switch (payload[0]) {
        case Constants.MSG_KEXINIT:
          yield* runKex(payload)
          continue
        case Constants.MSG_IGNORE:
        case Constants.MSG_DEBUG:
        case Constants.MSG_UNIMPLEMENTED:
        case Constants.MSG_REQUEST_FAILURE:
        case Constants.MSG_REQUEST_SUCCESS:
          continue
        case Constants.MSG_DISCONNECT:
          return
        case Constants.MSG_SERVICE_REQUEST: {
          const name = new Reader(payload, 1).utf8()
          yield* send(new Writer().byte(Constants.MSG_SERVICE_ACCEPT).string(name).finish())
          continue
        }
      }
      if (payload[0] >= 50 && payload[0] < 80) {
        yield* handleAuth(payload)
      } else {
        yield* handleConnection(payload)
      }
    }
  }).pipe(Effect.catchCause(() => Effect.void))

  // The initial key exchange starts as soon as the client's KEXINIT arrives.
  yield* startKex
  yield* Effect.forkIn(loop, scope)

  const server: TestServer = {
    authenticated,
    attempts,
    globalRequests,
    forwards,
    kexCount: () => kexCount,
    rekey: startKex,
    disconnect: (code, description) =>
      send(
        new Writer().byte(Constants.MSG_DISCONNECT).uint32(code).string(description).string("").finish()
      ),
    send,
    openChannel: (type, data) =>
      Effect.gen(function*() {
        const id = nextChannelId++
        const channel = yield* makeServerChannel(id, type, new Reader(data))
        const opened = Deferred.makeUnsafe<void>()
        channels.set(id, {
          channel,
          remoteId: 0,
          remoteWindow: 0,
          remoteMaxPacket: 0,
          windowLatch: Latch.makeUnsafe(false),
          localWindow: windowSize,
          closed: false,
          opened
        })
        yield* send(
          new Writer()
            .byte(Constants.MSG_CHANNEL_OPEN)
            .string(type)
            .uint32(id)
            .uint32(windowSize)
            .uint32(maxPacketSize)
            .raw(data)
            .finish()
        )
        yield* Deferred.await(opened)
        return channel
      })
  }
  return server
})

/**
 * Starts a server in the current scope and returns the client socket that
 * connects to it, plus an effect that waits for the server handshake state.
 */
export const runServer = (options: ServerOptions) =>
  Effect.gen(function*() {
    const pipe = yield* makePipe
    const deferred = Deferred.makeUnsafe<TestServer>()
    // The server gets its own scope, closed after everything the test opens,
    // so it can still answer the client's shutdown messages.
    const scope = yield* Scope.make()
    yield* Effect.addFinalizer((exit) => Scope.close(scope, exit))
    yield* Effect.forkIn(
      Effect.flatMap(make(pipe, options), (server) => Deferred.succeed(deferred, server)).pipe(
        Effect.provideService(Scope.Scope, scope)
      ),
      scope
    )
    return { socket: pipe.clientSocket, server: Deferred.await(deferred), pipe }
  })
