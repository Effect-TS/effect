/**
 * The client side of the SSH Connection Protocol as a `Channel`.
 *
 * The SSH Connection Protocol (RFC 4254) multiplexes channels, such as
 * command sessions and tunnels, over one authenticated connection.
 * `make` returns the protocol as a
 * `Channel` from the server's messages to messages for the server, together
 * with `open`, which opens SSH channels whose messages flow through it, and
 * `toSshConnection` runs commands, subsystems, and tunnels on those channels.
 * The protocol does no I/O: a backend pumps the messages of its transport
 * through the `Channel`. `NodeOpenSsh` in `@effect/platform-node`, for
 * example, pumps the control socket of an OpenSSH connection master through
 * it.
 *
 * **Example** (Running a command over a message transport)
 *
 * ```ts skip-type-checking
 * import { Effect, Stream } from "effect"
 * import { SshCommand, SshConnectionProtocol } from "effect/ssh"
 *
 * declare const incoming: Stream.Stream<Uint8Array>
 * declare const send: (message: Uint8Array) => Effect.Effect<void>
 *
 * const program = Effect.gen(function*() {
 *   const protocol = yield* SshConnectionProtocol.make()
 *   yield* incoming.pipe(
 *     Stream.pipeThroughChannel(protocol.channel),
 *     Stream.runForEach(send),
 *     Effect.forkScoped
 *   )
 *   const connection = SshConnectionProtocol.toSshConnection(protocol)
 *   const result = yield* connection.run(SshCommand.make`uptime`)
 *   yield* Effect.log(result.stdout)
 * }).pipe(Effect.scoped)
 * ```
 *
 * @stability experimental
 * @since 4.0.0
 */
import type { NonEmptyReadonlyArray } from "../Array.ts"
import * as Cause from "../Cause.ts"
import * as Channel from "../Channel.ts"
import * as Deferred from "../Deferred.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Latch from "../Latch.ts"
import * as Host from "../net/Host.ts"
import * as NetAddress from "../net/NetAddress.ts"
import * as Pull from "../Pull.ts"
import * as Queue from "../Queue.ts"
import * as Result from "../Result.ts"
import * as Scope from "../Scope.ts"
import * as Semaphore from "../Semaphore.ts"
import * as Sink from "../Sink.ts"
import * as Stream from "../Stream.ts"
import * as Ssh from "./Ssh.ts"

/**
 * The protocol as a `Channel`: the server's messages in, messages for the
 * server out, in chunks.
 *
 * **Details**
 *
 * A message is the payload of an SSH packet: its message number followed by
 * its fields, without the packet length, padding, or MAC of the transport
 * layer (RFC 4253). Messages for the server must be delivered in order.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type ProtocolChannel = Channel.Channel<
  NonEmptyReadonlyArray<Uint8Array>,
  Ssh.SshError,
  void,
  NonEmptyReadonlyArray<Uint8Array>,
  unknown,
  unknown
>

/**
 * An open SSH channel: an `Ssh.SshStream` that also sends channel requests
 * and reports the exit of a session.
 *
 * **Details**
 *
 * - `stdout` and `stderr` carry the channel's data and extended data, and
 *   consuming them refills the server's window.
 * - `write` waits while the server's window is full. Writes and `eof` fail
 *   with a `Channel` error once the channel is closed, and writes also once
 *   `eof` was sent.
 * - `request` sends a channel request, such as `exec`, with its
 *   type-specific fields encoded as SSH wire types (RFC 4251). With
 *   `wantReply`, it waits for the reply and fails with a `Channel` error when
 *   the server refuses the request.
 * - `exit` waits for the `exit-status` or `exit-signal` of a session, and
 *   fails when the channel closes without one. Signal names have the `SIG`
 *   prefix, such as `SIGTERM`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SshChannel extends Ssh.SshStream {
  readonly request: (name: string, data: Uint8Array, wantReply: boolean) => Effect.Effect<void, Ssh.SshError>
  readonly exit: Effect.Effect<Ssh.SessionExit, Ssh.SshError>
}

/**
 * The protocol of one connection.
 *
 * **Details**
 *
 * - `channel` turns the server's messages into messages for the server.
 * - `open` opens an SSH channel of a type, such as `session` or
 *   `direct-tcpip`, with its type-specific fields encoded as SSH wire types.
 *   It fails with a `Channel` error when the server refuses the channel, and
 *   the channel closes with the scope.
 *
 * `channel` must run, once, for `open` and the channels it opens to make
 * progress; until then they wait. When the channel's input ends, the
 * connection closes, and when its input fails, the connection fails; either
 * way every open SSH channel fails. The server's global requests are
 * answered with a failure, and channels opened by the server are refused.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SshConnectionProtocol {
  readonly channel: ProtocolChannel
  readonly open: (type: string, data: Uint8Array) => Effect.Effect<SshChannel, Ssh.SshError, Scope.Scope>
}

const MSG_GLOBAL_REQUEST = 80
const MSG_REQUEST_FAILURE = 82
const MSG_CHANNEL_OPEN = 90
const MSG_CHANNEL_OPEN_CONFIRMATION = 91
const MSG_CHANNEL_OPEN_FAILURE = 92
const MSG_CHANNEL_WINDOW_ADJUST = 93
const MSG_CHANNEL_DATA = 94
const MSG_CHANNEL_EXTENDED_DATA = 95
const MSG_CHANNEL_EOF = 96
const MSG_CHANNEL_CLOSE = 97
const MSG_CHANNEL_REQUEST = 98
const MSG_CHANNEL_SUCCESS = 99
const MSG_CHANNEL_FAILURE = 100

const EXTENDED_DATA_STDERR = 1
const OPEN_ADMINISTRATIVELY_PROHIBITED = 1

const encoder = new TextEncoder()
const decoder = new TextDecoder()

// -----------------------------------------------------------------------------
// Wire encoding
// -----------------------------------------------------------------------------

/**
 * Builds a message, or the type-specific fields of a channel open or
 * request, from SSH wire types (RFC 4251 section 5).
 *
 * @internal
 */
export class MessageWriter {
  private parts: Array<Uint8Array> = []
  private length = 0
  constructor(type?: number) {
    if (type !== undefined) this.byte(type)
  }
  private push(part: Uint8Array) {
    this.parts.push(part)
    this.length += part.length
    return this
  }
  byte(value: number): this {
    return this.push(Uint8Array.of(value))
  }
  bool(value: boolean): this {
    return this.byte(value ? 1 : 0)
  }
  uint32(value: number): this {
    const part = new Uint8Array(4)
    new DataView(part.buffer).setUint32(0, value >>> 0)
    return this.push(part)
  }
  string(value: string | Uint8Array): this {
    const bytes = typeof value === "string" ? encoder.encode(value) : value
    return this.uint32(bytes.length).push(bytes)
  }
  raw(bytes: Uint8Array): this {
    return this.push(bytes)
  }
  finish(): Uint8Array {
    const out = new Uint8Array(this.length)
    let offset = 0
    for (const part of this.parts) {
      out.set(part, offset)
      offset += part.length
    }
    return out
  }
}

class TruncatedMessage {
  readonly _tag = "TruncatedMessage"
}

/**
 * Reads SSH wire types from a message, throwing past its end.
 *
 * @internal
 */
export class MessageReader {
  private offset = 0
  private readonly bytes: Uint8Array
  private readonly view: DataView
  constructor(bytes: Uint8Array) {
    this.bytes = bytes
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }
  private take(length: number) {
    if (this.offset + length > this.bytes.length) throw new TruncatedMessage()
    const start = this.offset
    this.offset += length
    return start
  }
  byte(): number {
    return this.bytes[this.take(1)]
  }
  bool(): boolean {
    return this.byte() !== 0
  }
  uint32(): number {
    return this.view.getUint32(this.take(4))
  }
  bytesField(): Uint8Array {
    const length = this.uint32()
    const start = this.take(length)
    return this.bytes.subarray(start, start + length)
  }
  string(): string {
    return decoder.decode(this.bytesField())
  }
}

// -----------------------------------------------------------------------------
// Connection state
// -----------------------------------------------------------------------------

/**
 * Something that happened to a channel, reported by `ConnectionState.receive`.
 *
 * **Details**
 *
 * - `Opened` and `OpenFailed` answer `ConnectionState.open`.
 * - `Data` carries data (`stdout`) or standard error (`stderr`). Its bytes
 *   are a view of the received message.
 * - `Writable` reports that the server's window grew, so a blocked
 *   `ConnectionState.write` may make progress.
 * - `Reply` answers the oldest request sent with `wantReply`.
 * - `Exit` reports a session's `exit-status` or `exit-signal`.
 * - `Eof` ends the channel's data, and `Closed` reports that the server
 *   closed the channel.
 *
 * @internal
 */
export type Event =
  | { readonly _tag: "Opened"; readonly channel: number }
  | { readonly _tag: "OpenFailed"; readonly channel: number; readonly description: string }
  | {
    readonly _tag: "Data"
    readonly channel: number
    readonly stream: "stdout" | "stderr"
    readonly data: Uint8Array
  }
  | { readonly _tag: "Writable"; readonly channel: number }
  | { readonly _tag: "Reply"; readonly channel: number; readonly success: boolean }
  | { readonly _tag: "Exit"; readonly channel: number; readonly exit: Ssh.SessionExit }
  | { readonly _tag: "Eof"; readonly channel: number }
  | { readonly _tag: "Closed"; readonly channel: number }

/**
 * What handling a received message produced: messages to send and events to
 * deliver, in order, or a violation of the protocol by the server.
 *
 * @internal
 */
export type Received =
  | {
    readonly _tag: "Handled"
    readonly messages: ReadonlyArray<Uint8Array>
    readonly events: ReadonlyArray<Event>
  }
  | { readonly _tag: "Violation"; readonly description: string }

/**
 * The state of a channel for sending data.
 *
 * - `Opening`: the server has not confirmed the channel yet.
 * - `Ready`: data can be sent.
 * - `Blocked`: the server's window is full.
 * - `Closed`: end of data or a close was sent, or the channel is unknown.
 *
 * @internal
 */
export type WriteState = "Opening" | "Ready" | "Blocked" | "Closed"

interface ChannelState {
  readonly local: number
  remote: number
  remoteWindow: number
  remoteMaxPacket: number
  confirmed: boolean
  /** Given up before the server confirmed it; closed once confirmed. */
  abandoned: boolean
  eofSent: boolean
  closeSent: boolean
  /** The data the server may still send. */
  localWindow: number
  /** Consumed data not yet returned to the server's window. */
  consumed: number
  /** Requests sent with `wantReply` and not yet answered. */
  pendingReplies: number
}

/**
 * Settings of a `ConnectionState`.
 *
 * **Details**
 *
 * - `window` (default two megabytes) is the receive window granted to the
 *   server for each channel; consumed data is returned once half of it is
 *   used.
 * - `maxPacket` (default 32 kilobytes) is the largest data payload accepted
 *   from, and sent to, the server.
 *
 * @internal
 */
export interface Options {
  readonly window?: number | undefined
  readonly maxPacket?: number | undefined
}

/**
 * The client side of the connection protocol for one connection.
 *
 * **Details**
 *
 * Every method returns the messages to send, in order, and changes the state
 * as if they were sent. Methods for unknown or closed channels return no
 * messages, so callers check `writeState` or `isOpen` when that matters.
 *
 * - `open` opens a channel of a type with its type-specific fields, and
 *   `receive` later reports `Opened` or `OpenFailed`.
 * - `write` sends as much data as the server's window allows, split into
 *   packets; `written` is less than the data's length when the window is
 *   full, and the rest can be written after a `Writable` event.
 * - `request` sends a channel request; with `wantReply`, a `Reply` event
 *   answers it.
 * - `eof` ends the client's data.
 * - `close` closes a channel. Its messages are ignored afterwards, except
 *   that requests wanting a reply are refused until the server closes it
 *   too, after which it is forgotten. A channel the server has not
 *   confirmed yet is closed as soon as it is, without events.
 * - `consume` records data the caller has consumed, returning it to the
 *   server's window once half of the window is used.
 * - `receive` handles a message from the server. Global requests are refused
 *   and channels opened by the server are rejected. Data beyond the window
 *   or larger than the maximum packet size is a violation, so unconsumed
 *   data stays bounded.
 *
 * @internal
 */
export class ConnectionState {
  private readonly window: number
  private readonly maxPacket: number
  private readonly channels = new Map<number, ChannelState>()
  private nextId = 0

  constructor(options?: Options) {
    this.window = options?.window ?? 2 * 1024 * 1024
    this.maxPacket = options?.maxPacket ?? 32 * 1024
    // Windows and packets are uint32 values, and no data fits in empty packets.
    for (const value of [this.window, this.maxPacket]) {
      if (!Number.isInteger(value) || value < 1 || value > 0xffffffff) {
        throw new RangeError(`invalid window or maximum packet size: ${value}`)
      }
    }
  }

  open(
    type: string,
    data: Uint8Array
  ): { readonly channel: number; readonly messages: ReadonlyArray<Uint8Array> } {
    const channel = this.nextId++
    this.channels.set(channel, {
      local: channel,
      remote: 0,
      remoteWindow: 0,
      remoteMaxPacket: 0,
      confirmed: false,
      abandoned: false,
      eofSent: false,
      closeSent: false,
      localWindow: this.window,
      consumed: 0,
      pendingReplies: 0
    })
    const message = new MessageWriter(MSG_CHANNEL_OPEN).string(type).uint32(channel).uint32(this.window).uint32(
      this.maxPacket
    ).raw(data).finish()
    return { channel, messages: [message] }
  }

  isOpen(channel: number): boolean {
    const state = this.channels.get(channel)
    return state !== undefined && state.confirmed && !state.closeSent
  }

  writeState(channel: number): WriteState {
    const state = this.channels.get(channel)
    if (state === undefined || state.eofSent || state.closeSent) return "Closed"
    if (!state.confirmed) return "Opening"
    return state.remoteWindow === 0 ? "Blocked" : "Ready"
  }

  write(
    channel: number,
    data: Uint8Array
  ): { readonly written: number; readonly messages: ReadonlyArray<Uint8Array> } {
    if (this.writeState(channel) !== "Ready") return { written: 0, messages: [] }
    const state = this.channels.get(channel)!
    const messages: Array<Uint8Array> = []
    let written = 0
    while (written < data.length && state.remoteWindow > 0) {
      const length = Math.min(data.length - written, state.remoteWindow, state.remoteMaxPacket, this.maxPacket)
      messages.push(
        new MessageWriter(MSG_CHANNEL_DATA).uint32(state.remote).string(data.subarray(written, written + length))
          .finish()
      )
      state.remoteWindow -= length
      written += length
    }
    return { written, messages }
  }

  request(
    channel: number,
    name: string,
    data: Uint8Array,
    wantReply: boolean
  ): ReadonlyArray<Uint8Array> {
    const state = this.channels.get(channel)
    if (state === undefined || !state.confirmed || state.closeSent) return []
    if (wantReply) state.pendingReplies++
    return [new MessageWriter(MSG_CHANNEL_REQUEST).uint32(state.remote).string(name).bool(wantReply).raw(data).finish()]
  }

  eof(channel: number): ReadonlyArray<Uint8Array> {
    const state = this.channels.get(channel)
    if (state === undefined || !state.confirmed || state.eofSent || state.closeSent) return []
    state.eofSent = true
    return [new MessageWriter(MSG_CHANNEL_EOF).uint32(state.remote).finish()]
  }

  close(channel: number): ReadonlyArray<Uint8Array> {
    const state = this.channels.get(channel)
    if (state === undefined || state.closeSent) return []
    if (!state.confirmed) {
      state.abandoned = true
      return []
    }
    state.closeSent = true
    return [new MessageWriter(MSG_CHANNEL_CLOSE).uint32(state.remote).finish()]
  }

  consume(channel: number, length: number): ReadonlyArray<Uint8Array> {
    const state = this.channels.get(channel)
    if (state === undefined || state.closeSent) return []
    state.consumed += length
    if (state.consumed < this.window / 2) return []
    const consumed = state.consumed
    state.consumed = 0
    state.localWindow += consumed
    return [new MessageWriter(MSG_CHANNEL_WINDOW_ADJUST).uint32(state.remote).uint32(consumed).finish()]
  }

  receive(message: Uint8Array): Received {
    const messages: Array<Uint8Array> = []
    const events: Array<Event> = []
    try {
      const violation = this.handle(new MessageReader(message), messages, events)
      if (violation !== undefined) return { _tag: "Violation", description: violation }
    } catch (cause) {
      if (cause instanceof TruncatedMessage) return { _tag: "Violation", description: "truncated message" }
      throw cause
    }
    return { _tag: "Handled", messages, events }
  }

  /** Takes received data from the window, which bounds unconsumed data. */
  private receiveData(state: ChannelState, data: Uint8Array): string | undefined {
    if (data.length > this.maxPacket) return "data larger than the maximum packet size"
    if (data.length > state.localWindow) return "data beyond the window"
    state.localWindow -= data.length
  }

  private handle(reader: MessageReader, messages: Array<Uint8Array>, events: Array<Event>): string | undefined {
    const type = reader.byte()
    if (type === MSG_GLOBAL_REQUEST) {
      // No global requests are supported, such as `keepalive@openssh.com`.
      reader.string()
      if (reader.bool()) messages.push(new MessageWriter(MSG_REQUEST_FAILURE).finish())
      return
    }
    if (type === MSG_CHANNEL_OPEN) {
      // Servers open channels for forwardings this client never requests.
      reader.string()
      const sender = reader.uint32()
      messages.push(
        new MessageWriter(MSG_CHANNEL_OPEN_FAILURE).uint32(sender).uint32(OPEN_ADMINISTRATIVELY_PROHIBITED).string(
          "not supported"
        ).string("").finish()
      )
      return
    }
    if (type < MSG_CHANNEL_OPEN_CONFIRMATION || type > MSG_CHANNEL_FAILURE) return
    const state = this.channels.get(reader.uint32())
    if (state === undefined) return
    const channel = state.local
    if (!state.confirmed && type !== MSG_CHANNEL_OPEN_CONFIRMATION && type !== MSG_CHANNEL_OPEN_FAILURE) {
      return "message for an unconfirmed channel"
    }
    // After closing, only the server's confirmation, close, and requests
    // matter.
    if (
      state.closeSent && type !== MSG_CHANNEL_CLOSE && type !== MSG_CHANNEL_OPEN_CONFIRMATION &&
      type !== MSG_CHANNEL_REQUEST
    ) return
    switch (type) {
      case MSG_CHANNEL_OPEN_CONFIRMATION: {
        if (state.confirmed) return "duplicate channel confirmation"
        state.remote = reader.uint32()
        state.remoteWindow = reader.uint32()
        state.remoteMaxPacket = reader.uint32()
        if (state.remoteMaxPacket === 0) return "zero maximum packet size"
        state.confirmed = true
        if (state.abandoned) {
          state.closeSent = true
          messages.push(new MessageWriter(MSG_CHANNEL_CLOSE).uint32(state.remote).finish())
          return
        }
        events.push({ _tag: "Opened", channel })
        if (state.remoteWindow > 0) events.push({ _tag: "Writable", channel })
        return
      }
      case MSG_CHANNEL_OPEN_FAILURE: {
        if (state.confirmed) return "open failure for a confirmed channel"
        reader.uint32()
        const description = reader.string()
        this.channels.delete(channel)
        if (!state.abandoned) events.push({ _tag: "OpenFailed", channel, description })
        return
      }
      case MSG_CHANNEL_WINDOW_ADJUST: {
        state.remoteWindow = Math.min(state.remoteWindow + reader.uint32(), 0xffffffff)
        if (state.remoteWindow > 0) events.push({ _tag: "Writable", channel })
        return
      }
      case MSG_CHANNEL_DATA: {
        const data = reader.bytesField()
        const violation = this.receiveData(state, data)
        if (violation !== undefined) return violation
        events.push({ _tag: "Data", channel, stream: "stdout", data })
        return
      }
      case MSG_CHANNEL_EXTENDED_DATA: {
        const code = reader.uint32()
        const data = reader.bytesField()
        const violation = this.receiveData(state, data)
        if (violation !== undefined) return violation
        if (code === EXTENDED_DATA_STDERR) events.push({ _tag: "Data", channel, stream: "stderr", data })
        else messages.push(...this.consume(channel, data.length))
        return
      }
      case MSG_CHANNEL_EOF: {
        events.push({ _tag: "Eof", channel })
        return
      }
      case MSG_CHANNEL_CLOSE: {
        this.channels.delete(channel)
        if (!state.closeSent) {
          state.closeSent = true
          messages.push(new MessageWriter(MSG_CHANNEL_CLOSE).uint32(state.remote).finish())
        }
        if (!state.abandoned) events.push({ _tag: "Closed", channel })
        return
      }
      case MSG_CHANNEL_REQUEST: {
        const name = reader.string()
        const wantReply = reader.bool()
        if (state.closeSent) {
          // OpenSSH probes closed sessions until their commands exit. Answer
          // keepalives until the server closes the channel to avoid disconnects.
          if (wantReply) messages.push(new MessageWriter(MSG_CHANNEL_FAILURE).uint32(state.remote).finish())
          return
        }
        if (name === "exit-status") {
          events.push({ _tag: "Exit", channel, exit: { _tag: "ExitStatus", code: reader.uint32() } })
        } else if (name === "exit-signal") {
          const signal = reader.string()
          const coreDumped = reader.bool()
          const message = reader.string()
          events.push({
            _tag: "Exit",
            channel,
            exit: { _tag: "ExitSignal", signal: `SIG${signal}`, coreDumped, message }
          })
        }
        // Requests such as `keepalive@openssh.com` want a reply.
        if (wantReply) messages.push(new MessageWriter(MSG_CHANNEL_FAILURE).uint32(state.remote).finish())
        return
      }
      case MSG_CHANNEL_SUCCESS:
      case MSG_CHANNEL_FAILURE: {
        if (state.pendingReplies === 0) return "unexpected channel request reply"
        state.pendingReplies--
        events.push({ _tag: "Reply", channel, success: type === MSG_CHANNEL_SUCCESS })
        return
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Channels
// -----------------------------------------------------------------------------

/** Where a channel's events are delivered. */
interface Handle {
  readonly opened: Deferred.Deferred<void, Ssh.SshError>
  /** Open while the channel can send data or has finished. */
  readonly writable: Latch.Latch
  readonly stdout: Queue.Queue<Uint8Array, Ssh.SshError | Cause.Done>
  readonly stderr: Queue.Queue<Uint8Array, Ssh.SshError | Cause.Done>
  /** Requests waiting for a reply, oldest first. */
  readonly replies: Array<Deferred.Deferred<boolean, Ssh.SshError>>
  readonly exit: Deferred.Deferred<Ssh.SessionExit, Ssh.SshError>
  readonly closed: Deferred.Deferred<void>
}

const channelError = (description: string) => new Ssh.SshError({ reason: "Channel", description })

const closedError = () => channelError("the channel is closed")

const endedError = () => channelError("the end of data was already sent")

const connectionClosed = () => new Ssh.SshError({ reason: "Connection", description: "the connection closed" })

/** The error that ended a connection, from the cause of its failure. */
const connectionFailed = (cause: Cause.Cause<unknown>): Ssh.SshError => {
  const error = Cause.squash(cause)
  return error instanceof Ssh.SshError
    ? error
    : new Ssh.SshError({ reason: "Connection", description: "the connection failed", cause: error })
}

/**
 * Creates the protocol of one connection, which closes with the scope.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(): Effect.fn.Return<SshConnectionProtocol, never, Scope.Scope> {
  const connection = new ConnectionState()
  const handles = new Map<number, Handle>()
  const outgoing = yield* Queue.unbounded<Uint8Array, Ssh.SshError | Cause.Done>()
  let failure: Ssh.SshError | undefined
  let running = false

  const emit = (messages: ReadonlyArray<Uint8Array>) => {
    for (const message of messages) Queue.offerUnsafe(outgoing, message)
  }

  /** Releases a handle's waiters with `error`, or with end of data. */
  const settle = (handle: Handle, error: Ssh.SshError | undefined) => {
    const cause = error === undefined ? Cause.fail(Cause.Done()) : Cause.fail(error)
    Queue.failCauseUnsafe(handle.stdout, cause)
    Queue.failCauseUnsafe(handle.stderr, cause)
    const replyError = error ?? closedError()
    for (const reply of handle.replies.splice(0)) Deferred.doneUnsafe(reply, Exit.fail(replyError))
    Deferred.doneUnsafe(handle.opened, Exit.fail(replyError))
    Deferred.doneUnsafe(handle.exit, Exit.fail(error ?? channelError("the channel closed before the command exited")))
    Deferred.doneUnsafe(handle.closed, Exit.void)
    handle.writable.openUnsafe()
  }

  /**
   * Ends the connection: every channel fails with `error`, and the output
   * ends, failing with `error` unless the connection closed normally.
   */
  const fail = (error: Ssh.SshError, output: Ssh.SshError | Cause.Done) => {
    if (failure !== undefined) return
    failure = error
    for (const handle of handles.values()) settle(handle, error)
    handles.clear()
    Queue.failCauseUnsafe(outgoing, Cause.fail(output))
  }

  yield* Effect.addFinalizer(() => Effect.sync(() => fail(connectionClosed(), Cause.Done())))

  const deliver = (event: Event) => {
    const handle = handles.get(event.channel)
    if (handle === undefined) return
    switch (event._tag) {
      case "Opened":
        return Deferred.doneUnsafe(handle.opened, Exit.void)
      case "OpenFailed": {
        handles.delete(event.channel)
        return settle(
          handle,
          channelError(`the server refused to open the channel: ${event.description || "unknown reason"}`)
        )
      }
      case "Data":
        return Queue.offerUnsafe(event.stream === "stdout" ? handle.stdout : handle.stderr, event.data)
      case "Writable":
        return handle.writable.openUnsafe()
      case "Reply":
        return Deferred.doneUnsafe(handle.replies.shift()!, Exit.succeed(event.success))
      case "Exit":
        return Deferred.doneUnsafe(handle.exit, Exit.succeed(event.exit))
      case "Eof": {
        Queue.endUnsafe(handle.stdout)
        Queue.endUnsafe(handle.stderr)
        return
      }
      case "Closed": {
        handles.delete(event.channel)
        return settle(handle, undefined)
      }
    }
  }

  /** Handles the server's messages, or fails the connection on a violation. */
  const receive = (messages: NonEmptyReadonlyArray<Uint8Array>) => {
    for (const message of messages) {
      const received = connection.receive(message)
      if (received._tag === "Violation") {
        const error = new Ssh.SshError({ reason: "Protocol", description: received.description })
        return fail(error, error)
      }
      for (const event of received.events) deliver(event)
      emit(received.messages)
    }
  }

  const channel: ProtocolChannel = Channel.fromTransformBracket((upstream, _scope, forkedScope) =>
    Effect.gen(function*() {
      if (running) {
        return yield* Effect.fail(
          new Ssh.SshError({ reason: "Connection", description: "the protocol channel is already running" })
        )
      }
      running = true
      // Failures of the output's consumer, such as a failed send, fail the
      // connection too.
      yield* Scope.addFinalizerExit(forkedScope, (exit) =>
        Effect.sync(() => {
          if (Exit.isSuccess(exit) || Cause.hasInterruptsOnly(exit.cause)) return fail(connectionClosed(), Cause.Done())
          const error = connectionFailed(exit.cause)
          fail(error, error)
        }))
      yield* Effect.forever(Effect.flatMap(upstream, (messages) => Effect.sync(() => receive(messages)))).pipe(
        Effect.catchCause((cause) =>
          Effect.sync(() => {
            if (Pull.isDoneCause(cause)) return fail(connectionClosed(), Cause.Done())
            const error = connectionFailed(cause)
            fail(error, error)
          })
        ),
        Effect.forkIn(forkedScope)
      )
      return Queue.takeAll(outgoing)
    })
  )

  const makeChannel = (id: number, handle: Handle): SshChannel => {
    const consume = (queue: Queue.Queue<Uint8Array, Ssh.SshError | Cause.Done>) =>
      Stream.fromQueue(queue).pipe(
        Stream.tap((chunk) => Effect.sync(() => emit(connection.consume(id, chunk.length))))
      )
    // One write at a time, so the data of concurrent writes is not interleaved.
    const writeLock = Semaphore.makeUnsafe(1)
    const write = (data: Uint8Array | string): Effect.Effect<void, Ssh.SshError> =>
      writeLock.withPermit(Effect.suspend(() => {
        let bytes = typeof data === "string" ? encoder.encode(data) : data
        const loop: Effect.Effect<void, Ssh.SshError> = Effect.suspend(() => {
          if (failure !== undefined) return Effect.fail(failure)
          const state = connection.writeState(id)
          if (state === "Closed") return Effect.fail(connection.isOpen(id) ? endedError() : closedError())
          if (bytes.length === 0) return Effect.void
          switch (state) {
            case "Opening":
            case "Blocked": {
              handle.writable.closeUnsafe()
              return Effect.andThen(handle.writable.await, loop)
            }
            case "Ready": {
              const { messages, written } = connection.write(id, bytes)
              emit(messages)
              bytes = bytes.subarray(written)
              return loop
            }
          }
        })
        return loop
      }))
    // After pending writes, so their data is not cut off.
    const eof = writeLock.withPermit(Effect.suspend(() => {
      if (failure !== undefined) return Effect.fail(failure)
      if (!connection.isOpen(id)) return Effect.fail(closedError())
      return Effect.sync(() => emit(connection.eof(id)))
    }))
    return {
      stdout: consume(handle.stdout),
      stderr: consume(handle.stderr),
      stdin: Sink.forEach(write).pipe(Sink.mapEffect(() => eof)),
      write,
      eof,
      close: close(id, handle),
      request: (name, data, wantReply) =>
        Effect.suspend(() => {
          if (failure !== undefined) return Effect.fail(failure)
          if (!connection.isOpen(id)) return Effect.fail(closedError())
          if (!wantReply) return Effect.sync(() => emit(connection.request(id, name, data, false)))
          const reply = Deferred.makeUnsafe<boolean, Ssh.SshError>()
          handle.replies.push(reply)
          emit(connection.request(id, name, data, true))
          return Effect.flatMap(
            Deferred.await(reply),
            (accepted) => accepted ? Effect.void : Effect.fail(channelError(`the server refused the "${name}" request`))
          )
        }),
      exit: Deferred.await(handle.exit),
      closed: Deferred.await(handle.closed)
    }
  }

  const close = (id: number, handle: Handle) =>
    Effect.sync(() => {
      emit(connection.close(id))
      handles.delete(id)
      settle(handle, undefined)
    })

  const open = (type: string, data: Uint8Array): Effect.Effect<SshChannel, Ssh.SshError, Scope.Scope> =>
    Effect.uninterruptibleMask((restore) =>
      Effect.gen(function*() {
        if (failure !== undefined) return yield* Effect.fail(failure)
        const handle: Handle = {
          opened: Deferred.makeUnsafe(),
          writable: Latch.makeUnsafe(false),
          stdout: yield* Queue.unbounded<Uint8Array, Ssh.SshError | Cause.Done>(),
          stderr: yield* Queue.unbounded<Uint8Array, Ssh.SshError | Cause.Done>(),
          replies: [],
          exit: Deferred.makeUnsafe(),
          closed: Deferred.makeUnsafe()
        }
        const { channel: id, messages } = connection.open(type, data)
        handles.set(id, handle)
        yield* Effect.addFinalizer(() => close(id, handle))
        emit(messages)
        // Interrupted opens close at once rather than with the scope.
        yield* restore(Deferred.await(handle.opened)).pipe(Effect.onError(() => close(id, handle)))
        return makeChannel(id, handle)
      })
    )

  return { channel, open }
})

// -----------------------------------------------------------------------------
// Commands, subsystems, and tunnels (RFC 4254 sections 6 and 7)
// -----------------------------------------------------------------------------

/**
 * Options of `toSshConnection`.
 *
 * **Details**
 *
 * `forwardAgent` requests agent forwarding for every command. The transport
 * must be able to forward the agent, as an OpenSSH master started with
 * `ForwardAgent=yes` does.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface ConnectionOptions {
  readonly forwardAgent?: boolean | undefined
}

const empty = new Uint8Array(0)

/**
 * Rejects text with NUL characters, on which OpenSSH servers drop the whole
 * connection.
 */
const withoutNul = (value: string, name: string): Effect.Effect<string, Ssh.SshError> =>
  value.includes("\0") ? Effect.fail(channelError(`${name} contains a NUL character`)) : Effect.succeed(value)

const targetFromInput = (
  target: Ssh.ForwardTarget
): Effect.Effect<Host.HostPort | NetAddress.UnixPathAddress, Ssh.SshError> =>
  typeof target === "object" && "path" in target
    ? Effect.map(
      withoutNul(target.path, "the socket path"),
      (path) => NetAddress.isUnixPathAddress(target) ? target : NetAddress.unixPathAddress(path)
    )
    : Effect.fromResult(
      Result.mapError(
        Host.hostPortFromInput(target),
        (error) => channelError(`invalid forward target: ${error.message}`)
      )
    )

/**
 * Runs commands, subsystems, and tunnels as channels of a protocol.
 *
 * **Details**
 *
 * - Each command runs in a `session` channel. With `pty`, it requests an
 *   80x24 terminal of type `pty.term` (default `xterm`) with the server's
 *   default modes. With `forwardAgent`, each command requests the agent and,
 *   like OpenSSH's client, runs without it when the server refuses.
 * - `signal` sends a `signal` request and accepts names with or without the
 *   `SIG` prefix. Servers do not confirm it.
 * - `subsystem` starts a subsystem in a `session` channel, and `forwardOut`
 *   opens a `direct-tcpip` or `direct-streamlocal@openssh.com` channel. The
 *   origin of TCP tunnels is reported as `127.0.0.1` port 0.
 * - Requests the server refuses, channels it cannot open, and names or paths
 *   with NUL characters fail with a `Channel` error.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const toSshConnection = (
  protocol: SshConnectionProtocol,
  options?: ConnectionOptions
): Ssh.SshConnection => {
  /** Opens a session and sends its requests, closing it when they fail. */
  const session = Effect.fnUntraced(function*(requests: (channel: SshChannel) => Effect.Effect<void, Ssh.SshError>) {
    const channel = yield* protocol.open("session", empty)
    yield* Effect.onError(requests(channel), () => channel.close)
    return channel
  })

  const exec = Effect.fnUntraced(function*(
    command: string,
    { pty }: { readonly pty?: boolean | Ssh.PtyOptions | undefined }
  ) {
    const term = yield* withoutNul((typeof pty === "object" ? pty.term : undefined) ?? "xterm", "pty.term")
    const channel = yield* session(Effect.fnUntraced(function*(channel) {
      if (options?.forwardAgent === true) yield* channel.request("auth-agent-req@openssh.com", empty, false)
      if (pty !== undefined && pty !== false) {
        // No terminal modes, so the server's defaults apply (RFC 4254 section 8).
        const fields = new MessageWriter().string(term).uint32(80).uint32(24).uint32(0).uint32(0)
          .string(Uint8Array.of(0))
        yield* channel.request("pty-req", fields.finish(), true)
      }
      yield* channel.request("exec", new MessageWriter().string(command).finish(), true)
    }))
    const process: Ssh.SshProcess = {
      stdout: channel.stdout,
      stderr: channel.stderr,
      stdin: channel.stdin,
      write: channel.write,
      eof: channel.eof,
      close: channel.close,
      closed: channel.closed,
      exit: channel.exit,
      signal: (signal) =>
        Effect.flatMap(
          withoutNul(signal.startsWith("SIG") ? signal.slice(3) : signal, "the signal name"),
          (name) => channel.request("signal", new MessageWriter().string(name).finish(), false)
        )
    }
    return process
  })

  const subsystem = Effect.fnUntraced(function*(name: string) {
    yield* withoutNul(name, "the subsystem name")
    return yield* session((channel) => channel.request("subsystem", new MessageWriter().string(name).finish(), true))
  })

  const forwardOut = Effect.fnUntraced(function*(target: Ssh.ForwardTarget) {
    const address = yield* targetFromInput(target)
    if (NetAddress.isUnixPathAddress(address)) {
      const fields = new MessageWriter().string(address.path).string("").uint32(0)
      return yield* protocol.open("direct-streamlocal@openssh.com", fields.finish())
    }
    const fields = new MessageWriter().string(Host.formatHost(address.host)).uint32(address.port)
      .string("127.0.0.1").uint32(0)
    return yield* protocol.open("direct-tcpip", fields.finish())
  })

  return Ssh.makeConnection({ exec, subsystem, forwardOut })
}
