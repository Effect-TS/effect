import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import { Tracer } from "effect"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Pool from "effect/Pool"
import * as Queue from "effect/Queue"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Transferable from "../Transferable.js"
import type * as Worker from "../Worker.js"
import { WorkerError } from "../WorkerError.js"

/** @internal */
export const defaultQueue = <I>() =>
  Effect.map(
    Queue.unbounded<readonly [id: number, item: I, span: Option.Option<Tracer.Span>]>(),
    (queue): Worker.WorkerQueue<I> => ({
      offer: (id, item, span) => Queue.offer(queue, [id, item, span]),
      take: Queue.take(queue),
      shutdown: Queue.shutdown(queue)
    })
  )

/** @internal */
export const PlatformWorkerTypeId: Worker.PlatformWorkerTypeId = Symbol.for(
  "@effect/platform/Worker/PlatformWorker"
) as Worker.PlatformWorkerTypeId

/** @internal */
export const PlatformWorker = Context.GenericTag<Worker.PlatformWorker>(
  "@effect/platform/Worker/PlatformWorker"
)

/** @internal */
export const WorkerManagerTypeId: Worker.WorkerManagerTypeId = Symbol.for(
  "@effect/platform/Worker/WorkerManager"
) as Worker.WorkerManagerTypeId

/** @internal */
export const WorkerManager = Context.GenericTag<Worker.WorkerManager>(
  "@effect/platform/Worker/WorkerManager"
)

/** @internal */
export const makeManager = Effect.gen(function*(_) {
  const platform = yield* _(PlatformWorker)
  let idCounter = 0
  return WorkerManager.of({
    [WorkerManagerTypeId]: WorkerManagerTypeId,
    spawn<I, E, O>({
      encode,
      initialMessage,
      permits = 1,
      queue,
      spawn,
      transfers = (_) => []
    }: Worker.Worker.Options<I>) {
      return Effect.gen(function*(_) {
        const id = idCounter++
        let requestIdCounter = 0
        const semaphore = yield* _(Effect.makeSemaphore(permits))
        const requestMap = new Map<
          number,
          readonly [Queue.Queue<Exit.Exit<ReadonlyArray<O>, E | WorkerError>>, Deferred.Deferred<void>]
        >()
        const sendQueue = yield* _(Effect.acquireRelease(
          Queue.unbounded<readonly [message: Worker.Worker.Request, transfers?: ReadonlyArray<unknown>]>(),
          Queue.shutdown
        ))

        const collector = Transferable.unsafeMakeCollector()
        const wrappedEncode = encode ?
          ((message: I) =>
            Effect.zipRight(
              collector.clear,
              Effect.provideService(encode(message), Transferable.Collector, collector)
            )) :
          Effect.succeed

        const outbound = queue ?? (yield* _(defaultQueue<I>()))
        yield* _(Effect.addFinalizer(() => outbound.shutdown))

        yield* _(
          Effect.gen(function*(_) {
            const readyLatch = yield* _(Deferred.make<void>())
            const backing = yield* _(
              platform.spawn<Worker.Worker.Request, Worker.Worker.Response<E, O>>(spawn(id))
            )
            const send = pipe(
              sendQueue.take,
              Effect.flatMap(([message, transfers]) => backing.send(message, transfers)),
              Effect.forever
            )
            const take = pipe(
              Queue.take(backing.queue),
              Effect.flatMap((msg) => {
                if (msg[0] === 0) {
                  return Deferred.complete(readyLatch, Effect.unit)
                }
                return handleMessage(msg[1])
              }),
              Effect.forever
            )
            return yield* _(Effect.all([
              Fiber.join(backing.fiber),
              Effect.zipRight(Deferred.await(readyLatch), send),
              take
            ], { concurrency: "unbounded" }))
          }),
          Effect.scoped,
          Effect.onError((cause) =>
            Effect.forEach(requestMap.values(), ([queue]) => Queue.offer(queue, Exit.failCause(cause)))
          ),
          Effect.retry(
            Schedule.exponential("250 millis").pipe(
              Schedule.union(Schedule.spaced("30 seconds"))
            )
          ),
          Effect.annotateLogs({
            package: "@effect/platform",
            module: "Worker"
          }),
          Effect.interruptible,
          Effect.forkScoped
        )

        yield* _(Effect.addFinalizer(() =>
          Effect.zipRight(
            Effect.forEach(requestMap.values(), ([queue]) => Queue.offer(queue, Exit.failCause(Cause.empty)), {
              discard: true
            }),
            Effect.sync(() => requestMap.clear())
          )
        ))

        const handleMessage = (response: Worker.Worker.Response<E, O>) =>
          Effect.suspend(() => {
            const queue = requestMap.get(response[0])
            if (!queue) return Effect.unit

            switch (response[1]) {
              // data
              case 0: {
                return Queue.offer(queue[0], Exit.succeed(response[2]))
              }
              // end
              case 1: {
                return response.length === 2 ?
                  Queue.offer(queue[0], Exit.failCause(Cause.empty)) :
                  Effect.zipRight(
                    Queue.offer(queue[0], Exit.succeed(response[2])),
                    Queue.offer(queue[0], Exit.failCause(Cause.empty))
                  )
              }
              // error / defect
              case 2:
              case 3: {
                return Queue.offer(
                  queue[0],
                  response[1] === 2
                    ? Exit.fail(response[2])
                    : Exit.die(response[2])
                )
              }
            }
          })

        const executeAcquire = (request: I) =>
          Effect.tap(
            Effect.all([
              Effect.sync(() => requestIdCounter++),
              Queue.unbounded<Exit.Exit<ReadonlyArray<O>, E | WorkerError>>(),
              Deferred.make<void>(),
              Effect.map(
                Effect.serviceOption(Tracer.ParentSpan),
                Option.filter((span): span is Tracer.Span => span._tag === "Span")
              )
            ]),
            ([id, queue, deferred, span]) =>
              Effect.suspend(() => {
                requestMap.set(id, [queue, deferred])
                return outbound.offer(id, request, span)
              })
          )

        const executeRelease = (
          [id, , deferred]: [
            number,
            Queue.Queue<Exit.Exit<ReadonlyArray<O>, E | WorkerError>>,
            Deferred.Deferred<void>,
            Option.Option<Tracer.Span>
          ],
          exit: Exit.Exit<unknown, unknown>
        ) => {
          const release = Effect.zipRight(
            Deferred.complete(deferred, Effect.unit),
            Effect.sync(() => requestMap.delete(id))
          )
          return Exit.isFailure(exit) ?
            Effect.zipRight(sendQueue.offer([[id, 1]]), release) :
            release
        }

        const execute = (request: I) =>
          Stream.flatMap(
            Stream.acquireRelease(
              executeAcquire(request),
              executeRelease
            ),
            ([, queue]) => {
              const loop: Channel.Channel<Chunk.Chunk<O>, unknown, E | WorkerError, unknown, void, unknown> = Channel
                .flatMap(
                  Queue.take(queue),
                  Exit.match({
                    onFailure: (cause) => Cause.isEmpty(cause) ? Channel.unit : Channel.failCause(cause),
                    onSuccess: (value) => Channel.flatMap(Channel.write(Chunk.unsafeFromArray(value)), () => loop)
                  })
                )
              return Stream.fromChannel(loop)
            }
          )

        const executeEffect = (request: I) =>
          Effect.acquireUseRelease(
            executeAcquire(request),
            ([, queue]) => Effect.flatMap(Queue.take(queue), Exit.map(ReadonlyArray.unsafeGet(0))),
            executeRelease
          )

        yield* _(
          semaphore.take(1),
          Effect.zipRight(outbound.take),
          Effect.flatMap(([id, request, span]) =>
            pipe(
              Effect.suspend(() => {
                const result = requestMap.get(id)
                if (!result) return Effect.unit
                const transferables = transfers(request)
                const spanTuple = Option.getOrUndefined(
                  Option.map(span, (span) => [span.traceId, span.spanId, span.sampled] as const)
                )
                return pipe(
                  Effect.flatMap(
                    wrappedEncode(request),
                    (payload) =>
                      sendQueue.offer([[id, 0, payload, spanTuple], [
                        ...transferables,
                        ...collector.unsafeRead()
                      ]])
                  ),
                  Effect.catchAllCause((cause) => Queue.offer(result[0], Exit.failCause(cause))),
                  Effect.zipRight(Deferred.await(result[1]))
                )
              }),
              Effect.ensuring(semaphore.release(1)),
              Effect.fork
            )
          ),
          Effect.forever,
          Effect.interruptible,
          Effect.forkScoped
        )

        if (initialMessage) {
          yield* _(
            Effect.sync(initialMessage),
            Effect.flatMap(executeEffect),
            Effect.mapError((error) => WorkerError("spawn", error))
          )
        }

        return { id, execute, executeEffect }
      }).pipe(Effect.parallelFinalizers)
    }
  })
})

/** @internal */
export const layerManager = Layer.effect(WorkerManager, makeManager)

/** @internal */
export const makePool = <W>() =>
<I, E, O>(
  options: Worker.WorkerPool.Options<I, W>
) =>
  Effect.gen(function*(_) {
    const manager = yield* _(WorkerManager)
    const workers = new Set<Worker.Worker<I, E, O>>()
    const acquire = pipe(
      manager.spawn<I, E, O>(options),
      Effect.tap((worker) => Effect.sync(() => workers.add(worker))),
      Effect.tap((worker) => Effect.addFinalizer(() => Effect.sync(() => workers.delete(worker)))),
      options.onCreate ? Effect.tap(options.onCreate) : identity
    )
    const backing = yield* _(
      "timeToLive" in options ?
        Pool.makeWithTTL({
          acquire,
          min: options.minSize,
          max: options.maxSize,
          timeToLive: options.timeToLive
        }) :
        Pool.make({
          acquire,
          size: options.size
        })
    )
    const pool: Worker.WorkerPool<I, E, O> = {
      backing,
      broadcast: (message: I) =>
        Effect.forEach(workers, (worker) => worker.executeEffect(message), {
          concurrency: "unbounded",
          discard: true
        }),
      execute: (message: I) =>
        Stream.unwrap(
          Effect.map(
            Effect.scoped(backing.get),
            (worker) => worker.execute(message)
          )
        ),
      executeEffect: (message: I) =>
        Effect.flatMap(
          Effect.scoped(backing.get),
          (worker) => worker.executeEffect(message)
        )
    }

    return pool
  })

/** @internal */
export const makePoolLayer = <W>(managerLayer: Layer.Layer<Worker.WorkerManager>) =>
<Tag, I, E, O>(
  tag: Context.Tag<Tag, Worker.WorkerPool<I, E, O>>,
  options: Worker.WorkerPool.Options<I, W>
) => Layer.scoped(tag, makePool<W>()(options)).pipe(Layer.provide(managerLayer))

/** @internal */
export const makeSerialized = <
  I extends Schema.TaggedRequest.Any,
  W = unknown
>(
  options: Worker.SerializedWorker.Options<I, W>
): Effect.Effect<Worker.SerializedWorker<I>, WorkerError, Worker.WorkerManager | Scope.Scope> =>
  Effect.gen(function*(_) {
    const manager = yield* _(WorkerManager)
    const backing = yield* _(
      manager.spawn({
        ...options as any,
        encode(message) {
          return Effect.mapError(Serializable.serialize(message as any), (error) => WorkerError("encode", error))
        }
      })
    )
    const execute = <Req extends I>(message: Req) => {
      const parseSuccess = Schema.decode(Serializable.successSchema(message as any))
      const parseFailure = Schema.decode(Serializable.failureSchema(message as any))
      return pipe(
        backing.execute(message),
        Stream.catchAll((error) => Effect.flatMap(parseFailure(error), Effect.fail)),
        Stream.mapEffect(parseSuccess)
      )
    }
    const executeEffect = <Req extends I>(message: Req) => {
      const parseSuccess = Schema.decode(Serializable.successSchema(message as any))
      const parseFailure = Schema.decode(Serializable.failureSchema(message as any))
      return Effect.matchEffect(backing.executeEffect(message), {
        onFailure: (error) => Effect.flatMap(parseFailure(error), Effect.fail),
        onSuccess: parseSuccess
      })
    }
    return identity<Worker.SerializedWorker<I>>({
      id: backing.id,
      execute: execute as any,
      executeEffect: executeEffect as any
    })
  })

/** @internal */
export const makePoolSerialized = <W>() =>
<I extends Schema.TaggedRequest.Any>(
  options: Worker.SerializedWorkerPool.Options<I, W>
) =>
  Effect.gen(function*(_) {
    const manager = yield* _(WorkerManager)
    const workers = new Set<Worker.SerializedWorker<I>>()
    const acquire = pipe(
      makeSerialized<I, W>(options),
      Effect.tap((worker) => Effect.sync(() => workers.add(worker))),
      Effect.tap((worker) => Effect.addFinalizer(() => Effect.sync(() => workers.delete(worker)))),
      options.onCreate ? Effect.tap(options.onCreate) : identity,
      Effect.provideService(WorkerManager, manager)
    )
    const backing = yield* _(
      "timeToLive" in options ?
        Pool.makeWithTTL({
          acquire,
          min: options.minSize,
          max: options.maxSize,
          timeToLive: options.timeToLive
        }) :
        Pool.make({
          acquire,
          size: options.size
        })
    )
    const pool: Worker.SerializedWorkerPool<I> = {
      backing,
      broadcast: <Req extends I>(message: Req) =>
        Effect.forEach(workers, (worker) => worker.executeEffect(message), {
          concurrency: "unbounded",
          discard: true
        }) as any,
      execute: <Req extends I>(message: Req) =>
        Stream.unwrap(
          Effect.map(
            Effect.scoped(backing.get),
            (worker) => worker.execute(message)
          )
        ) as any,
      executeEffect: <Req extends I>(message: Req) =>
        Effect.flatMap(
          Effect.scoped(backing.get),
          (worker) => worker.executeEffect(message)
        ) as any
    }

    return pool
  })

/** @internal */
export const makePoolSerializedLayer =
  <W>(managerLayer: Layer.Layer<Worker.WorkerManager>) =>
  <Tag, I extends Schema.TaggedRequest.Any>(
    tag: Context.Tag<Tag, Worker.SerializedWorkerPool<I>>,
    options: Worker.SerializedWorkerPool.Options<I, W>
  ) => Layer.scoped(tag, makePoolSerialized<W>()(options)).pipe(Layer.provide(managerLayer))
