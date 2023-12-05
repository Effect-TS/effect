import type { Schedule } from "effect"
import { Effect, Exit, ReadonlyArray, RequestBlock, Scope, Stream } from "effect"

export const makeDataLoader = <R, A>(schedule: Schedule.Schedule<R, unknown, A>) =>
  Effect.gen(function*($) {
    let queue: Array<RequestBlock.RequestBlock> = []

    const scope = yield* $(Effect.acquireRelease(
      Scope.make(),
      (scope) => Scope.close(scope, Exit.unit)
    ))

    yield* $(
      Stream.fromSchedule(schedule),
      Stream.mapEffect(() =>
        Effect.suspend(() => {
          const proc = queue
          queue = []
          const block = ReadonlyArray.reduce(proc, RequestBlock.empty, RequestBlock.parallel)
          return Effect.forkIn(scope)(Effect.runRequestBlock(block))
        })
      ),
      Stream.runDrain,
      Effect.forkScoped
    )

    const debounced = <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
      Effect.uninterruptibleMask((restore) =>
        Effect.flatMap(
          Effect.step(restore(effect)),
          (step) =>
            Exit.isExit(step) ? step : Effect.suspend(() => {
              queue.push(step.i0)
              return Effect.blocked(RequestBlock.empty, debounced(step.i1))
            })
        )
      )

    return { debounced }
  })
