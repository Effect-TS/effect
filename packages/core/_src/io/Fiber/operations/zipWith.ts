import { makeSynthetic } from "@effect/core/io/Fiber/definition"

/**
 * Zips this fiber with the specified fiber, combining their results using the
 * specified combiner function. Both joins and interruptions are performed in
 * sequential order from left to right.
 *
 * @tsplus static effect/core/io/Fiber.Aspects zipWith
 * @tsplus static effect/core/io/RuntimeFiber.Aspects zipWith
 * @tsplus pipeable effect/core/io/Fiber zipWith
 * @tsplus pipeable effect/core/io/RuntimeFiber zipWith
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
        (oa, ob) => oa.flatMap((ea) => ob.map((eb) => ea.zipWith(eb, f, Cause.both)))
      )
    })
}
