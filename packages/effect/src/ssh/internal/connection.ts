/**
 * SSH connection protocol (RFC 4254): channel multiplexing, flow control,
 * global requests, and channel requests.
 *
 * @internal
 */
import * as Cause from "../../Cause.ts"
import * as Deferred from "../../Deferred.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Latch from "../../Latch.ts"
import * as Queue from "../../Queue.ts"
import type * as Scope from "../../Scope.ts"
import * as Semaphore from "../../Semaphore.ts"
import * as Sink from "../../Sink.ts"
import * as Stream from "../../Stream.ts"
import type { SessionExit, SshChannel } from "../SshClient.ts"
import { SshChannelError, SshChannelOpenError, SshError, SshRequestError } from "../SshError.ts"
import * as Constants from "./constants.ts"
import type { Transport } from "./transport.ts"
import { protocolError } from "./transport.ts"
import { Reader, utf8, Writer } from "./wire.ts"

/** @internal */
export interface ConnectionOptions {
  readonly windowSize: number
  readonly maxPacketSize: number
}

/** @internal */
export interface IncomingChannel {
  readonly type: string
  readonly data: Reader
}

/**
 * Handles a server-initiated channel open. Returns `undefined` to reject it,
 * or a callback that receives the accepted channel.
 *
 * @internal
 */
export type ChannelOpenHandler = (
  request: IncomingChannel
) => ((channel: ChannelImpl) => void) | undefined

/** @internal */
export interface Connection {
  readonly openChannel: (
    type: string,
    data?: Uint8Array | undefined
  ) => Effect.Effect<ChannelImpl, SshError, Scope.Scope>
  readonly globalRequest: (
    name: string,
    data: Uint8Array | undefined,
    wantReply: boolean
  ) => Effect.Effect<Uint8Array, SshError>
  readonly addChannelOpenHandler: (type: string, handler: ChannelOpenHandler) => () => void
  readonly failed: Effect.Effect<never, SshError>
}

const channelClosedError = () => new SshError({ reason: new SshChannelError({ description: "channel is closed" }) })

/** @internal */
export class ChannelImpl implements SshChannel {
  readonly type: string
  readonly id: number
  remoteId = 0
  remoteWindow = 0
  remoteMaxPacket = 0
  localWindow: number
  consumed = 0

  eofSent = false
  abandoned = false
  closeSent = false
  closeReceived = false
  failure: SshError | undefined

  readonly stdoutQueue: Queue.Queue<Uint8Array, SshError | Cause.Done>
  readonly stderrQueue: Queue.Queue<Uint8Array, SshError | Cause.Done>
  readonly windowLatch = Latch.makeUnsafe(false)
  readonly writeLock = Semaphore.makeUnsafe(1)
  readonly pendingRequests: Array<Deferred.Deferred<boolean, SshError>> = []
  readonly exitDeferred = Deferred.makeUnsafe<SessionExit>()
  readonly closedDeferred = Deferred.makeUnsafe<void>()

  readonly stdout: Stream.Stream<Uint8Array, SshError>
  readonly stderr: Stream.Stream<Uint8Array, SshError>
  readonly stdin: Sink.Sink<void, Uint8Array, never, SshError>
  readonly closed: Effect.Effect<void>
  readonly exit: Effect.Effect<SessionExit, SshError>

  private readonly transport: Transport
  private readonly options: ConnectionOptions

  constructor(options: {
    readonly type: string
    readonly id: number
    readonly transport: Transport
    readonly connection: ConnectionOptions
    readonly stdoutQueue: Queue.Queue<Uint8Array, SshError | Cause.Done>
    readonly stderrQueue: Queue.Queue<Uint8Array, SshError | Cause.Done>
  }) {
    this.type = options.type
    this.id = options.id
    this.transport = options.transport
    this.options = options.connection
    this.localWindow = options.connection.windowSize
    this.stdoutQueue = options.stdoutQueue
    this.stderrQueue = options.stderrQueue
    this.stdout = this.makeStream(this.stdoutQueue)
    this.stderr = this.makeStream(this.stderrQueue)
    this.stdin = Sink.forEachArray((chunks: ReadonlyArray<Uint8Array>) =>
      Effect.forEach(chunks, (chunk) => this.write(chunk), { discard: true })
    ).pipe(Sink.mapEffect(() => this.eof))
    this.closed = Deferred.await(this.closedDeferred)
    this.exit = Effect.raceFirst(
      Deferred.await(this.exitDeferred),
      Effect.andThen(
        Deferred.await(this.closedDeferred),
        Effect.suspend(() =>
          Deferred.isDoneUnsafe(this.exitDeferred)
            ? Deferred.await(this.exitDeferred)
            : Effect.fail(
              this.failure ??
                new SshError({ reason: new SshChannelError({ description: "channel closed without an exit status" }) })
            )
        )
      )
    )
  }

  private makeStream(queue: Queue.Queue<Uint8Array, SshError | Cause.Done>): Stream.Stream<Uint8Array, SshError> {
    return Stream.fromPull(Effect.succeed(Effect.map(Queue.takeAll(queue), (chunks) => {
      let size = 0
      for (let i = 0; i < chunks.length; i++) size += chunks[i].length
      this.consume(size)
      return chunks
    })))
  }

  /**
   * Returns window space to the server once the consumer has processed data.
   */
  consume(size: number): void {
    this.consumed += size
    if (this.closeReceived || this.closeSent || this.consumed < this.options.windowSize / 2) return
    const adjust = this.consumed
    this.consumed = 0
    this.localWindow += adjust
    this.transport.post(
      new Writer(16).byte(Constants.MSG_CHANNEL_WINDOW_ADJUST).uint32(this.remoteId).uint32(adjust).finish()
    )
  }

  write(data: Uint8Array | string): Effect.Effect<void, SshError> {
    const bytes = typeof data === "string" ? utf8(data) : data
    if (bytes.length === 0) return Effect.void
    return this.writeLock.withPermit(Effect.gen({ self: this }, function*() {
      let offset = 0
      while (offset < bytes.length) {
        if (this.failure !== undefined) return yield* this.failure
        if (this.closeSent || this.closeReceived || this.eofSent) return yield* channelClosedError()
        if (this.remoteWindow === 0) {
          this.windowLatch.closeUnsafe()
          yield* this.windowLatch.await
          continue
        }
        const size = Math.min(this.remoteWindow, this.remoteMaxPacket, bytes.length - offset)
        this.remoteWindow -= size
        const chunk = bytes.subarray(offset, offset + size)
        offset += size
        const payload = new Writer(size + 16)
          .byte(Constants.MSG_CHANNEL_DATA)
          .uint32(this.remoteId)
          .string(chunk)
          .finish()
        // Intermediate chunks are bounded by the remote window, so only the
        // final chunk waits for the socket write.
        if (offset < bytes.length) {
          this.transport.post(payload)
        } else {
          yield* this.transport.send(payload)
        }
      }
    }))
  }

  get eof(): Effect.Effect<void, SshError> {
    return Effect.suspend(() => {
      if (this.eofSent || this.closeSent || this.closeReceived) return Effect.void
      this.eofSent = true
      return this.transport.send(new Writer(8).byte(Constants.MSG_CHANNEL_EOF).uint32(this.remoteId).finish())
    })
  }

  get close(): Effect.Effect<void> {
    return Effect.suspend(() => {
      this.sendClose()
      return Deferred.await(this.closedDeferred).pipe(
        Effect.raceFirst(Effect.ignore(this.transport.failed)),
        Effect.timeoutOption(Duration.seconds(10)),
        Effect.asVoid
      )
    })
  }

  sendClose(): void {
    if (this.closeSent) return
    this.closeSent = true
    this.transport.post(new Writer(8).byte(Constants.MSG_CHANNEL_CLOSE).uint32(this.remoteId).finish())
  }

  request(
    type: string,
    options?: {
      readonly data?: Uint8Array | undefined
      readonly wantReply?: boolean | undefined
    }
  ): Effect.Effect<boolean, SshError> {
    return Effect.suspend(() => {
      if (this.failure !== undefined) return Effect.fail(this.failure)
      if (this.closeSent || this.closeReceived) return Effect.fail(channelClosedError())
      const wantReply = options?.wantReply ?? true
      const writer = new Writer().byte(Constants.MSG_CHANNEL_REQUEST).uint32(this.remoteId).string(type).bool(wantReply)
      if (options?.data !== undefined) writer.raw(options.data)
      const payload = writer.finish()
      if (!wantReply) return Effect.as(this.transport.send(payload), true)
      const deferred = Deferred.makeUnsafe<boolean, SshError>()
      this.pendingRequests.push(deferred)
      return Effect.andThen(this.transport.send(payload), Deferred.await(deferred))
    })
  }

  requestOrFail(type: string, data?: Uint8Array): Effect.Effect<void, SshError> {
    return Effect.flatMap(
      this.request(type, { data, wantReply: true }),
      (ok) => ok ? Effect.void : Effect.fail(new SshError({ reason: new SshRequestError({ requestType: type }) }))
    )
  }

  signal(signal: string): Effect.Effect<void, SshError> {
    const name = signal.startsWith("SIG") ? signal.slice(3) : signal
    return Effect.asVoid(this.request("signal", { data: new Writer().string(name).finish(), wantReply: false }))
  }

  resize(size: {
    readonly columns: number
    readonly rows: number
    readonly width?: number | undefined
    readonly height?: number | undefined
  }): Effect.Effect<void, SshError> {
    return Effect.asVoid(this.request("window-change", {
      data: new Writer()
        .uint32(size.columns)
        .uint32(size.rows)
        .uint32(size.width ?? 0)
        .uint32(size.height ?? 0)
        .finish(),
      wantReply: false
    }))
  }

  /**
   * Marks the channel as finished, waking every waiter.
   */
  terminate(error: SshError | undefined): void {
    if (error !== undefined && this.failure === undefined && !this.closeReceived) {
      this.failure = error
      Queue.failCauseUnsafe(this.stdoutQueue, Cause.fail(error))
      Queue.failCauseUnsafe(this.stderrQueue, Cause.fail(error))
    } else {
      Queue.endUnsafe(this.stdoutQueue)
      Queue.endUnsafe(this.stderrQueue)
    }
    this.closeReceived = true
    for (const request of this.pendingRequests.splice(0)) {
      Deferred.doneUnsafe(request, error !== undefined ? Effect.fail(error) : Effect.succeed(false))
    }
    this.windowLatch.openUnsafe()
    Deferred.doneUnsafe(this.closedDeferred, Effect.void)
  }
}

/** @internal */
export const make = Effect.fnUntraced(function*(
  transport: Transport,
  options: ConnectionOptions
): Effect.fn.Return<Connection, never, Scope.Scope> {
  const scope = yield* Effect.scope
  const channels = new Map<number, ChannelImpl>()
  const pendingOpens = new Map<number, Deferred.Deferred<void, SshError>>()
  const pendingGlobal: Array<Deferred.Deferred<Uint8Array, SshError>> = []
  const openHandlers = new Map<string, ChannelOpenHandler>()
  let nextId = 0
  let failure: SshError | undefined

  const makeChannel = Effect.fnUntraced(function*(type: string) {
    const id = nextId++
    const channel = new ChannelImpl({
      type,
      id,
      transport,
      connection: options,
      stdoutQueue: yield* Queue.unbounded<Uint8Array, SshError | Cause.Done>(),
      stderrQueue: yield* Queue.unbounded<Uint8Array, SshError | Cause.Done>()
    })
    channels.set(id, channel)
    return channel
  })

  const openChannel = (type: string, data?: Uint8Array) =>
    Effect.acquireRelease(
      Effect.gen(function*() {
        if (failure !== undefined) return yield* failure
        const channel = yield* makeChannel(type)
        const opened = Deferred.makeUnsafe<void, SshError>()
        pendingOpens.set(channel.id, opened)
        const writer = new Writer()
          .byte(Constants.MSG_CHANNEL_OPEN)
          .string(type)
          .uint32(channel.id)
          .uint32(options.windowSize)
          .uint32(options.maxPacketSize)
        if (data !== undefined) writer.raw(data)
        yield* transport.send(writer.finish())
        // Waiting for the server is interruptible; a confirmation that
        // arrives after the caller gave up closes the channel again.
        yield* Effect.raceFirst(Deferred.await(opened), transport.failed).pipe(
          Effect.interruptible,
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              channel.abandoned = true
            })
          )
        )
        return channel
      }),
      (channel) => channel.close
    )

  const globalRequest = (name: string, data: Uint8Array | undefined, wantReply: boolean) =>
    Effect.suspend(() => {
      if (failure !== undefined) return Effect.fail(failure)
      const writer = new Writer().byte(Constants.MSG_GLOBAL_REQUEST).string(name).bool(wantReply)
      if (data !== undefined) writer.raw(data)
      const payload = writer.finish()
      if (!wantReply) return Effect.as(transport.send(payload), new Uint8Array(0))
      const deferred = Deferred.makeUnsafe<Uint8Array, SshError>()
      pendingGlobal.push(deferred)
      return Effect.andThen(transport.send(payload), Deferred.await(deferred))
    })

  const getChannel = (reader: Reader): ChannelImpl | undefined => channels.get(reader.uint32())

  const handleChannelOpen = (reader: Reader) => {
    const type = reader.utf8()
    const senderId = reader.uint32()
    const window = reader.uint32()
    const maxPacket = reader.uint32()
    const reject = (code: number, description: string) =>
      transport.post(
        new Writer()
          .byte(Constants.MSG_CHANNEL_OPEN_FAILURE)
          .uint32(senderId)
          .uint32(code)
          .string(description)
          .string("")
          .finish()
      )
    const handler = openHandlers.get(type)
    const accept = handler?.({ type, data: reader })
    if (accept === undefined) {
      return Effect.sync(() =>
        handler === undefined
          ? reject(Constants.OPEN_UNKNOWN_CHANNEL_TYPE, "unsupported channel type")
          : reject(Constants.OPEN_ADMINISTRATIVELY_PROHIBITED, "not accepted")
      )
    }
    return Effect.map(makeChannel(type), (channel) => {
      channel.remoteId = senderId
      channel.remoteWindow = window
      channel.remoteMaxPacket = Math.min(maxPacket, options.maxPacketSize)
      transport.post(
        new Writer()
          .byte(Constants.MSG_CHANNEL_OPEN_CONFIRMATION)
          .uint32(senderId)
          .uint32(channel.id)
          .uint32(options.windowSize)
          .uint32(options.maxPacketSize)
          .finish()
      )
      accept(channel)
    })
  }

  const handleChannelRequest = (channel: ChannelImpl, reader: Reader) => {
    const type = reader.utf8()
    const wantReply = reader.bool()
    switch (type) {
      case "exit-status": {
        Deferred.doneUnsafe(channel.exitDeferred, Effect.succeed({ _tag: "ExitStatus", code: reader.uint32() }))
        break
      }
      case "exit-signal": {
        const signal = reader.utf8()
        const coreDumped = reader.bool()
        const message = reader.utf8()
        Deferred.doneUnsafe(
          channel.exitDeferred,
          Effect.succeed({ _tag: "ExitSignal", signal: `SIG${signal}`, coreDumped, message })
        )
        break
      }
    }
    if (wantReply) {
      transport.post(new Writer(8).byte(Constants.MSG_CHANNEL_FAILURE).uint32(channel.remoteId).finish())
    }
  }

  const handle = (payload: Uint8Array): Effect.Effect<void, SshError> => {
    const reader = new Reader(payload, 1)
    switch (payload[0]) {
      case Constants.MSG_GLOBAL_REQUEST: {
        reader.utf8()
        if (reader.bool()) {
          transport.post(new Uint8Array([Constants.MSG_REQUEST_FAILURE]))
        }
        return Effect.void
      }
      case Constants.MSG_REQUEST_SUCCESS:
      case Constants.MSG_REQUEST_FAILURE: {
        const deferred = pendingGlobal.shift()
        if (deferred === undefined) return Effect.fail(protocolError("unexpected global request reply"))
        Deferred.doneUnsafe(
          deferred,
          payload[0] === Constants.MSG_REQUEST_SUCCESS
            ? Effect.succeed(reader.rest())
            : Effect.fail(new SshError({ reason: new SshRequestError({ requestType: "global" }) }))
        )
        return Effect.void
      }
      case Constants.MSG_CHANNEL_OPEN:
        return handleChannelOpen(reader)
      case Constants.MSG_CHANNEL_OPEN_CONFIRMATION: {
        const channel = getChannel(reader)
        const opened = channel && pendingOpens.get(channel.id)
        if (channel === undefined || opened === undefined) {
          return Effect.fail(protocolError("unexpected channel open confirmation"))
        }
        pendingOpens.delete(channel.id)
        channel.remoteId = reader.uint32()
        channel.remoteWindow = reader.uint32()
        channel.remoteMaxPacket = Math.min(reader.uint32(), options.maxPacketSize)
        if (channel.abandoned) channel.sendClose()
        Deferred.doneUnsafe(opened, Effect.void)
        return Effect.void
      }
      case Constants.MSG_CHANNEL_OPEN_FAILURE: {
        const channel = getChannel(reader)
        const opened = channel && pendingOpens.get(channel.id)
        if (channel === undefined || opened === undefined) {
          return Effect.fail(protocolError("unexpected channel open failure"))
        }
        pendingOpens.delete(channel.id)
        channels.delete(channel.id)
        const code = reader.uint32()
        const description = reader.utf8()
        channel.closeSent = true
        channel.terminate(undefined)
        Deferred.doneUnsafe(
          opened,
          Effect.fail(
            new SshError({ reason: new SshChannelOpenError({ channelType: channel.type, code, description }) })
          )
        )
        return Effect.void
      }
      case Constants.MSG_CHANNEL_WINDOW_ADJUST: {
        const channel = getChannel(reader)
        if (channel === undefined) return Effect.void
        channel.remoteWindow = Math.min(channel.remoteWindow + reader.uint32(), 0xffffffff)
        channel.windowLatch.openUnsafe()
        return Effect.void
      }
      case Constants.MSG_CHANNEL_DATA:
      case Constants.MSG_CHANNEL_EXTENDED_DATA: {
        const channel = getChannel(reader)
        if (channel === undefined) return Effect.void
        const code = payload[0] === Constants.MSG_CHANNEL_EXTENDED_DATA ? reader.uint32() : undefined
        const data = reader.string()
        channel.localWindow -= data.length
        if (channel.localWindow < 0) return Effect.fail(protocolError("channel window exceeded"))
        if (code === undefined) {
          Queue.offerUnsafe(channel.stdoutQueue, data)
        } else if (code === Constants.EXTENDED_DATA_STDERR) {
          Queue.offerUnsafe(channel.stderrQueue, data)
        } else {
          channel.consume(data.length)
        }
        return Effect.void
      }
      case Constants.MSG_CHANNEL_EOF: {
        const channel = getChannel(reader)
        if (channel === undefined) return Effect.void
        Queue.endUnsafe(channel.stdoutQueue)
        Queue.endUnsafe(channel.stderrQueue)
        return Effect.void
      }
      case Constants.MSG_CHANNEL_CLOSE: {
        const channel = getChannel(reader)
        if (channel === undefined) return Effect.void
        channels.delete(channel.id)
        channel.sendClose()
        channel.terminate(undefined)
        return Effect.void
      }
      case Constants.MSG_CHANNEL_REQUEST: {
        const channel = getChannel(reader)
        if (channel !== undefined) handleChannelRequest(channel, reader)
        return Effect.void
      }
      case Constants.MSG_CHANNEL_SUCCESS:
      case Constants.MSG_CHANNEL_FAILURE: {
        const channel = getChannel(reader)
        const deferred = channel?.pendingRequests.shift()
        if (deferred !== undefined) {
          Deferred.doneUnsafe(deferred, Effect.succeed(payload[0] === Constants.MSG_CHANNEL_SUCCESS))
        }
        return Effect.void
      }
    }
    return Effect.void
  }

  const terminate = (error: SshError, failTransport: boolean) =>
    Effect.sync(() => {
      if (failure !== undefined) return
      failure = error
      if (failTransport) transport.fail(error)
      for (const deferred of pendingGlobal.splice(0)) Deferred.doneUnsafe(deferred, Effect.fail(error))
      for (const deferred of pendingOpens.values()) Deferred.doneUnsafe(deferred, Effect.fail(error))
      pendingOpens.clear()
      for (const channel of channels.values()) channel.terminate(error)
      channels.clear()
    })

  const dispatcher = Effect.gen(function*() {
    while (true) {
      const payload = yield* transport.receive
      yield* Effect.suspend(() => handle(payload)).pipe(
        Effect.catchDefect((cause) => Effect.fail(protocolError("malformed connection message", cause)))
      )
    }
  }).pipe(
    Effect.catch((error) => terminate(error, true)),
    // Shutting down leaves the transport intact so it can still send a
    // disconnect message.
    Effect.onInterrupt(() =>
      terminate(new SshError({ reason: new SshChannelError({ description: "connection closed" }) }), false)
    )
  )

  yield* Effect.forkIn(dispatcher, scope)

  return {
    openChannel,
    globalRequest,
    addChannelOpenHandler: (type, handler) => {
      openHandlers.set(type, handler)
      return () => {
        if (openHandlers.get(type) === handler) openHandlers.delete(type)
      }
    },
    failed: transport.failed
  }
})
