/**
 * @tsplus static effect/core/stm/TQueue.Aspects takeRemainder
 * @tsplus pipeable effect/core/stm/TQueue takeRemainder
 */
export function takeRemainder<A>(min: number, max: number, acc: Chunk<A>) {
  return (self: TQueue<A>): STM<never, never, Chunk<A>> => {
    if (max < min) {
      return STM.succeed(acc)
    }

    return self.takeUpTo(max).flatMap((bs) => {
      const remaining = min - bs.length
      if (remaining === 1) {
        return self.take.map((b) => acc.concat(bs).append(b))
      }

      if (remaining > 1) {
        return self.take.flatMap((b) =>
          self.takeRemainder(remaining - 1, max - bs.length - 1, acc.concat(bs).append(b))
        )
      }

      return STM.succeed(acc.concat(bs))
    })
  }
}
