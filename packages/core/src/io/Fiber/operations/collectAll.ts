import { makeSynthetic } from "@effect/core/io/Fiber/definition"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
/**
 * Collects all fibers into a single fiber producing an in-order list of the
 * results.
 *
 * @tsplus static effect/core/io/Fiber.Ops collectAll
 * @category constructors
 * @since 1.0.0
 */
export function collectAll<E, A>(fibers: Iterable<Fiber<E, A>>): Fiber<E, Chunk.Chunk<A>> {
  return makeSynthetic({
    id: Array.from(fibers).reduce((id, fiber) => id.combine(fiber.id), FiberId.none),
    await: Effect.forEachPar(fibers, (fiber) => fiber.await.flatten).exit,
    children: Effect.forEachPar(fibers, (fiber) => fiber.children).map(Chunk.flatten),
    inheritAll: Effect.forEachDiscard(fibers, (fiber) => fiber.inheritAll),
    poll: Effect.forEach(fibers, (fiber) => fiber.poll).map(
      Chunk.reduceRight(
        Option.some<Exit<E, Chunk.Chunk<A>>>(Exit.succeed(Chunk.empty)),
        (optionA, optionB) => {
          switch (optionA._tag) {
            case "None": {
              return Option.none
            }
            case "Some": {
              switch (optionB._tag) {
                case "None": {
                  return Option.none
                }
                case "Some": {
                  return Option.some(
                    optionA.value.zipWith(
                      optionB.value,
                      (a, chunk) => pipe(chunk, Chunk.prepend(a)),
                      Cause.both
                    )
                  )
                }
              }
            }
          }
        }
      )
    ),
    interruptAsFork: (fiberId) =>
      Effect.forEachDiscard(fibers, (fiber) => fiber.interruptAsFork(fiberId))
  })
}
