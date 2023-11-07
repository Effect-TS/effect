import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import type * as Worker from "../Worker.js"
import type * as WorkerError from "../WorkerError.js"
import type * as WorkerRunner from "../WorkerRunner.js"

/** @internal */
export const PlatformRunnerTypeId: WorkerRunner.PlatformRunnerTypeId = Symbol.for(
  "@effect/platform/Runner/PlatformRunner"
) as WorkerRunner.PlatformRunnerTypeId

/** @internal */
export const PlatformRunner = Context.Tag<WorkerRunner.PlatformRunner>(
  PlatformRunnerTypeId
)

/** @internal */
export const make = <I, R, E, O>(
  process: (request: I) => Stream.Stream<R, E, O> | Effect.Effect<R, E, O>,
  options?: WorkerRunner.Runner.Options<O>
) =>
  Effect.gen(function*(_) {
    const platform = yield* _(PlatformRunner)
    const backing = yield* _(platform.start<Worker.Worker.Request<I>, Worker.Worker.Response<E>>())
    const fiberMap = new Map<number, Fiber.Fiber<never, void>>()

    const handleRequests = pipe(
      Queue.take(backing.queue),
      Effect.tap((req) => {
        const id = req[0]
        if (req[1] === 1) {
          const fiber = fiberMap.get(id)
          if (!fiber) return Effect.unit
          return Fiber.interrupt(fiber)
        }

        const stream = process(req[2])

        const effect = Effect.isEffect(stream) ?
          Effect.matchCauseEffect(stream, {
            onFailure: (cause) =>
              Either.match(Cause.failureOrCause(cause), {
                onLeft: (error) => backing.send([id, 2, error]),
                onRight: (cause) => backing.send([id, 3, Cause.squash(cause)])
              }),
            onSuccess: (data) => {
              const transfers = options?.transfers ? options.transfers(data) : undefined
              const payload = options?.encode ? options.encode(data) : data
              return backing.send([id, 1, payload], transfers)
            }
          }) :
          pipe(
            stream,
            Stream.tap((item) => {
              const transfers = options?.transfers ? options.transfers(item) : undefined
              const payload = options?.encode ? options.encode(item) : item
              return backing.send([id, 0, payload], transfers)
            }),
            Stream.runDrain,
            Effect.matchCauseEffect({
              onFailure: (cause) =>
                Either.match(Cause.failureOrCause(cause), {
                  onLeft: (error) => backing.send([id, 2, error]),
                  onRight: (cause) => backing.send([id, 3, Cause.squash(cause)])
                }),
              onSuccess: () => backing.send([id, 1])
            })
          )

        return pipe(
          effect,
          Effect.ensuring(Effect.sync(() => fiberMap.delete(id))),
          Effect.fork,
          Effect.tap((fiber) => Effect.sync(() => fiberMap.set(id, fiber)))
        )
      }),
      Effect.forever
    )

    return yield* _(
      Effect.all([
        handleRequests,
        Fiber.join(backing.fiber)
      ], { concurrency: "unbounded", discard: true }) as Effect.Effect<R, WorkerError.WorkerError, never>
    )
  })
