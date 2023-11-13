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
import * as Pool from "effect/Pool"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import type * as Worker from "../Worker.js"
import type { WorkerError } from "../WorkerError.js"

/** @internal */
export const defaultQueue = <I>() =>
  Effect.map(
    Queue.unbounded<readonly [id: number, item: I]>(),
    (queue): Worker.WorkerQueue<I> => ({
      offer: (id, item) => Queue.offer(queue, [id, item]),
      take: Queue.take(queue),
      shutdown: Queue.shutdown(queue)
    })
  )

/** @internal */
export const PlatformWorkerTypeId: Worker.PlatformWorkerTypeId = Symbol.for(
  "@effect/platform/Worker/PlatformWorker"
) as Worker.PlatformWorkerTypeId

/** @internal */
export const PlatformWorker = Context.Tag<Worker.PlatformWorker>(
  PlatformWorkerTypeId
)

/** @internal */
export const WorkerManagerTypeId: Worker.WorkerManagerTypeId = Symbol.for(
  "@effect/platform/Worker/WorkerManager"
) as Worker.WorkerManagerTypeId

/** @internal */
export const WorkerManager = Context.Tag<Worker.WorkerManager>(
  WorkerManagerTypeId
)

/** @internal */
export const makeManager = Effect.gen(function*(_) {
  const platform = yield* _(PlatformWorker)
  let idCounter = 0
  return WorkerManager.of({
    [WorkerManagerTypeId]: WorkerManagerTypeId,
    spawn<I, E, O>({ encode, permits = 1, queue, spawn, transfers = (_) => [] }: Worker.Worker.Options<I>) {
      return Effect.gen(function*(_) {
        const id = idCounter++
        let requestIdCounter = 0
        const readyLatch = yield* _(Deferred.make<never, void>())
        const semaphore = yield* _(Effect.makeSemaphore(permits))
        const requestMap = new Map<number, readonly [Queue.Queue<Exit.Exit<E, O>>, Deferred.Deferred<never, void>]>()

        const outbound = queue ?? (yield* _(defaultQueue<I>()))
        yield* _(Effect.addFinalizer(() => outbound.shutdown))

        const backing = yield* _(
          platform.spawn<Worker.Worker.Request, Worker.Worker.Response<E, O>>(spawn(id))
        )

        yield* _(Effect.addFinalizer(() =>
          Effect.zipRight(
            Effect.forEach(requestMap.values(), ([queue]) => Queue.offer(queue, Exit.failCause(Cause.empty)), {
              discard: true
            }),
            Effect.sync(() => requestMap.clear())
          )
        ))

        const handleMessage = (msg: Worker.BackingWorker.Message<Worker.Worker.Response<E, O>>) =>
          Effect.suspend(() => {
            switch (msg[0]) {
              case 0: {
                return Deferred.complete(readyLatch, Effect.unit)
              }
              case 1: {
                const response = msg[1]
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
              }
            }
          })

        const executeAcquire = (request: I) =>
          Effect.tap(
            Effect.all([
              Effect.sync(() => requestIdCounter++),
              Queue.unbounded<Exit.Exit<E, O>>(),
              Deferred.make<never, void>()
            ]),
            ([id, queue, deferred]) =>
              Effect.suspend(() => {
                requestMap.set(id, [queue, deferred])
                return outbound.offer(id, request)
              })
          )

        const executeRelease = (
          [id, , deferred]: [number, Queue.Queue<Exit.Exit<E, O>>, Deferred.Deferred<never, void>],
          exit: Exit.Exit<unknown, unknown>
        ) => {
          const release = Effect.zipRight(
            Deferred.complete(deferred, Effect.unit),
            Effect.sync(() => requestMap.delete(id))
          )
          return Exit.isInterrupted(exit) ?
            Effect.zipRight(
              backing.send([id, 1]),
              release
            ) :
            release
        }

        const execute = (request: I) =>
          Stream.flatMap(
            Stream.acquireRelease(
              executeAcquire(request),
              executeRelease
            ),
            ([, queue]) => {
              const loop: Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<O>, void> = Channel.flatMap(
                Queue.take(queue),
                Exit.match({
                  onFailure: (cause) => Cause.isEmpty(cause) ? Channel.unit : Channel.failCause(cause),
                  onSuccess: (value) => Channel.flatMap(Channel.write(Chunk.of(value)), () => loop)
                })
              )
              return Stream.fromChannel(loop)
            }
          )

        const executeEffect = (request: I) =>
          Effect.acquireUseRelease(
            executeAcquire(request),
            ([, queue]) => Effect.flatten(Queue.take(queue)),
            executeRelease
          )

        const handleMessages = yield* _(
          Queue.take(backing.queue),
          Effect.flatMap(handleMessage),
          Effect.forever,
          Effect.interruptible,
          Effect.forkScoped
        )

        const postMessages = yield* _(
          semaphore.take(1),
          Effect.zipRight(outbound.take),
          Effect.flatMap(([id, request]) =>
            pipe(
              Effect.suspend(() => {
                const result = requestMap.get(id)
                if (!result) return Effect.unit
                const transferables = transfers(request)
                const payload = encode ? encode(request) : request
                return Effect.zipRight(
                  backing.send([id, 0, payload], transferables),
                  Deferred.await(result[1])
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

        const join = Fiber.joinAll([backing.fiber, handleMessages, postMessages]) as Effect.Effect<
          never,
          WorkerError,
          never
        >

        return { id, join, execute, executeEffect }
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
            Effect.scoped(backing.get()),
            (worker) => worker.execute(message)
          )
        ),
      executeEffect: (message: I) =>
        Effect.flatMap(
          Effect.scoped(backing.get()),
          (worker) => worker.executeEffect(message)
        )
    }

    return pool
  })

/** @internal */
export const makePoolLayer = <W>(managerLayer: Layer.Layer<never, never, Worker.WorkerManager>) =>
<Tag, I, E, O>(
  tag: Context.Tag<Tag, Worker.WorkerPool<I, E, O>>,
  options: Worker.WorkerPool.Options<I, W>
) =>
  Layer.provide(
    managerLayer,
    Layer.scoped(
      tag,
      makePool<W>()(options)
    )
  )
