import { makeSynthetic } from "@effect/core/io/Fiber/definition"
import * as Option from "@fp-ts/data/Option"

/**
 * Effectually maps over the value the fiber computes.
 *
 * @tsplus static effect/core/io/Fiber.Aspects mapEffect
 * @tsplus static effect/core/io/RuntimeFiber.Aspects mapEffect
 * @tsplus pipeable effect/core/io/Fiber mapEffect
 * @tsplus pipeable effect/core/io/RuntimeFiber mapEffect
 * @category mapping
 * @since 1.0.0
 */
export function mapEffect<A, E2, A2>(
  f: (a: A) => Effect<never, E2, A2>
) {
  return <E>(self: Fiber<E, A>): Fiber<E | E2, A2> =>
    makeSynthetic({
      id: self.id,
      await: self.await.flatMap((_) => _.forEach(f)),
      children: self.children,
      inheritAll: self.inheritAll,
      poll: self.poll.flatMap((result) => {
        switch (result._tag) {
          case "None": {
            return Effect.succeed(Option.none)
          }
          case "Some": {
            return result.value.forEach(f).map(Option.some)
          }
        }
      }),
      interruptAsFork: (id) => self.interruptAsFork(id)
    })
}
