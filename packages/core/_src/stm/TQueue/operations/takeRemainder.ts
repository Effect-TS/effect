/**
 * @internal
 * @tsplus fluent ets/TQueue takeRemainder
 */
export function takeRemainder_<A>(self: TQueue<A>, min: number, max: number, acc: Chunk<A>): USTM<Chunk<A>> {
  if (max < min) {
    return STM.succeedNow(acc)
  }

  return self.takeUpTo(max).flatMap((bs) => {
    const remaining = min - bs.length
    if (remaining === 1) {
      return self.take.map((b) => acc.concat(bs).append(b))
    }

    if (remaining > 1) {
      return self.take.flatMap((b) => self.takeRemainder(remaining - 1, max - bs.length - 1, acc.concat(bs).append(b)))
    }

    return STM.succeed(acc.concat(bs))
  })
}

/**
 * @internal
 * @tsplus static ets/TQueue/Aspects takeRemainder
 */
export const takeRemainder = Pipeable(takeRemainder_)
