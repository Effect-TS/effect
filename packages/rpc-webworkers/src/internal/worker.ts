import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type { LazyArg } from "effect/Function"
import { pipe } from "effect/Function"
import * as Queue from "effect/Queue"
import type { WebWorker, WebWorkerOptions, WebWorkerQueue } from "../Resolver"

/** @internal */
export const defaultQueue = <E, I, O>() =>
  Effect.map(
    Queue.unbounded<readonly [I, Deferred.Deferred<E, O>]>(),
    (queue): WebWorkerQueue<E, I, O> => ({
      offer: (_) => Queue.offer(queue, _),
      take: Queue.take(queue)
    })
  )

/** @internal */
export const make = <E, I, O>(
  evaluate: LazyArg<Worker | SharedWorker>,
  {
    makeQueue = defaultQueue(),
    onError,
    payload,
    permits,
    transferables
  }: WebWorkerOptions<E, I, O>
): Effect.Effect<never, never, WebWorker<E, I, O>> =>
  Effect.gen(function*($) {
    let idCounter = 0

    const semaphore = yield* $(Effect.makeSemaphore(permits))
    const outbound = yield* $(makeQueue)
    const requestMap = new Map<number, Deferred.Deferred<E, O>>()

    const handleExit = (exit: Exit.Exit<E, O>) =>
      Effect.zipRight(
        Effect.forEach(requestMap.values(), Deferred.complete(exit), {
          discard: true
        }),
        Effect.sync(() => requestMap.clear())
      )

    const handleMessage = (event: MessageEvent<readonly [number, O]>) =>
      Effect.suspend(() => {
        const [id, response] = event.data
        const deferred = requestMap.get(id)
        if (!deferred) return Effect.unit
        return Deferred.succeed(deferred, response)
      })

    const postMessages = (worker: Worker | MessagePort, latch: Deferred.Deferred<never, void>) =>
      pipe(
        Deferred.await(latch),
        Effect.zipRight(semaphore.take(1)),
        Effect.zipRight(outbound.take),
        Effect.flatMap(([request, deferred]) =>
          Effect.sync(() => {
            const id = idCounter++
            requestMap.set(id, deferred)
            worker.postMessage([id, payload(request)], transferables(request))
            return [id, deferred] as const
          })
        ),
        Effect.tap(([id, deferred]) =>
          Effect.fork(
            Effect.ensuring(
              Deferred.await(deferred),
              Effect.zipRight(
                semaphore.release(1),
                Effect.sync(() => requestMap.delete(id))
              )
            )
          )
        ),
        Effect.onExit((exit) => Exit.isFailure(exit) ? semaphore.release(1) : Effect.unit),
        Effect.forever
      )

    const send = (request: I) =>
      Effect.acquireUseRelease(
        Deferred.make<E, O>(),
        (deferred) =>
          Effect.zipRight(
            outbound.offer([request, deferred]),
            Deferred.await(deferred)
          ),
        (deferred) =>
          Effect.flatMap(Deferred.isDone(deferred), (done) => done ? Effect.unit : Deferred.interrupt(deferred))
      )

    const openPort = Effect.map(Effect.sync(evaluate), (worker) => {
      if ("port" in worker) {
        const port = worker.port
        port.start()
        return [worker, port] as const
      }
      return [worker, worker] as const
    })
    const run = Effect.acquireUseRelease(
      Effect.zip(openPort, Deferred.make<never, void>()),
      ([[worker, port], readyLatch]) =>
        Effect.zipRight(
          Effect.async<never, E, never>((resume, signal) => {
            port.addEventListener(
              "message",
              (event) =>
                Effect.runFork(
                  (event as MessageEvent).data === "ready" ?
                    Deferred.complete(readyLatch, Effect.unit) :
                    handleMessage(event as MessageEvent)
                ),
              { signal }
            )
            worker.addEventListener(
              "error",
              (event) => resume(Effect.fail(onError(event as ErrorEvent))),
              { signal }
            )
          }),
          postMessages(port, readyLatch),
          { concurrent: true }
        ),
      ([[, port]], exit) =>
        Effect.zipRight(
          handleExit(exit),
          Effect.sync(() => port.postMessage("close"))
        )
    )

    return { run, send } as const
  })
