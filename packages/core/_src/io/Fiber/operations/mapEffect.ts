import { makeSynthetic } from "@effect/core/io/Fiber/definition"

/**
 * Effectually maps over the value the fiber computes.
 *
 * @tsplus static effect/core/io/Fiber.Aspects mapEffect
 * @tsplus static effect/core/io/RuntimeFiber.Aspects mapEffect
 * @tsplus pipeable effect/core/io/Fiber mapEffect
 * @tsplus pipeable effect/core/io/RuntimeFiber mapEffect
 */
export function mapEffect<A, E2, A2>(
  f: (a: A) => Effect<never, E2, A2>
) {
  return <E>(self: Fiber<E, A>): Fiber<E | E2, A2> =>
    makeSynthetic({
      id: self.id,
      await: self.await.flatMap((_) => _.forEach(f)),
      children: self.children,
      inheritRefs: self.inheritRefs,
      poll: self.poll.flatMap((_) =>
        _.fold(
          () => Effect.succeed(Maybe.none),
          (exit) => exit.forEach(f).map(Maybe.some)
        )
      ),
      interruptAs: (id) => self.interruptAs(id).flatMap((exit) => exit.forEach(f))
    })
}
