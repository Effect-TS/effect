import { assert, describe, it } from "@effect/vitest"
import { type Cause, Deferred, Effect, Fiber, Queue, Stream } from "effect"
import * as AiError from "effect/ai/AiError"
import * as RealtimeModel from "effect/ai/RealtimeModel"

const format: RealtimeModel.AudioFormat = { encoding: "pcm_s16le", sampleRate: 24_000, channels: 1 }
const started: RealtimeModel.Event = { type: "response-start", responseId: "response-1" }
const audio = (delta: Uint8Array): RealtimeModel.Event => ({
  type: "audio-delta",
  responseId: "response-1",
  itemId: "item-1",
  contentIndex: 0,
  delta
})
const transportError = () =>
  AiError.make({
    module: "TestRealtimeProvider",
    method: "events",
    reason: new AiError.NetworkError({
      reason: "TransportError",
      method: "GET",
      url: "wss://example.test/realtime",
      description: "Connection failed"
    })
  })

const makeProvider = Effect.gen(function*() {
  const incoming = yield* Queue.unbounded<RealtimeModel.Event, AiError.AiError | Cause.Done>()
  const closed = yield* Deferred.make<void>()
  const sent: Array<RealtimeModel.Command> = []
  let closes = 0
  let sendFailure: AiError.AiError | undefined
  const connection: RealtimeModel.ProviderConnection = {
    inputFormat: format,
    outputFormat: format,
    events: Stream.fromEffectRepeat(Queue.take(incoming)),
    send: (command) =>
      Effect.suspend(() => {
        sent.push(command)
        return sendFailure === undefined ? Effect.void : Effect.fail(sendFailure)
      }),
    close: Effect.gen(function*() {
      closes++
      yield* Queue.end(incoming)
      yield* Deferred.succeed(closed, undefined)
    })
  }
  const model = RealtimeModel.make({ connect: () => Effect.succeed(connection) })
  return {
    model,
    connection,
    sent,
    emit: (event: RealtimeModel.Event) => Queue.offer(incoming, event),
    finish: Queue.end(incoming),
    fail: (error: AiError.AiError) => Queue.fail(incoming, error),
    closed: Deferred.await(closed),
    closes: () => closes,
    failSend: (error: AiError.AiError | undefined) => {
      sendFailure = error
    }
  }
})

const finiteModel = (events: ReadonlyArray<RealtimeModel.Event>) =>
  RealtimeModel.make({
    connect: () =>
      Effect.succeed({
        inputFormat: format,
        outputFormat: format,
        events: Stream.fromIterable(events),
        send: () => Effect.void,
        close: Effect.void
      })
  })

describe("RealtimeModel", () => {
  it.effect("connect waits for provider readiness and preserves its configuration", () =>
    Effect.gen(function*() {
      const entered = yield* Deferred.make<void>()
      const ready = yield* Deferred.make<void>()
      const provider = yield* makeProvider
      const settings: RealtimeModel.ConnectOptions = { instructions: "Speak briefly", turnDetection: "manual" }
      const model = RealtimeModel.make({
        connect: Effect.fnUntraced(function*(options: RealtimeModel.ConnectOptions) {
          assert.strictEqual(options, settings)
          yield* Deferred.succeed(entered, undefined)
          yield* Deferred.await(ready)
          return provider.connection
        })
      })
      const connecting = yield* Effect.forkChild(model.connect(settings))
      yield* Deferred.await(entered)
      assert.isUndefined(connecting.pollUnsafe())
      yield* Deferred.succeed(ready, undefined)
      const session = yield* Fiber.join(connecting)
      assert.deepStrictEqual(session.inputFormat, format)
      assert.deepStrictEqual(session.outputFormat, format)
      yield* session.close
    }))

  it.effect("caught connection failure immediately releases readiness resources inside a live caller scope", () =>
    Effect.gen(function*() {
      const original = transportError()
      let released = 0
      let callerClosed = false
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          callerClosed = true
        })
      )
      const model = RealtimeModel.make({
        connect: Effect.fnUntraced(function*() {
          yield* Effect.acquireRelease(Effect.void, () =>
            Effect.sync(() => {
              released++
            }))
          return yield* original
        })
      })
      const failure = yield* model.connect().pipe(Effect.flip)
      assert.strictEqual(failure, original)
      assert.strictEqual(released, 1)
      assert.isFalse(callerClosed)
    }))

  it.effect("cancelling readiness releases acquired resources", () =>
    Effect.gen(function*() {
      const acquired = yield* Deferred.make<void>()
      let released = 0
      const model = RealtimeModel.make({
        connect: Effect.fnUntraced(function*() {
          yield* Effect.acquireRelease(
            Deferred.succeed(acquired, undefined),
            () =>
              Effect.sync(() => {
                released++
              })
          )
          return yield* Effect.never
        })
      })
      const connecting = yield* Effect.forkChild(model.connect())
      yield* Deferred.await(acquired)
      yield* Fiber.interrupt(connecting)
      assert.strictEqual(released, 1)
    }))

  it.effect("validates buffer bounds before acquiring a provider", () =>
    Effect.gen(function*() {
      let acquired = 0
      const model = RealtimeModel.make({
        connect: () =>
          Effect.sync(() => {
            acquired++
            return {
              inputFormat: format,
              outputFormat: format,
              events: Stream.never,
              send: () => Effect.void,
              close: Effect.void
            }
          })
      })
      for (const key of ["maxBufferedEvents", "maxBufferedAudioBytes", "maxEventBytes"] as const) {
        for (const value of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
          const failure = yield* model.connect({ [key]: value }).pipe(Effect.flip)
          assert.strictEqual(failure.reason._tag, "InvalidUserInputError")
        }
      }
      assert.strictEqual(acquired, 0)
    }))

  it.effect("event overflow fails await and consumption instead of silently dropping events", () =>
    Effect.gen(function*() {
      const session = yield* finiteModel([started, started, started]).connect({ maxBufferedEvents: 2 })
      const failure = yield* session.await.pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "InvalidResponseError")
      assert.strictEqual(yield* Stream.runCollect(session.events).pipe(Effect.flip), failure)
    }))

  it.effect("buffered audio bytes are bounded independently of event count", () =>
    Effect.gen(function*() {
      const session = yield* finiteModel([audio(new Uint8Array(6)), audio(new Uint8Array(6))]).connect({
        maxBufferedEvents: 8,
        maxBufferedAudioBytes: 8
      })
      assert.strictEqual((yield* session.await.pipe(Effect.flip)).reason._tag, "InvalidResponseError")
    }))

  it.effect("retained audio backing buffers cannot bypass the audio byte budget", () =>
    Effect.gen(function*() {
      const session = yield* finiteModel([
        audio(new Uint8Array(32).subarray(0, 4)),
        audio(new Uint8Array(32).subarray(0, 4))
      ]).connect({ maxBufferedAudioBytes: 8, maxEventBytes: 4_096 })
      assert.strictEqual((yield* session.await.pipe(Effect.flip)).reason._tag, "InvalidResponseError")
    }))

  it.effect("rejects an individual oversized normalized audio event", () =>
    Effect.gen(function*() {
      const session = yield* finiteModel([audio(new Uint8Array(10))]).connect({ maxEventBytes: 8 })
      assert.strictEqual((yield* session.await.pipe(Effect.flip)).reason._tag, "InvalidResponseError")
    }))

  it.effect("the normalized event limit includes identifiers as well as payloads", () =>
    Effect.gen(function*() {
      const session = yield* finiteModel([{ type: "response-start", responseId: "r".repeat(1_024) }]).connect({
        maxEventBytes: 128
      })
      assert.strictEqual((yield* session.await.pipe(Effect.flip)).reason._tag, "InvalidResponseError")
    }))

  it.effect("the service accessor acquires a scoped session through natural generator usage", () =>
    Effect.gen(function*() {
      const model = yield* RealtimeModel.RealtimeModel
      const session = yield* RealtimeModel.connect()
      assert.strictEqual(model[RealtimeModel.TypeId], RealtimeModel.TypeId)
      assert.deepStrictEqual(session.inputFormat, format)
      yield* session.close
    }).pipe(Effect.provideService(RealtimeModel.RealtimeModel, finiteModel([]))))

  it.effect("event consumption is lazy and can be claimed only once", () =>
    Effect.gen(function*() {
      const provider = yield* makeProvider
      const session = yield* provider.model.connect()
      const entered = yield* Deferred.make<void>()
      const unused = Stream.runDrain(session.events)
      const first = yield* Effect.forkChild(
        Stream.runForEach(session.events, () => Deferred.succeed(entered, undefined))
      )
      yield* provider.emit(started)
      yield* Deferred.await(entered)
      const failure = yield* unused.pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "InvalidUserInputError")
      assert.strictEqual(provider.closes(), 0)
      yield* Fiber.interrupt(first)
      yield* provider.closed
      assert.strictEqual(provider.closes(), 1)
    }))

  it.effect("close is idempotent, ends consumers and rejects further commands", () =>
    Effect.gen(function*() {
      const provider = yield* makeProvider
      const session = yield* provider.model.connect()
      yield* session.close
      yield* session.close
      yield* session.await
      assert.strictEqual(provider.closes(), 1)
      assert.deepStrictEqual(yield* Stream.runCollect(session.events), [])
      assert.strictEqual(
        (yield* session.send({ type: "audio-commit" }).pipe(Effect.flip)).reason._tag,
        "InvalidUserInputError"
      )
    }))

  it.effect("a failed event handler closes its provider without replacing the handler error", () =>
    Effect.gen(function*() {
      const provider = yield* makeProvider
      const session = yield* provider.model.connect()
      yield* provider.emit(started)
      const failure = yield* Stream.runForEach(session.events, () => Effect.fail("handler failed")).pipe(Effect.flip)
      assert.strictEqual(failure, "handler failed")
      yield* session.await
      assert.strictEqual(provider.closes(), 1)
    }))

  it.effect("invalid audio and truncation commands do not reach the provider or fail the session", () =>
    Effect.gen(function*() {
      const provider = yield* makeProvider
      const session = yield* provider.model.connect({ maxEventBytes: 8 })
      const commands: Array<RealtimeModel.Command> = [
        { type: "audio-append", data: new Uint8Array(0) },
        { type: "audio-append", data: new Uint8Array(10) },
        { type: "item-truncate", itemId: "item-1", contentIndex: -1, audioEndMs: 0 },
        { type: "item-truncate", itemId: "item-1", contentIndex: 0, audioEndMs: 0.5 },
        { type: "item-truncate", itemId: "item-1", contentIndex: 0, audioEndMs: Number.NaN }
      ]
      for (const command of commands) {
        assert.strictEqual((yield* session.send(command).pipe(Effect.flip)).reason._tag, "InvalidUserInputError")
      }
      assert.deepStrictEqual(provider.sent, [])
      yield* session.send({ type: "audio-commit" })
      assert.deepStrictEqual(provider.sent, [{ type: "audio-commit" }])
      yield* session.close
      yield* session.await
    }))

  it.effect("provider event failures settle await and retain their identity", () =>
    Effect.gen(function*() {
      const provider = yield* makeProvider
      const session = yield* provider.model.connect()
      const original = transportError()
      yield* provider.fail(original)
      assert.strictEqual(yield* session.await.pipe(Effect.flip), original)
      assert.strictEqual(yield* Stream.runCollect(session.events).pipe(Effect.flip), original)
      yield* provider.closed
      assert.strictEqual(provider.closes(), 1)
    }))

  it.effect("send failures also settle the reliable session outcome", () =>
    Effect.gen(function*() {
      const provider = yield* makeProvider
      const session = yield* provider.model.connect()
      const original = transportError()
      provider.failSend(original)
      assert.strictEqual(yield* session.send({ type: "response-create" }).pipe(Effect.flip), original)
      assert.strictEqual(yield* session.await.pipe(Effect.flip), original)
      assert.strictEqual(provider.closes(), 1)
    }))

  it.effect("a provider command validation rejection leaves the session healthy", () =>
    Effect.gen(function*() {
      const provider = yield* makeProvider
      const session = yield* provider.model.connect()
      const original = AiError.make({
        module: "TestRealtimeProvider",
        method: "send",
        reason: new AiError.InvalidUserInputError({ description: "This provider does not support that command" })
      })
      provider.failSend(original)
      assert.strictEqual(yield* session.send({ type: "response-create" }).pipe(Effect.flip), original)
      assert.strictEqual(provider.closes(), 0)

      provider.failSend(undefined)
      yield* session.send({ type: "audio-commit" })
      yield* provider.emit(started)
      yield* provider.finish
      yield* session.await
      assert.deepStrictEqual(yield* Stream.runCollect(session.events), [started])
      assert.deepStrictEqual(provider.sent, [{ type: "response-create" }, { type: "audio-commit" }])
    }))

  it.effect("natural EOF does not settle await until provider cleanup finishes", () =>
    Effect.gen(function*() {
      const cleanupEntered = yield* Deferred.make<void>()
      const releaseCleanup = yield* Deferred.make<void>()
      const waitingEntered = yield* Deferred.make<void>()
      let released = 0
      const model = RealtimeModel.make({
        connect: Effect.fnUntraced(function*() {
          yield* Effect.acquireRelease(Effect.void, () =>
            Effect.sync(() => {
              released++
            }))
          return {
            inputFormat: format,
            outputFormat: format,
            events: Stream.empty,
            send: () => Effect.void,
            close: Deferred.succeed(cleanupEntered, undefined).pipe(Effect.andThen(Deferred.await(releaseCleanup)))
          }
        })
      })
      const session = yield* model.connect()
      const waiting = yield* Effect.forkChild(
        Deferred.succeed(waitingEntered, undefined).pipe(Effect.andThen(session.await))
      )
      yield* Deferred.await(waitingEntered)
      yield* Deferred.await(cleanupEntered)
      assert.isUndefined(waiting.pollUnsafe())
      assert.strictEqual(released, 0)
      yield* Deferred.succeed(releaseCleanup, undefined)
      yield* Fiber.join(waiting)
      assert.strictEqual(released, 1)
    }))

  it.effect("natural EOF cleanup failure reaches await and closes provider resources", () =>
    Effect.gen(function*() {
      const original = transportError()
      let released = 0
      const model = RealtimeModel.make({
        connect: Effect.fnUntraced(function*() {
          yield* Effect.acquireRelease(Effect.void, () =>
            Effect.sync(() => {
              released++
            }))
          return {
            inputFormat: format,
            outputFormat: format,
            events: Stream.empty,
            send: () => Effect.void,
            close: Effect.fail(original)
          }
        })
      })
      const session = yield* model.connect()
      assert.strictEqual(yield* session.await.pipe(Effect.flip), original)
      assert.strictEqual(yield* Stream.runCollect(session.events).pipe(Effect.flip), original)
      assert.strictEqual(released, 1)
    }))

  it.effect("shares cleanup when close races natural provider completion", () =>
    Effect.gen(function*() {
      const entered = yield* Deferred.make<void>()
      const proceed = yield* Deferred.make<void>()
      let closes = 0
      const model = RealtimeModel.make({
        connect: () =>
          Effect.succeed({
            inputFormat: format,
            outputFormat: format,
            events: Stream.empty,
            send: () => Effect.void,
            close: Effect.gen(function*() {
              closes++
              yield* Deferred.succeed(entered, undefined)
              yield* Deferred.await(proceed)
            })
          })
      })
      const session = yield* model.connect()
      yield* Deferred.await(entered)
      const closing = yield* Effect.forkChild(session.close)
      yield* Effect.yieldNow
      const pending = closing.pollUnsafe()
      const closeCount = closes
      yield* Deferred.succeed(proceed, undefined)
      yield* Fiber.join(closing)
      yield* session.await
      assert.isUndefined(pending)
      assert.strictEqual(closeCount, 1)
    }))

  it.effect("natural provider completion preserves queued events for ordered draining", () =>
    Effect.gen(function*() {
      const provider = yield* makeProvider
      const session = yield* provider.model.connect()
      const delta = audio(new Uint8Array([1, 2, 3, 4]))
      const ended: RealtimeModel.Event = { type: "response-end", responseId: "response-1", status: "completed" }
      yield* provider.emit(started)
      yield* provider.emit(delta)
      yield* provider.emit(ended)
      yield* provider.finish
      yield* session.await
      const events = yield* Stream.runCollect(session.events)
      assert.deepStrictEqual(events, [started, delta, ended])
      assert.strictEqual(events[1], delta)
      yield* provider.closed
      assert.strictEqual(provider.closes(), 1)
    }))

  it.effect("generation cancellation is a provider command and does not silently revoke playback events", () =>
    Effect.gen(function*() {
      const provider = yield* makeProvider
      const session = yield* provider.model.connect()
      const cancellation: RealtimeModel.Command = {
        type: "response-cancel",
        responseId: "response-1",
        eventId: "cancel-1"
      }
      yield* session.send(cancellation)
      const delta = audio(new Uint8Array([1, 2]))
      const ended: RealtimeModel.Event = { type: "response-end", responseId: "response-1", status: "cancelled" }
      yield* provider.emit(delta)
      yield* provider.emit(ended)
      assert.deepStrictEqual(yield* Stream.runCollect(session.events.pipe(Stream.take(2))), [delta, ended])
      assert.deepStrictEqual(provider.sent, [cancellation])
      assert.strictEqual(provider.closes(), 1)
    }))
})
