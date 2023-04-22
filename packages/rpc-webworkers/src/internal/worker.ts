import type { LazyArg } from "@effect/data/Function"
import { pipe } from "@effect/data/Function"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import type { Exit } from "@effect/io/Exit"
import * as Queue from "@effect/io/Queue"

/** @internal */
export interface WebWorker<E, I, O> {
  readonly run: Effect.Effect<never, E, never>
  readonly send: (request: I) => Effect.Effect<never, E, O>
}

/** @internal */
export interface WebWorkerOptions<E, I> {
  readonly payload: (value: I) => unknown
  readonly transferables: (value: I) => Array<Transferable>
  readonly onError: (error: ErrorEvent) => E
  readonly permits: number
}

/** @internal */
export const make = <E, I, O>(
  evaluate: LazyArg<Worker>,
  { onError, payload, permits, transferables }: WebWorkerOptions<E, I>,
): Effect.Effect<never, never, WebWorker<E, I, O>> =>
  Effect.gen(function* ($) {
    let idCounter = 0

    const semaphore = yield* $(Effect.makeSemaphore(permits))
    const outbound = yield* $(
      Queue.unbounded<readonly [I, Deferred.Deferred<E, O>]>(),
    )
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

    const postMessages = (worker: Worker) =>
      pipe(
        Queue.take(outbound),
        Effect.flatMap(([request, deferred]) =>
          Effect.sync(() => {
            const id = idCounter++
            requestMap.set(id, deferred)
            return worker.postMessage(
              [id, payload(request)],
              transferables(request),
            )
          }),
        ),
        Effect.forever,
      )

    const send = (request: I) =>
      pipe(
        Deferred.make<E, O>(),
        Effect.flatMap((deferred) =>
          Effect.zipRight(
            Queue.offer(outbound, [request, deferred]),
            Deferred.await(deferred),
          ),
        ),
        semaphore.withPermits(1),
      )

    const run = Effect.acquireUseRelease(
      Effect.sync(evaluate),
      (worker) =>
        Effect.zipParRight(
          Effect.asyncInterrupt<never, E, never>((resume) => {
            const controller = new AbortController()
            const signal = controller.signal

            worker.addEventListener(
              "message",
              (event) => Effect.runFork(handleMessage(event)),
              { signal },
            )
            worker.addEventListener(
              "error",
              (event) => resume(Effect.fail(onError(event))),
              { signal },
            )

            return Effect.sync(() => controller.abort())
          }),
          postMessages(worker),
        ),
      (worker, exit) =>
        Effect.zipRight(
          handleExit(exit),
          Effect.sync(() => worker.terminate()),
        ),
    )

    return { run, send } as const
  })
