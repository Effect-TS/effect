/**
 * An SSH client implemented on top of `Socket` and the `Crypto` service, with
 * no native dependencies.
 *
 * A client authenticates over any `Socket.Socket` transport (for example a
 * Node TCP socket or a WebSocket tunnel) and then multiplexes channels over
 * the connection: remote commands, interactive shells, subsystems such as
 * SFTP, and TCP or Unix socket forwarding in both directions.
 *
 * **Supported algorithms**
 *
 * - Key exchange: `curve25519-sha256`, `ecdh-sha2-nistp256/384/521`, with
 *   strict key exchange (`kex-strict-c-v00@openssh.com`).
 * - Host keys and user keys: `ssh-ed25519`, `ecdsa-sha2-nistp256/384/521`,
 *   `rsa-sha2-512`, `rsa-sha2-256`.
 * - Ciphers: `aes256-gcm@openssh.com`, `aes128-gcm@openssh.com`,
 *   `aes256-ctr`, `aes128-ctr`.
 * - MACs: `hmac-sha2-256(-etm@openssh.com)`, `hmac-sha2-512(-etm@openssh.com)`.
 *
 * All cryptography (key agreement, signatures, ciphers, MACs, and hashing)
 * uses the `Crypto` service from the context, provided by the platform
 * packages (for example `NodeServices.layer`).
 *
 * **Example** (Running a remote command on Node)
 *
 * ```ts skip-type-checking
 * import { NodeServices, NodeSocket } from "@effect/platform-node"
 * import { Effect, Layer } from "effect"
 * import { SshClient, SshKey, SshKnownHosts } from "effect/ssh"
 *
 * const program = Effect.gen(function*() {
 *   const keys = yield* SshKey.SshKeys
 *   const knownHosts = yield* SshKnownHosts.SshKnownHosts
 *   const client = yield* SshClient.make(
 *     yield* NodeSocket.makeNet({ host: "example.com", port: 22 }),
 *     {
 *       host: "example.com",
 *       username: "deploy",
 *       auth: SshClient.publicKey(yield* keys.parsePrivateKey(privateKeyText)),
 *       verifyHostKey: knownHosts.verifier
 *     }
 *   )
 *   const result = yield* client.run("uname -a")
 *   yield* Effect.log(result.stdout)
 * }).pipe(
 *   Effect.scoped,
 *   Effect.provide(
 *     Layer.mergeAll(SshKey.layer, SshKnownHosts.layerFromFile("/home/me/.ssh/known_hosts")).pipe(
 *       Layer.provideMerge(NodeServices.layer)
 *     )
 *   )
 * )
 * ```
 *
 * @stability experimental
 * @since 4.0.0
 */
import type * as Cause from "../Cause.ts"
import type * as Crypto from "../Crypto.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as InternalVersion from "../internal/version.ts"
import * as Layer from "../Layer.ts"
import * as Queue from "../Queue.ts"
import * as Redacted from "../Redacted.ts"
import type * as Scope from "../Scope.ts"
import type * as Sink from "../Sink.ts"
import type * as Socket from "../socket/Socket.ts"
import * as Stream from "../Stream.ts"
import * as Auth from "./internal/auth.ts"
import * as Connection from "./internal/connection.ts"
import { protocolError } from "./internal/errors.ts"
import * as Signatures from "./internal/signatures.ts"
import * as Streams from "./internal/streams.ts"
import * as Transport from "./internal/transport.ts"
import { concat, Reader, Writer } from "./internal/wire.ts"
import * as Ssh from "./Ssh.ts"
import type * as SshAgent from "./SshAgent.ts"
import { SshConnectionError, SshError, SshHostKeyError, SshTimeoutError } from "./SshError.ts"
import type * as SshKey from "./SshKey.ts"

// -----------------------------------------------------------------------------
// Host key verification
// -----------------------------------------------------------------------------

/**
 * The server host key presented during the initial key exchange.
 *
 * **Details**
 *
 * `fingerprint` is the OpenSSH `SHA256:` fingerprint. The signature over the
 * exchange hash has already been verified, so the server holds the private
 * half of `key`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface HostKeyInfo {
  readonly host: string
  readonly port: number
  readonly key: SshKey.PublicKey
  readonly fingerprint: string
}

/**
 * Decides whether a server host key is trusted, failing with an
 * `SshHostKeyError` to reject it.
 *
 * **Details**
 *
 * When `keyTypes` is present, host key algorithms for the returned key types
 * are preferred during negotiation, so a server with several host keys
 * presents one that can be verified.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface HostKeyVerifier {
  (info: HostKeyInfo): Effect.Effect<void, SshError>
  readonly keyTypes?: ((host: string, port: number) => Effect.Effect<ReadonlyArray<string>>) | undefined
}

/**
 * Host key verifier that trusts every host key.
 *
 * **Gotchas**
 *
 * Accepting any host key allows machine-in-the-middle attacks. Use it only
 * against trusted networks or in tests.
 *
 * @stability experimental
 * @category host keys
 * @since 4.0.0
 */
export const acceptAnyHostKey: HostKeyVerifier = () => Effect.void

/**
 * Creates a host key verifier that trusts only keys with one of the given
 * OpenSSH `SHA256:` fingerprints.
 *
 * @stability experimental
 * @category host keys
 * @since 4.0.0
 */
export const trustFingerprints = (fingerprints: string | ReadonlyArray<string>): HostKeyVerifier => {
  const trusted = typeof fingerprints === "string" ? [fingerprints] : fingerprints
  return (info) =>
    trusted.includes(info.fingerprint) ? Effect.void : Effect.fail(
      new SshError({
        reason: new SshHostKeyError({
          kind: "Mismatch",
          host: info.host,
          keyType: info.key.type,
          fingerprint: info.fingerprint
        })
      })
    )
}

// -----------------------------------------------------------------------------
// Authentication
// -----------------------------------------------------------------------------

/**
 * A keyboard-interactive challenge sent by the server.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface KeyboardInteractivePrompt {
  readonly name: string
  readonly instruction: string
  readonly prompts: ReadonlyArray<{
    readonly prompt: string
    readonly echo: boolean
  }>
}

/**
 * A user authentication method. Methods are attempted in order, skipping
 * methods the server does not allow, until one succeeds.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type AuthMethod =
  | {
    readonly _tag: "Password"
    readonly password: Redacted.Redacted<string>
  }
  | {
    readonly _tag: "PublicKey"
    readonly signer: SshKey.Signer
  }
  | {
    readonly _tag: "Agent"
    readonly identities: Effect.Effect<ReadonlyArray<SshKey.Signer>, SshError>
  }
  | {
    readonly _tag: "KeyboardInteractive"
    readonly respond: (prompt: KeyboardInteractivePrompt) => Effect.Effect<ReadonlyArray<string>, SshError>
  }
  | {
    readonly _tag: "None"
  }

/**
 * Creates a password authentication method.
 *
 * @stability experimental
 * @category authentication
 * @since 4.0.0
 */
export const password = (password: string | Redacted.Redacted<string>): AuthMethod => ({
  _tag: "Password",
  password: typeof password === "string" ? Redacted.make(password) : password
})

/**
 * Creates a public key authentication method from a private key or another
 * signer.
 *
 * @stability experimental
 * @category authentication
 * @since 4.0.0
 */
export const publicKey = (signer: SshKey.Signer): AuthMethod => ({ _tag: "PublicKey", signer })

/**
 * Creates a public key authentication method that offers every identity held
 * by an SSH agent.
 *
 * @stability experimental
 * @category authentication
 * @since 4.0.0
 */
export const agent = (agent: SshAgent.SshAgent["Service"]): AuthMethod => ({
  _tag: "Agent",
  identities: agent.identities
})

/**
 * Creates a keyboard-interactive authentication method. `respond` returns one
 * answer per prompt.
 *
 * @stability experimental
 * @category authentication
 * @since 4.0.0
 */
export const keyboardInteractive = (
  respond: (prompt: KeyboardInteractivePrompt) => Effect.Effect<ReadonlyArray<string>, SshError>
): AuthMethod => ({ _tag: "KeyboardInteractive", respond })

/**
 * Authentication method that succeeds only when the server requires no
 * authentication.
 *
 * @stability experimental
 * @category authentication
 * @since 4.0.0
 */
export const none: AuthMethod = { _tag: "None" }

// -----------------------------------------------------------------------------
// Channels
// -----------------------------------------------------------------------------

/**
 * How a remote command or shell terminated.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type SessionExit =
  | {
    readonly _tag: "ExitStatus"
    readonly code: number
  }
  | {
    readonly _tag: "ExitSignal"
    readonly signal: string
    readonly coreDumped: boolean
    readonly message: string
  }

/**
 * A channel multiplexed over an SSH connection.
 *
 * **Details**
 *
 * - `stdout` emits channel data and `stderr` emits extended (stderr) data.
 *   Each can be consumed once; both end when the server sends EOF.
 * - Received data counts against the channel window until it is pulled from
 *   `stdout` or `stderr`, so unconsumed output eventually pauses the sender.
 * - `write` waits for window space and splits data into packets. `stdin`
 *   writes every chunk and then sends EOF.
 * - `close` sends a channel close and waits for the server to confirm.
 *
 * **Gotchas**
 *
 * `stdout` and `stderr` share one flow-control window. A consumer that reads
 * only `stdout` of a command that writes a lot to `stderr` stalls.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SshChannel {
  readonly type: string
  readonly id: number
  readonly stdout: Stream.Stream<Uint8Array, SshError>
  readonly stderr: Stream.Stream<Uint8Array, SshError>
  readonly stdin: Sink.Sink<void, Uint8Array, never, SshError>
  readonly write: (data: Uint8Array | string) => Effect.Effect<void, SshError>
  readonly eof: Effect.Effect<void, SshError>
  readonly close: Effect.Effect<void>
  readonly closed: Effect.Effect<void>
  readonly request: (
    type: string,
    options?: {
      readonly data?: Uint8Array | undefined
      readonly wantReply?: boolean | undefined
    }
  ) => Effect.Effect<boolean, SshError>
}

/**
 * A `session` channel running a command, shell, or subsystem.
 *
 * **Details**
 *
 * `exit` waits for the server to report an exit status or signal and fails
 * when the channel closes without one. `signal` delivers a signal such as
 * `SIGTERM` (servers may ignore it). `resize` reports a terminal size change
 * for sessions with a pseudo-terminal.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SshSession extends SshChannel {
  readonly exit: Effect.Effect<SessionExit, SshError>
  readonly signal: (signal: string) => Effect.Effect<void, SshError>
  readonly resize: (size: TerminalSize) => Effect.Effect<void, SshError>
}

/**
 * Terminal dimensions in characters, with optional pixel dimensions.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface TerminalSize {
  readonly columns: number
  readonly rows: number
  readonly width?: number | undefined
  readonly height?: number | undefined
}

/**
 * Pseudo-terminal settings for a session.
 *
 * **Details**
 *
 * `term` defaults to `xterm-256color` and the size to 80x24. `modes` maps
 * RFC 4254 terminal mode opcodes to values.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface PtyOptions extends Partial<TerminalSize> {
  readonly term?: string | undefined
  readonly modes?: Readonly<Record<number, number>> | undefined
}

/**
 * Options for starting a session.
 *
 * **Details**
 *
 * - `env` sends `env` requests; servers usually accept only names listed in
 *   their `AcceptEnv` configuration and silently ignore others.
 * - `pty` allocates a pseudo-terminal.
 * - `forwardAgent` requests agent forwarding; the client must be created
 *   with an `agentForwarding` agent.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SessionOptions {
  readonly env?: Readonly<Record<string, string>> | undefined
  readonly pty?: boolean | PtyOptions | undefined
  readonly forwardAgent?: boolean | undefined
}

/**
 * The collected result of `SshClient.run`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface RunResult {
  readonly stdout: string
  readonly stderr: string
  readonly exit: SessionExit
}

/**
 * A destination reached through the server: a TCP host and port or a Unix
 * domain socket path on the server.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type ForwardTarget =
  | {
    readonly host: string
    readonly port: number
    readonly originHost?: string | undefined
    readonly originPort?: number | undefined
  }
  | {
    readonly socketPath: string
  }

/**
 * A server-side listener whose connections are forwarded to the client.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type ForwardListener =
  | {
    readonly bindAddress?: string | undefined
    readonly port: number
  }
  | {
    readonly socketPath: string
  }

/**
 * A connection accepted by a remote forward.
 *
 * **Details**
 *
 * The receiver owns `channel` and must close it when done.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface ForwardedConnection {
  readonly channel: SshChannel
  readonly originAddress: string
  readonly originPort: number
}

/**
 * An active remote forward. `port` is the port allocated by the server when
 * port `0` was requested.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface RemoteForward {
  readonly bindAddress: string
  readonly port: number
  readonly connections: Stream.Stream<ForwardedConnection>
}

/**
 * Algorithms negotiated during the initial key exchange.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface NegotiatedAlgorithms {
  readonly kex: string
  readonly hostKey: string
  readonly cipherClientToServer: string
  readonly cipherServerToClient: string
  readonly macClientToServer: string | undefined
  readonly macServerToClient: string | undefined
}

/**
 * Client algorithm preferences, most preferred first.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface AlgorithmPreferences {
  readonly kex: ReadonlyArray<string>
  readonly hostKey: ReadonlyArray<string>
  readonly cipher: ReadonlyArray<string>
  readonly mac: ReadonlyArray<string>
}

/**
 * The algorithms supported by this client, in default preference order.
 *
 * @stability experimental
 * @category constants
 * @since 4.0.0
 */
export const defaultAlgorithms: AlgorithmPreferences = Transport.defaultAlgorithms

// -----------------------------------------------------------------------------
// Client
// -----------------------------------------------------------------------------

/**
 * An authenticated SSH connection created by `make`, with the full client
 * API (sessions, shells, forwarding in both directions, re-keying).
 *
 * **Details**
 *
 * - `exec`, `shell`, and `subsystem` open `session` channels that close when
 *   their scope closes. `run` executes a command and collects its output.
 * - `forwardOut` opens a channel to a target reachable from the server
 *   (`ssh -L`); `forwardOutSocket` exposes such channels as a
 *   `Socket.Socket`; `forwardSocket` pipes a local socket to a target and
 *   finishes when the target closes its side.
 * - `forwardIn` asks the server to listen and forward connections back
 *   (`ssh -R`).
 * - `closed` fails with the error that terminated the connection.
 *
 * **Gotchas**
 *
 * When `forwardSocket` serves Node sockets whose peers half-close, create them
 * with `allowHalfOpen: true`; otherwise Node ends the socket before the
 * target's reply has been written.
 *
 * @see {@link Ssh.fromClient} to use a client as a backend-independent
 * `SshConnection`
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SshClient {
  readonly serverVersion: string
  readonly hostKey: SshKey.PublicKey
  readonly sessionId: Uint8Array
  readonly algorithms: NegotiatedAlgorithms
  readonly exec: (command: string, options?: SessionOptions) => Effect.Effect<SshSession, SshError, Scope.Scope>
  readonly shell: (options?: SessionOptions) => Effect.Effect<SshSession, SshError, Scope.Scope>
  readonly subsystem: (name: string, options?: SessionOptions) => Effect.Effect<SshSession, SshError, Scope.Scope>
  readonly run: (
    command: string,
    options?: SessionOptions & {
      readonly stdin?: Uint8Array | string | undefined
    }
  ) => Effect.Effect<RunResult, SshError>
  readonly openChannel: (type: string, data?: Uint8Array) => Effect.Effect<SshChannel, SshError, Scope.Scope>
  readonly forwardOut: (target: ForwardTarget) => Effect.Effect<SshChannel, SshError, Scope.Scope>
  readonly forwardOutSocket: (target: ForwardTarget) => Socket.Socket
  readonly forwardSocket: (
    socket: Socket.Socket,
    target: ForwardTarget
  ) => Effect.Effect<void, SshError | Socket.SocketError>
  readonly forwardIn: (listener: ForwardListener) => Effect.Effect<RemoteForward, SshError, Scope.Scope>
  readonly globalRequest: (
    name: string,
    options?: {
      readonly data?: Uint8Array | undefined
      readonly wantReply?: boolean | undefined
    }
  ) => Effect.Effect<Uint8Array, SshError>
  readonly rekey: Effect.Effect<void, SshError>
  readonly closed: Effect.Effect<never, SshError>
}

/**
 * Options for connecting and authenticating.
 *
 * **Details**
 *
 * - `host` and `port` (default 22) identify the server for host key
 *   verification; the transport itself comes from the `Socket`.
 * - `verifyHostKey` is required; see `SshKnownHosts` for `known_hosts`
 *   support.
 * - `handshakeTimeout` (default 30 seconds) bounds the key exchange and
 *   authentication.
 * - `keepAlive` sends `keepalive@openssh.com` requests and fails the
 *   connection after `maxMissed` (default 3) unanswered intervals.
 * - `rekeyLimit` re-keys after `bytes` (default 1 GiB) or `interval`
 *   (default one hour).
 * - `agentForwarding` serves forwarded agent requests for sessions started
 *   with `forwardAgent: true`.
 * - `algorithms` reorders or restricts the supported algorithms; names this
 *   client does not implement are ignored.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface ConnectOptions {
  readonly host: string
  readonly port?: number | undefined
  readonly username: string
  readonly auth: AuthMethod | ReadonlyArray<AuthMethod>
  readonly verifyHostKey: HostKeyVerifier
  readonly algorithms?: Partial<AlgorithmPreferences> | undefined
  readonly clientVersion?: string | undefined
  readonly handshakeTimeout?: Duration.Input | undefined
  readonly keepAlive?: {
    readonly interval: Duration.Input
    readonly maxMissed?: number | undefined
  } | undefined
  readonly rekeyLimit?: {
    readonly bytes?: number | undefined
    readonly interval?: Duration.Input | undefined
  } | undefined
  readonly windowSize?: number | undefined
  readonly maxPacketSize?: number | undefined
  readonly agentForwarding?: SshAgent.SshAgent["Service"] | undefined
  readonly onBanner?: ((message: string) => Effect.Effect<void>) | undefined
}

const keyTypeForHostKeyAlgorithm = (algorithm: string) => algorithm.startsWith("rsa-sha2-") ? "ssh-rsa" : algorithm

const encodeTarget = (target: ForwardTarget): { readonly type: string; readonly data: Uint8Array } =>
  "socketPath" in target
    ? {
      type: "direct-streamlocal@openssh.com",
      data: new Writer().string(target.socketPath).string("").uint32(0).finish()
    }
    : {
      type: "direct-tcpip",
      data: new Writer()
        .string(target.host)
        .uint32(target.port)
        .string(target.originHost ?? "127.0.0.1")
        .uint32(target.originPort ?? 0)
        .finish()
    }

const encodePty = (pty: PtyOptions): Uint8Array => {
  const modes = new Writer()
  for (const [opcode, value] of Object.entries(pty.modes ?? {})) {
    modes.byte(Number(opcode)).uint32(value)
  }
  modes.byte(0)
  return new Writer()
    .string(pty.term ?? "xterm-256color")
    .uint32(pty.columns ?? 80)
    .uint32(pty.rows ?? 24)
    .uint32(pty.width ?? 0)
    .uint32(pty.height ?? 0)
    .string(modes.finish())
    .finish()
}

const proxyAgent = (agent: SshAgent.SshAgent["Service"], channel: SshChannel) =>
  Effect.gen(function*() {
    let buffer = new Uint8Array(0)
    yield* Stream.runForEach(channel.stdout, (chunk) =>
      Effect.gen(function*() {
        buffer = concat([buffer, chunk])
        while (buffer.length >= 4) {
          const length = new Reader(buffer).uint32()
          if (length > 256 * 1024) return yield* channel.close
          if (buffer.length < 4 + length) break
          const message = buffer.subarray(4, 4 + length)
          buffer = buffer.subarray(4 + length)
          const response = yield* agent.request(message).pipe(
            Effect.catch(() => Effect.succeed(new Uint8Array([5])))
          )
          yield* channel.write(new Writer(response.length + 4).string(response).finish())
        }
      }))
  }).pipe(Effect.ensuring(channel.close), Effect.ignore)

const makeClient = Effect.fnUntraced(function*(
  socket: Socket.Socket,
  options: ConnectOptions
): Effect.fn.Return<SshClient, SshError, Crypto.Crypto | Transport.Services | Scope.Scope> {
  const scope = yield* Effect.scope
  const signatures = yield* Signatures.Signatures
  const port = options.port ?? 22
  // Unsupported algorithm names are dropped so they can never be negotiated.
  const supported = (category: keyof AlgorithmPreferences) => {
    const requested = options.algorithms?.[category] ?? Transport.defaultAlgorithms[category]
    return requested.filter((name) => Transport.defaultAlgorithms[category].includes(name))
  }
  let hostKeyAlgorithms = supported("hostKey")
  const verifier = options.verifyHostKey
  if (verifier.keyTypes !== undefined && options.algorithms?.hostKey === undefined) {
    const known = yield* verifier.keyTypes(options.host, port)
    const preferred = hostKeyAlgorithms.filter((algorithm) => known.includes(keyTypeForHostKeyAlgorithm(algorithm)))
    hostKeyAlgorithms = [...preferred, ...hostKeyAlgorithms.filter((algorithm) => !preferred.includes(algorithm))]
  }
  const algorithms: Transport.AlgorithmPreferences = {
    kex: supported("kex"),
    hostKey: hostKeyAlgorithms,
    cipher: supported("cipher"),
    mac: supported("mac")
  }

  const handshake = Effect.gen(function*() {
    const transport = yield* Transport.make(socket, {
      host: options.host,
      clientVersion: `SSH-2.0-${options.clientVersion ?? `Effect_${InternalVersion.version}`}`,
      algorithms,
      verifyHostKey: (key) =>
        Effect.flatMap(
          signatures.fingerprint(key.blob),
          (fingerprint) => verifier({ host: options.host, port, key, fingerprint })
        ),
      rekeyBytes: options.rekeyLimit?.bytes ?? 1024 * 1024 * 1024,
      rekeyInterval: Duration.fromInputUnsafe(options.rekeyLimit?.interval ?? Duration.hours(1))
    })
    yield* Auth.authenticate(transport, {
      username: options.username,
      methods: Array.isArray(options.auth) ? options.auth : [options.auth as AuthMethod],
      onBanner: options.onBanner
    })
    return transport
  })

  const transport = yield* handshake.pipe(
    Effect.timeoutOrElse({
      duration: options.handshakeTimeout ?? Duration.seconds(30),
      orElse: () =>
        Effect.fail(new SshError({ reason: new SshTimeoutError({ description: "SSH handshake timed out" }) }))
    })
  )
  transport.enableRekey()

  const connection = yield* Connection.make(transport, {
    windowSize: options.windowSize ?? 2 * 1024 * 1024,
    maxPacketSize: options.maxPacketSize ?? 32 * 1024
  })

  // Remote forwards ----------------------------------------------------------

  const listeners = new Map<string, Queue.Queue<ForwardedConnection, Cause.Done>>()
  const deliver = (key: string, port: number | undefined) => {
    let queue = listeners.get(key)
    if (queue === undefined && port !== undefined) {
      const candidates = [...listeners.entries()].filter(([name]) => name.endsWith(`:${port}`))
      if (candidates.length === 1) queue = candidates[0][1]
    }
    return queue
  }
  const forwardedHandler = (unix: boolean): Connection.ChannelOpenHandler => ({ data }) => {
    const address = data.utf8()
    const listenPort = unix ? undefined : data.uint32()
    const originAddress = unix ? "" : data.utf8()
    const originPort = unix ? 0 : data.uint32()
    const queue = deliver(unix ? `unix:${address}` : `${address}:${listenPort}`, listenPort)
    if (queue === undefined) return undefined
    return (channel) => {
      Queue.offerUnsafe(queue, { channel, originAddress, originPort })
    }
  }
  connection.addChannelOpenHandler("forwarded-tcpip", forwardedHandler(false))
  connection.addChannelOpenHandler("forwarded-streamlocal@openssh.com", forwardedHandler(true))

  if (options.agentForwarding !== undefined) {
    const forwardingAgent = options.agentForwarding
    const agentChannels = yield* Queue.unbounded<SshChannel>()
    connection.addChannelOpenHandler("auth-agent@openssh.com", () => (channel) => {
      Queue.offerUnsafe(agentChannels, channel)
    })
    yield* Effect.forkIn(
      Effect.forever(
        Effect.flatMap(
          Queue.take(agentChannels),
          (channel) => Effect.forkIn(proxyAgent(forwardingAgent, channel), scope)
        )
      ),
      scope
    )
  }

  // Keep-alive ---------------------------------------------------------------

  if (options.keepAlive !== undefined) {
    const interval = Duration.fromInputUnsafe(options.keepAlive.interval)
    const maxMissed = options.keepAlive.maxMissed ?? 3
    let missed = 0
    yield* Effect.forkIn(
      Effect.forever(Effect.gen(function*() {
        yield* Effect.sleep(interval)
        const answered = yield* connection.globalRequest("keepalive@openssh.com", undefined, true).pipe(
          Effect.catchReason("SshError", "SshRequestError", () => Effect.void),
          Effect.timeoutOption(interval)
        )
        if (answered._tag === "Some") {
          missed = 0
        } else if (++missed >= maxMissed) {
          return yield* new SshError({
            reason: new SshTimeoutError({ description: `no keep-alive response after ${missed} attempts` })
          })
        }
      })).pipe(
        Effect.catch((error) => Effect.sync(() => transport.fail(error)))
      ),
      scope
    )
  }

  // Sessions -----------------------------------------------------------------

  const openSession = Effect.fnUntraced(function*(
    sessionOptions: SessionOptions | undefined,
    start: (channel: Connection.ChannelImpl) => Effect.Effect<void, SshError>
  ) {
    const channel = yield* connection.openChannel("session")
    if (sessionOptions?.forwardAgent === true) {
      yield* channel.request("auth-agent-req@openssh.com", { wantReply: false })
    }
    for (const [name, value] of Object.entries(sessionOptions?.env ?? {})) {
      yield* channel.request("env", { data: new Writer().string(name).string(value).finish(), wantReply: false })
    }
    if (sessionOptions?.pty !== undefined && sessionOptions.pty !== false) {
      yield* channel.requestOrFail("pty-req", encodePty(sessionOptions.pty === true ? {} : sessionOptions.pty))
    }
    yield* start(channel)
    return channel as SshSession
  })

  const exec = (command: string, sessionOptions?: SessionOptions) =>
    openSession(sessionOptions, (channel) => channel.requestOrFail("exec", new Writer().string(command).finish()))

  const shell = (sessionOptions?: SessionOptions) =>
    openSession(sessionOptions, (channel) => channel.requestOrFail("shell"))

  const subsystem = (name: string, sessionOptions?: SessionOptions) =>
    openSession(sessionOptions, (channel) => channel.requestOrFail("subsystem", new Writer().string(name).finish()))

  const run: SshClient["run"] = Streams.run(exec)

  // Forwarding ---------------------------------------------------------------

  const forwardOut = (target: ForwardTarget) => {
    const { data, type } = encodeTarget(target)
    return connection.openChannel(type, data)
  }

  const forwardIn = (listener: ForwardListener) =>
    Effect.acquireRelease(
      Effect.gen(function*() {
        const queue = yield* Queue.unbounded<ForwardedConnection, Cause.Done>()
        if ("socketPath" in listener) {
          const data = new Writer().string(listener.socketPath).finish()
          yield* connection.globalRequest("streamlocal-forward@openssh.com", data, true)
          const key = `unix:${listener.socketPath}`
          listeners.set(key, queue)
          return {
            forward: {
              bindAddress: listener.socketPath,
              port: 0,
              connections: Stream.fromQueue(queue)
            } satisfies RemoteForward,
            key,
            queue,
            cancel: ["cancel-streamlocal-forward@openssh.com", data] as const
          }
        }
        const bindAddress = listener.bindAddress ?? "localhost"
        const reply = yield* connection.globalRequest(
          "tcpip-forward",
          new Writer().string(bindAddress).uint32(listener.port).finish(),
          true
        )
        const allocated = listener.port === 0
          ? yield* Effect.try({
            try: () => new Reader(reply).uint32(),
            catch: () => protocolError("missing allocated port")
          })
          : listener.port
        const key = `${bindAddress}:${allocated}`
        listeners.set(key, queue)
        return {
          forward: { bindAddress, port: allocated, connections: Stream.fromQueue(queue) } satisfies RemoteForward,
          key,
          queue,
          cancel: ["cancel-tcpip-forward", new Writer().string(bindAddress).uint32(allocated).finish()] as const
        }
      }),
      ({ cancel, key, queue }) =>
        Effect.gen(function*() {
          listeners.delete(key)
          yield* Queue.end(queue)
          yield* Effect.ignore(connection.globalRequest(cancel[0], cancel[1], true))
        })
    ).pipe(Effect.map(({ forward }) => forward))

  return {
    serverVersion: transport.serverVersion,
    hostKey: transport.hostKey,
    sessionId: transport.sessionId,
    algorithms: transport.negotiated(),
    exec,
    shell,
    subsystem,
    run,
    openChannel: (type, data) => connection.openChannel(type, data),
    forwardOut,
    forwardOutSocket: (target) => Streams.toSocket(forwardOut(target)),
    forwardSocket: (socket, target) => Streams.pipeSocket(socket, forwardOut(target)),
    forwardIn,
    globalRequest: (name, requestOptions) =>
      connection.globalRequest(name, requestOptions?.data, requestOptions?.wantReply ?? true),
    rekey: transport.rekey,
    closed: transport.failed
  }
})

/**
 * Connects, verifies the server, and authenticates over a socket.
 *
 * **Details**
 *
 * The connection lives until the surrounding scope closes, at which point a
 * disconnect message is sent and the socket is released. Channels opened
 * through the client should be closed first; they are closed implicitly
 * otherwise.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = (
  socket: Socket.Socket,
  options: ConnectOptions
): Effect.Effect<SshClient, SshError, Crypto.Crypto | Scope.Scope> =>
  Effect.provide(makeClient(socket, options), Transport.layer)

/**
 * Options for `layer`: connection settings shared by every connection,
 * plus how to open the transport socket.
 *
 * **Details**
 *
 * `makeSocket` opens the transport for a destination, for example
 * `({ host, port }) => NodeSocket.makeNet({ host, port })`. `username` and
 * `port` (default 22) are defaults that a `Destination` can override.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface LayerOptions extends Omit<ConnectOptions, "host" | "port" | "username"> {
  readonly makeSocket: (destination: {
    readonly host: string
    readonly port: number
  }) => Effect.Effect<Socket.Socket, SshError>
  readonly username?: string | undefined
  readonly port?: number | undefined
}

/**
 * Creates an `Ssh` connection factory backed by the built-in client,
 * capturing the `Crypto` service once.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeConnector = (options: LayerOptions): Effect.Effect<Ssh.Ssh["Service"], never, Crypto.Crypto> =>
  Effect.provide(makeConnectorWith(options), Transport.layer)

const makeConnectorWith = Effect.fnUntraced(function*(
  options: LayerOptions
): Effect.fn.Return<Ssh.Ssh["Service"], never, Crypto.Crypto | Transport.Services> {
  const context = yield* Effect.context<Crypto.Crypto | Transport.Services>()
  const { makeSocket, port: defaultPort, username: defaultUsername, ...connectOptions } = options
  return Ssh.Ssh.of({
    connect: Effect.fnUntraced(function*(destination) {
      const username = destination.username ?? defaultUsername
      if (username === undefined) {
        return yield* new SshError({
          reason: new SshConnectionError({ cause: new Error(`no username configured for ${destination.host}`) })
        })
      }
      const port = destination.port ?? defaultPort ?? 22
      const socket = yield* makeSocket({ host: destination.host, port })
      const client = yield* makeClient(socket, { ...connectOptions, host: destination.host, port, username }).pipe(
        Effect.provideContext(context)
      )
      return Ssh.fromClient(client)
    })
  })
})

/**
 * Layer that provides the `Ssh` connection factory backed by the built-in
 * client.
 *
 * **Example** (Connecting over TCP on Node)
 *
 * ```ts skip-type-checking
 * import { NodeServices, NodeSocket } from "@effect/platform-node"
 * import { Effect, Layer } from "effect"
 * import { Ssh, SshClient } from "effect/ssh"
 *
 * const SshLive = SshClient.layer({
 *   makeSocket: ({ host, port }) => NodeSocket.makeNet({ host, port }),
 *   username: "deploy",
 *   auth: SshClient.password("secret"),
 *   verifyHostKey: SshClient.trustFingerprints("SHA256:...")
 * }).pipe(Layer.provide(NodeServices.layer))
 *
 * const program = Effect.gen(function*() {
 *   const ssh = yield* Ssh.Ssh
 *   const connection = yield* ssh.connect({ host: "example.com" })
 *   return yield* connection.run("uptime")
 * }).pipe(Effect.scoped, Effect.provide(SshLive))
 * ```
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: LayerOptions): Layer.Layer<Ssh.Ssh, never, Crypto.Crypto> =>
  Layer.effect(Ssh.Ssh, makeConnector(options))
