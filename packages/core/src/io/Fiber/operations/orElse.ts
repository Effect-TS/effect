import { makeSynthetic } from "@effect/core/io/Fiber/definition"
import * as Option from "@fp-ts/data/Option"

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the `that` one
 * when `this` one fails. Interrupting the returned fiber will interrupt both
 * fibers, sequentially, from left to right.
 *
 * @tsplus pipeable-operator effect/core/io/Fiber |
 * @tsplus pipeable-operator effect/core/io/RuntimeFiber |
 * @tsplus static effect/core/io/Fiber.Aspects orElse
 * @tsplus static effect/core/io/RuntimeFiber.Aspects orElse
 * @tsplus pipeable effect/core/io/Fiber orElse
 * @tsplus pipeable effect/core/io/RuntimeFiber orElse
 * @category alternatives
 * @since 1.0.0
 */
export function orElse<E2, A2>(that: Fiber<E2, A2>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E | E2, A | A2> =>
    makeSynthetic<E | E2, A | A2>({
      id: self.id.getOrElse(that.id),
      await: self.await.zipWith(
        that.await,
        (e1, e2) => (e1._tag === "Success" ? e1 : e2)
      ),
      children: self.children,
      inheritAll: that.inheritAll.zipRight(self.inheritAll),
      interruptAsFork: (id) => self.interruptAs(id) > that.interruptAs(id),
      poll: self.poll.zipWith(
        that.poll,
        (option1, option2) => {
          switch (option1._tag) {
            case "None": {
              return Option.none
            }
            case "Some": {
              return option1.value._tag === "Success" ? option1 : option2
            }
          }
        }
      )
    })
}
