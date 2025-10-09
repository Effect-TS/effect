/**
 * Chrome DevTools Protocol implementation for the Debug service.
 *
 * @category Internal
 * @internal
 * @since 0.0.0
 */
import * as Socket from "@effect/platform/Socket"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Debug from "../DebugModel.js"

interface RawMessage {
  readonly id?: number
  readonly method?: string
  readonly params?: unknown
  readonly result?: unknown
  readonly error?: unknown
  readonly sessionId?: string
  readonly targetId?: string
}

interface PendingRequest {
  readonly command: Debug.Command<any, any>
  readonly deferred: Deferred.Deferred<any, Debug.DebugError>
}

interface SessionState {
  readonly scope: Scope.CloseableScope
  readonly writer: (chunk: string) => Effect.Effect<void, Socket.SocketError>
  readonly pending: Ref.Ref<Map<number, PendingRequest>>
  readonly nextId: Ref.Ref<number>
  readonly subscribers: Ref.Ref<ReadonlyArray<Queue.Queue<Debug.Event>>>
  readonly transport: Debug.Transport
  readonly endpoint: string
  readonly closed: Ref.Ref<boolean>
}

const decoder = new TextDecoder()
const sessionStates = new WeakMap<Debug.Session, SessionState>()

const getState = (session: Debug.Session): Effect.Effect<SessionState, Debug.DebugStateError> =>
  Effect.sync(() => sessionStates.get(session)).pipe(
    Effect.flatMap((state) =>
      state
        ? Effect.succeed(state)
        : Effect.fail(
          new Debug.DebugStateError({
            transport: session.transport,
            endpoint: session.endpoint,
            reason: "Debug session is not active"
          })
        )
    )
  )

const failAllPending = (state: SessionState, error: Debug.DebugError): Effect.Effect<void> =>
  Effect.gen(function*() {
    const entries = yield* Ref.modify(
      state.pending,
      (map): readonly [Array<PendingRequest>, Map<number, PendingRequest>] => {
        const pending = Array.from(map.values())
        map.clear()
        return [pending, map]
      }
    )
    yield* Effect.forEach(entries, (entry) => Effect.intoDeferred(Effect.fail(error), entry.deferred))
  })

const shutdownSubscribers = (state: SessionState): Effect.Effect<void> =>
  Effect.gen(function*() {
    const subscribers = yield* Ref.modify(
      state.subscribers,
      (subs): readonly [ReadonlyArray<Queue.Queue<Debug.Event>>, ReadonlyArray<Queue.Queue<Debug.Event>>] => [subs, []]
    )
    yield* Effect.forEach(subscribers, Queue.shutdown)
  })

const handleIncoming = (state: SessionState, chunk: string | Uint8Array): Effect.Effect<void, Debug.DebugError> =>
  Effect.gen(function*() {
    const text = typeof chunk === "string" ? chunk : decoder.decode(chunk)
    const message = yield* Effect.try<RawMessage, Debug.DebugInvalidMessage>({
      try: () => JSON.parse(text) as RawMessage,
      catch: (cause) =>
        new Debug.DebugInvalidMessage({
          transport: state.transport,
          endpoint: state.endpoint,
          cause
        })
    })

    const id = message.id
    if (typeof id === "number") {
      const pending = yield* Ref.modify(state.pending, (map) => {
        const entry = map.get(id)
        if (entry) {
          map.delete(id)
        }
        return [entry, map]
      })
      if (!pending) {
        return
      }
      if (message.error !== undefined) {
        yield* Effect.intoDeferred(
          Effect.fail(
            new Debug.DebugCommandError({
              transport: state.transport,
              endpoint: state.endpoint,
              command: pending.command.command,
              detail: message.error
            })
          ),
          pending.deferred
        )
        return
      }
      const decoded = yield* Schema.decodeUnknown(pending.command.response)(message.result).pipe(
        Effect.mapError((cause) =>
          new Debug.DebugDecodeError({
            transport: state.transport,
            endpoint: state.endpoint,
            command: pending.command.command,
            cause
          })
        )
      )
      yield* Effect.intoDeferred(Effect.succeed(decoded), pending.deferred)
      return
    }

    if (typeof message.method === "string") {
      const subscribers = yield* Ref.get(state.subscribers)
      if (subscribers.length === 0) {
        return
      }
      const event: Debug.Event = {
        transport: state.transport,
        method: message.method,
        params: message.params,
        sessionId: typeof message.sessionId === "string" ? message.sessionId : undefined,
        targetId: typeof message.targetId === "string" ? message.targetId : undefined
      }
      yield* Effect.forEach(subscribers, (queue) => Queue.offer(queue, event))
    }
  })

const releaseSession = (session: Debug.Session): Effect.Effect<void> =>
  Effect.gen(function*() {
    const state = sessionStates.get(session)
    if (!state) {
      return
    }
    const alreadyClosed = yield* Ref.get(state.closed)
    if (alreadyClosed) {
      return
    }
    yield* Ref.set(state.closed, true)
    sessionStates.delete(session)
    const transportError = new Debug.DebugTransportError({
      transport: state.transport,
      endpoint: state.endpoint,
      cause: new Error("Debug session closed")
    })
    yield* failAllPending(state, transportError)
    yield* shutdownSubscribers(state)
    yield* Scope.close(state.scope, Exit.void)
  })

const createSession = (
  options: Debug.ConnectOptions
): Effect.Effect<Debug.Session, Debug.DebugError, Scope.Scope | Socket.WebSocketConstructor | Debug.Transport> =>
  Effect.gen(function*() {
    const transport = options.transport ?? (yield* Debug.CurrentTransport)
    if (transport._tag !== "Cdp") {
      return yield* Effect.fail(
        new Debug.DebugStateError({
          transport,
          endpoint: options.endpoint,
          reason: "CDP layer only supports Cdp transport"
        })
      )
    }

    const scope: Scope.CloseableScope = yield* Scope.make()
    const socket = yield* Scope.extend(Socket.makeWebSocket(options.endpoint), scope)
    const writer = yield* Scope.extend(socket.writer, scope)
    const nextId = yield* Ref.make(1)
    const pending = yield* Ref.make(new Map<number, PendingRequest>())
    const subscribers = yield* Ref.make<ReadonlyArray<Queue.Queue<Debug.Event>>>([])
    const closed = yield* Ref.make(false)

    const session: Debug.Session = {
      [Debug.SessionTypeId]: Debug.SessionTypeId,
      transport,
      endpoint: options.endpoint
    }

    const state: SessionState = {
      scope,
      writer,
      pending,
      nextId,
      subscribers,
      transport,
      endpoint: options.endpoint,
      closed
    }

    sessionStates.set(session, state)

    const pump = socket.runRaw((chunk) => handleIncoming(state, chunk)).pipe(
      Effect.mapError((cause) =>
        Socket.isSocketError(cause)
          ? new Debug.DebugTransportError({
            transport: state.transport,
            endpoint: state.endpoint,
            cause
          })
          : cause
      ),
      Effect.catchAll((error) =>
        Effect.zipRight(
          failAllPending(state, error),
          Effect.zipRight(shutdownSubscribers(state), Effect.fail(error))
        )
      )
    )

    yield* Scope.extend(Effect.forkScoped(pump), scope)

    return session
  })

const connect = (options: Debug.ConnectOptions) => Effect.acquireRelease(createSession(options), releaseSession)

const disconnect: Debug.Service["disconnect"] = (session) =>
  Effect.gen(function*() {
    yield* getState(session)
    yield* releaseSession(session)
  })

const sendCommand: Debug.Service["sendCommand"] = (session, cmd) =>
  Effect.gen(function*() {
    const state = yield* getState(session)
    if (cmd.transport._tag !== state.transport._tag) {
      return yield* Effect.fail(
        new Debug.DebugStateError({
          transport: cmd.transport,
          endpoint: state.endpoint,
          reason: "Command transport does not match the session transport"
        })
      )
    }

    const id = yield* Ref.modify(state.nextId, (current) => [current, current + 1])
    const deferred = yield* Deferred.make<any, Debug.DebugError>()
    yield* Ref.update(state.pending, (map) => {
      map.set(id, { command: cmd, deferred })
      return map
    })

    const payload: Record<string, unknown> = {
      id,
      method: cmd.command
    }
    if (cmd.params !== undefined) {
      payload.params = cmd.params
    }
    if (cmd.sessionId !== undefined) {
      payload.sessionId = cmd.sessionId
    }
    if (cmd.targetId !== undefined) {
      payload.targetId = cmd.targetId
    }

    yield* state.writer(JSON.stringify(payload)).pipe(
      Effect.mapError((cause: unknown) =>
        new Debug.DebugTransportError({
          transport: state.transport,
          endpoint: state.endpoint,
          cause
        })
      ),
      Effect.tapError((error: Debug.DebugError) =>
        Ref.update(state.pending, (map) => {
          map.delete(id)
          return map
        }).pipe(
          Effect.zipRight(Effect.intoDeferred(Effect.fail(error), deferred))
        )
      )
    )

    return yield* Deferred.await(deferred)
  })

const subscribe: Debug.Service["subscribe"] = (session) =>
  Effect.acquireRelease(
    Effect.gen(function*() {
      const state = yield* getState(session)
      const queue = yield* Queue.unbounded<Debug.Event>()
      yield* Ref.update(state.subscribers, (subs) => [...subs, queue])
      return { state, queue }
    }),
    ({ queue, state }) =>
      Ref.update(state.subscribers, (subs) => subs.filter((candidate) => candidate !== queue)).pipe(
        Effect.zipRight(Queue.shutdown(queue))
      )
  ).pipe(
    Effect.map(({ queue }) => Stream.fromQueue(queue, { shutdown: true }))
  )

const makeService: Effect.Effect<Debug.Service, never, Socket.WebSocketConstructor> = Effect.gen(function*() {
  const webSocketConstructor = yield* Socket.WebSocketConstructor

  const connectWithConstructor: Debug.Service["connect"] = (options) =>
    Effect.provide(
      connect(options),
      Layer.succeed(Socket.WebSocketConstructor, webSocketConstructor)
    )

  return {
    connect: connectWithConstructor,
    disconnect,
    sendCommand,
    subscribe
  }
})

/**
 * @internal
 * @since 0.0.0
 */
export const layer: Layer.Layer<Debug.Service | Debug.Transport, never, Socket.WebSocketConstructor> = Layer
  .provideMerge(
    Layer.effect(Debug.Debug, makeService),
    Layer.succeed(Debug.CurrentTransport, Debug.Transport.cdp())
  )
