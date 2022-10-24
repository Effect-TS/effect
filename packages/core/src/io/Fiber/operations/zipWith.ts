import { makeSynthetic } from "@effect/core/io/Fiber/definition"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Zips this fiber with the specified fiber, combining their results using the
 * specified combiner function. Both joins and interruptions are performed in
 * sequential order from left to right.
 *
 * @tsplus static effect/core/io/Fiber.Aspects zipWith
 * @tsplus static effect/core/io/RuntimeFiber.Aspects zipWith
 * @tsplus pipeable effect/core/io/Fiber zipWith
 * @tsplus pipeable effect/core/io/RuntimeFiber zipWith
 * @category zipping
 * @since 1.0.0
 */
export function zipWith<E2, A, B, C>(that: Fiber<E2, B>, f: (a: A, b: B) => C) {
  return <E>(self: Fiber<E, A>): Fiber<E | E2, C> =>
    makeSynthetic({
      id: self.id.getOrElse(that.id),
      await: self.await.flatten.zipWithPar(that.await.flatten, f).exit,
      children: self.children,
      inheritAll: that.inheritAll.zipRight(self.inheritAll),
      interruptAsFork: (id) => self.interruptAsFork(id) > that.interruptAsFork(id),
      poll: self.poll.zipWith(
        that.poll,
        (optionA, optionB) =>
          pipe(
            optionA,
            Option.flatMap((exitA) =>
              pipe(
                optionB,
                Option.map((exitB) => exitA.zipWith(exitB, f, Cause.both))
              )
            )
          )
      )
    })
}
