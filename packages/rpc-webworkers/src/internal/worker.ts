import type { LazyArg } from "@effect/data/Function"
import { pipe } from "@effect/data/Function"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import type { Exit } from "@effect/io/Exit"
import * as Queue from "@effect/io/Queue"
import type {
  WebWorker,
  WebWorkerOptions,
  WebWorkerQueue,
} from "@effect/rpc-webworkers/Resolver"

/** @internal */
export const defaultQueue = <E, I, O>() =>
  Effect.map(
    Queue.unbounded<readonly [I, Deferred.Deferred<E, O>]>(),
    (queue): WebWorkerQueue<E, I, O> => ({
      offer: (_) => Queue.offer(queue, _),
      take: Queue.take(queue),
    }),
  )

/** @internal */
export const make = <E, I, O>(
  evaluate: LazyArg<Worker | SharedWorker>,
  {
    makeQueue = defaultQueue(),
    onError,
    payload,
    permits,
    transferables,
  }: WebWorkerOptions<E, I, O>,
): Effect.Effect<never, never, WebWorker<E, I, O>> =>
  Effect.gen(function* ($) {
    let idCounter = 0

    const semaphore = yield* $(Effect.makeSemaphore(permits))
    const outbound = yield* $(makeQueue)
    const requestMap = new Map<number, Deferred.Deferred<E, O>>()

    const handleExit = (exit: Exit<E, O>) =>
      Effect.zipRight(
        Effect.forEachDiscard(requestMap.values(), Deferred.complete(exit)),
        Effect.sync(() => requestMap.clear()),
      )

    const handleMessage = (event: MessageEvent<readonly [number, O]>) =>
      Effect.suspend(() => {
        const [id, response] = event.data
        const deferred = requestMap.get(id)
        if (!deferred) return Effect.unit()
        requestMap.delete(id)
        return Deferred.succeed(deferred, response)
      })

    const postMessages = (worker: Worker | MessagePort) =>
      pipe(
        outbound.take,
        Effect.tap(([request, deferred]) =>
          Effect.sync(() => {
            const id = idCounter++
            requestMap.set(id, deferred)
            return worker.postMessage(
              [id, payload(request)],
              transferables(request),
            )
          }),
        ),
        Effect.tap(([, deferred]) => Effect.ignore(Deferred.await(deferred))),
        semaphore.withPermits(1),
        Effect.forever,
      )

    const send = (request: I) =>
      Effect.flatMap(Deferred.make<E, O>(), (deferred) =>
        Effect.zipRight(
          outbound.offer([request, deferred]),
          Deferred.await(deferred),
        ),
      )

    const run = Effect.acquireUseRelease(
      Effect.map(Effect.sync(evaluate), (worker) => {
        if (worker instanceof SharedWorker) {
          const port = worker.port
          port.start()
          return [worker, port] as const
        }
        return [worker, worker] as const
      }),
      ([worker, port]) =>
        Effect.zipParRight(
          Effect.asyncInterrupt<never, E, never>((resume) => {
            const controller = new AbortController()
            const signal = controller.signal

            port.addEventListener(
              "message",
              (event) => Effect.runFork(handleMessage(event as MessageEvent)),
              { signal },
            )
            worker.addEventListener(
              "error",
              (event) => resume(Effect.fail(onError(event as ErrorEvent))),
              { signal },
            )

            return Effect.sync(() => controller.abort())
          }),
          postMessages(port),
        ),
      ([worker], exit) =>
        Effect.zipRight(
          handleExit(exit),
          worker instanceof SharedWorker
            ? Effect.unit()
            : Effect.sync(() => worker.terminate()),
        ),
    )

    return { run, send } as const
  })
