import * as Channel from "effect/Channel"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import * as FiberSet from "effect/FiberSet"
import { identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as Option from "effect/Option"
import * as Pool from "effect/Pool"
import * as Runtime from "effect/Runtime"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Tracer from "effect/Tracer"
import * as Transferable from "../Transferable.js"
import type * as Worker from "../Worker.js"
import { WorkerError } from "../WorkerError.js"

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
export const Spawner = Context.GenericTag<Worker.Spawner, Worker.SpawnerFn>(
  "@effect/platform/Worker/Spawner"
)

/** @internal */
export const makeManager = Effect.gen(function*() {
  const platform = yield* PlatformWorker
  let idCounter = 0
  return WorkerManager.of({
    [WorkerManagerTypeId]: WorkerManagerTypeId,
    spawn<I, O, E>({
      encode,
      initialMessage
    }: Worker.Worker.Options<I>) {
      return Effect.gen(function*() {
        const id = idCounter++
        let requestIdCounter = 0
        const requestMap = new Map<
          number,
          Mailbox.Mailbox<O, E | WorkerError> | Deferred.Deferred<O, E | WorkerError>
        >()

        const collector = Transferable.unsafeMakeCollector()
        const wrappedEncode = encode ?
          ((message: I) =>
            Effect.zipRight(
              collector.clear,
              Effect.provideService(encode(message), Transferable.Collector, collector)
            )) :
          Effect.succeed

        const readyLatch = yield* Deferred.make<void>()
        const backing = yield* platform.spawn<Worker.Worker.Request, Worker.Worker.Response<E, O>>(id)

        yield* backing.run((message) => {
          if (message[0] === 0) {
            return Deferred.complete(readyLatch, Effect.void)
          }
          return handleMessage(message[1])
        }).pipe(
          Effect.onError((cause) =>
            Effect.forEach(requestMap.values(), (mailbox) =>
              Deferred.DeferredTypeId in mailbox
                ? Deferred.failCause(mailbox, cause)
                : mailbox.failCause(cause))
          ),
          Effect.tapErrorCause(Effect.logWarning),
          Effect.retry(Schedule.spaced(1000)),
          Effect.annotateLogs({
            package: "@effect/platform",
            module: "Worker"
          }),
          Effect.interruptible,
          Effect.forkScoped
        )

        yield* Effect.addFinalizer(() =>
          Effect.zipRight(
            Effect.forEach(requestMap.values(), (mailbox) =>
              Deferred.DeferredTypeId in mailbox
                ? Deferred.interrupt(mailbox)
                : mailbox.end, {
              discard: true
            }),
            Effect.sync(() => requestMap.clear())
          )
        )

        const handleMessage = (response: Worker.Worker.Response<E, O>) =>
          Effect.suspend(() => {
            const mailbox = requestMap.get(response[0])
            if (!mailbox) return Effect.void

            switch (response[1]) {
              // data
              case 0: {
                return Deferred.DeferredTypeId in mailbox
                  ? Deferred.succeed(mailbox, response[2][0])
                  : mailbox.offerAll(response[2])
              }
              // end
              case 1: {
                if (response.length === 2) {
                  return Deferred.DeferredTypeId in mailbox
                    ? Deferred.interrupt(mailbox)
                    : mailbox.end
                }
                return Deferred.DeferredTypeId in mailbox
                  ? Deferred.succeed(mailbox, response[2][0])
                  : Effect.zipRight(mailbox.offerAll(response[2]), mailbox.end)
              }
              // error / defect
              case 2:
              case 3: {
                if (response[1] === 2) {
                  return Deferred.DeferredTypeId in mailbox
                    ? Deferred.fail(mailbox, response[2])
                    : mailbox.fail(response[2])
                }
                const cause = WorkerError.decodeCause(response[2])
                return Deferred.DeferredTypeId in mailbox
                  ? Deferred.failCause(mailbox, cause)
                  : mailbox.failCause(cause)
              }
            }
          })

        const executeAcquire = <
          Q extends Mailbox.Mailbox<O, E | WorkerError> | Deferred.Deferred<O, E | WorkerError>
        >(request: I, makeMailbox: Effect.Effect<Q>) =>
          Effect.withFiberRuntime<{
            readonly id: number
            readonly mailbox: Q
          }>((fiber) => {
            const context = fiber.getFiberRef(FiberRef.currentContext)
            const span = Context.getOption(context, Tracer.ParentSpan).pipe(
              Option.filter((span): span is Tracer.Span => span._tag === "Span")
            )
            const id = requestIdCounter++
            return makeMailbox.pipe(
              Effect.tap((mailbox) => {
                requestMap.set(id, mailbox)
                return wrappedEncode(request).pipe(
                  Effect.tap((payload) =>
                    backing.send([
                      id,
                      0,
                      payload,
                      span._tag === "Some" ? [span.value.traceId, span.value.spanId, span.value.sampled] : undefined
                    ], collector.unsafeRead())
                  ),
                  Effect.catchAllCause((cause) =>
                    Mailbox.isMailbox<O, E | WorkerError>(mailbox)
                      ? mailbox.failCause(cause)
                      : Deferred.failCause(mailbox, cause)
                  )
                )
              }),
              Effect.map((mailbox) => ({ id, mailbox }))
            )
          })

        const executeRelease = ({ id }: { readonly id: number }, exit: Exit.Exit<unknown, unknown>) => {
          const release = Effect.sync(() => requestMap.delete(id))
          return Exit.isFailure(exit) ?
            Effect.zipRight(Effect.orDie(backing.send([id, 1])), release) :
            release
        }

        const execute = (request: I) =>
          Stream.fromChannel(
            Channel.acquireUseRelease(
              executeAcquire(request, Mailbox.make<O, E | WorkerError>()),
              ({ mailbox }) => Mailbox.toChannel(mailbox),
              executeRelease
            )
          )

        const executeEffect = (request: I) =>
          Effect.acquireUseRelease(
            executeAcquire(request, Deferred.make<O, WorkerError | E>()),
            ({ mailbox }) => Deferred.await(mailbox),
            executeRelease
          )

        yield* Deferred.await(readyLatch)

        if (initialMessage) {
          yield* Effect.sync(initialMessage).pipe(
            Effect.flatMap(executeEffect),
            Effect.mapError((cause) => new WorkerError({ reason: "spawn", cause }))
          )
        }

        return { id, execute, executeEffect }
      })
    }
  })
})

/** @internal */
export const layerManager = Layer.effect(WorkerManager, makeManager)

/** @internal */
export const makePool = <I, O, E>(
  options: Worker.WorkerPool.Options<I>
) =>
  Effect.gen(function*() {
    const manager = yield* WorkerManager
    const workers = new Set<Worker.Worker<I, O, E>>()
    const acquire = pipe(
      manager.spawn<I, O, E>(options),
      Effect.tap((worker) =>
        Effect.acquireRelease(
          Effect.sync(() => workers.add(worker)),
          () => Effect.sync(() => workers.delete(worker))
        )
      ),
      options.onCreate ? Effect.tap(options.onCreate) : identity
    )
    const backing = "minSize" in options ?
      yield* Pool.makeWithTTL({
        acquire,
        min: options.minSize,
        max: options.maxSize,
        concurrency: options.concurrency,
        targetUtilization: options.targetUtilization,
        timeToLive: options.timeToLive
      }) :
      yield* Pool.make({
        acquire,
        size: options.size,
        concurrency: options.concurrency,
        targetUtilization: options.targetUtilization
      })
    const pool: Worker.WorkerPool<I, O, E> = {
      backing,
      broadcast: (message: I) =>
        Effect.forEach(workers, (worker) => worker.executeEffect(message), {
          concurrency: "unbounded",
          discard: true
        }),
      execute: (message: I) =>
        Stream.unwrapScoped(Effect.map(
          backing.get,
          (worker) => worker.execute(message)
        )),
      executeEffect: (message: I) =>
        Effect.scoped(Effect.flatMap(
          backing.get,
          (worker) => worker.executeEffect(message)
        ))
    }

    // report any spawn errors
    yield* Effect.scoped(backing.get)

    return pool
  })

/** @internal */
export const makePoolLayer = <Tag, I, O, E>(
  tag: Context.Tag<Tag, Worker.WorkerPool<I, O, E>>,
  options: Worker.WorkerPool.Options<I>
) => Layer.scoped(tag, makePool(options))

/** @internal */
export const makeSerialized = <
  I extends Schema.TaggedRequest.All
>(
  options: Worker.SerializedWorker.Options<I>
): Effect.Effect<Worker.SerializedWorker<I>, WorkerError, Worker.WorkerManager | Worker.Spawner | Scope.Scope> =>
  Effect.gen(function*() {
    const manager = yield* WorkerManager
    const backing = yield* manager.spawn({
      ...options as any,
      encode(message) {
        return Effect.mapError(
          Schema.serialize(message as any),
          (cause) => new WorkerError({ reason: "encode", cause })
        )
      }
    })
    const execute = <Req extends I>(message: Req) => {
      const parseSuccess = Schema.decode(Schema.successSchema(message as any))
      const parseFailure = Schema.decode(Schema.failureSchema(message as any))
      return pipe(
        backing.execute(message),
        Stream.catchAll((error) => Effect.flatMap(parseFailure(error), Effect.fail)),
        Stream.mapEffect(parseSuccess)
      )
    }
    const executeEffect = <Req extends I>(message: Req) => {
      const parseSuccess = Schema.decode(Schema.successSchema(message as any))
      const parseFailure = Schema.decode(Schema.failureSchema(message as any))
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
export const makePoolSerialized = <I extends Schema.TaggedRequest.All>(
  options: Worker.SerializedWorkerPool.Options<I>
) =>
  Effect.gen(function*() {
    const manager = yield* WorkerManager
    const workers = new Set<Worker.SerializedWorker<I>>()
    const acquire = pipe(
      makeSerialized<I>(options),
      Effect.tap((worker) => Effect.sync(() => workers.add(worker))),
      Effect.tap((worker) => Effect.addFinalizer(() => Effect.sync(() => workers.delete(worker)))),
      options.onCreate
        ? Effect.tap(
          options.onCreate as (worker: Worker.SerializedWorker<I>) => Effect.Effect<void, WorkerError>
        )
        : identity,
      Effect.provideService(WorkerManager, manager)
    )
    const backing = yield* "timeToLive" in options ?
      Pool.makeWithTTL({
        acquire,
        min: options.minSize,
        max: options.maxSize,
        concurrency: options.concurrency,
        targetUtilization: options.targetUtilization,
        timeToLive: options.timeToLive
      }) :
      Pool.make({
        acquire,
        size: options.size,
        concurrency: options.concurrency,
        targetUtilization: options.targetUtilization
      })
    const pool: Worker.SerializedWorkerPool<I> = {
      backing,
      broadcast: <Req extends I>(message: Req) =>
        Effect.forEach(workers, (worker) => worker.executeEffect(message), {
          concurrency: "unbounded",
          discard: true
        }) as any,
      execute: <Req extends I>(message: Req) =>
        Stream.unwrapScoped(Effect.map(backing.get, (worker) => worker.execute(message))) as any,
      executeEffect: <Req extends I>(message: Req) =>
        Effect.scoped(Effect.flatMap(backing.get, (worker) => worker.executeEffect(message))) as any
    }

    // report any spawn errors
    yield* Effect.scoped(backing.get)

    return pool
  })

/** @internal */
export const makePoolSerializedLayer = <Tag, I extends Schema.TaggedRequest.All>(
  tag: Context.Tag<Tag, Worker.SerializedWorkerPool<I>>,
  options: Worker.SerializedWorkerPool.Options<I>
) => Layer.scoped(tag, makePoolSerialized(options))

/** @internal */
export const layerSpawner = <W = unknown>(spawner: Worker.SpawnerFn<W>) =>
  Layer.succeed(
    Spawner,
    spawner
  )

/** @internal */
export const makePlatform = <W>() =>
<
  P extends {
    readonly postMessage: (message: any, transfers?: any | undefined) => void
  }
>(options: {
  readonly setup: (options: {
    readonly worker: W
    readonly scope: Scope.Scope
  }) => Effect.Effect<P, WorkerError>
  readonly listen: (options: {
    readonly port: P
    readonly emit: (data: any) => void
    readonly deferred: Deferred.Deferred<never, WorkerError>
    readonly scope: Scope.Scope
  }) => Effect.Effect<void>
}) =>
  PlatformWorker.of({
    [PlatformWorkerTypeId]: PlatformWorkerTypeId,
    spawn<I, O>(id: number) {
      return Effect.gen(function*() {
        const spawn = (yield* Spawner) as Worker.SpawnerFn<W>
        let currentPort: P | undefined
        const buffer: Array<[I, ReadonlyArray<unknown> | undefined]> = []

        const run = <A, E, R>(
          handler: (_: Worker.BackingWorker.Message<O>) => Effect.Effect<A, E, R>
        ): Effect.Effect<never, WorkerError | E, R> =>
          Effect.uninterruptibleMask((restore) =>
            Effect.gen(function*() {
              const scope = yield* Effect.scope
              const port = yield* options.setup({ worker: spawn(id), scope })
              currentPort = port
              yield* Scope.addFinalizer(
                scope,
                Effect.sync(() => {
                  currentPort = undefined
                })
              )
              const runtime = (yield* Effect.runtime<R | Scope.Scope>()).pipe(
                Runtime.updateContext(Context.omit(Scope.Scope))
              ) as Runtime.Runtime<R>
              const fiberSet = yield* FiberSet.make<any, WorkerError | E>()
              const runFork = Runtime.runFork(runtime)
              yield* options.listen({
                port,
                scope,
                emit(data) {
                  FiberSet.unsafeAdd(fiberSet, runFork(handler(data)))
                },
                deferred: fiberSet.deferred as any
              })
              if (buffer.length > 0) {
                for (const [message, transfers] of buffer) {
                  port.postMessage([0, message], transfers as any)
                }
                buffer.length = 0
              }
              return (yield* restore(FiberSet.join(fiberSet))) as never
            }).pipe(Effect.scoped)
          )

        const send = (message: I, transfers?: ReadonlyArray<unknown>) =>
          Effect.try({
            try: () => {
              if (currentPort === undefined) {
                buffer.push([message, transfers])
              } else {
                currentPort.postMessage([0, message], transfers as any)
              }
            },
            catch: (cause) => new WorkerError({ reason: "send", cause })
          })

        return { run, send }
      })
    }
  })
