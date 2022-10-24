import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * @tsplus static effect/core/stm/THub/TDequeue.Aspects takeRemainder
 * @tsplus pipeable effect/core/stm/THub/TDequeue takeRemainder
 * @category mutations
 * @since 1.0.0
 */
export function takeRemainder<A>(min: number, max: number, acc: Chunk.Chunk<A>) {
  return (self: THub.TDequeue<A>): STM<never, never, Chunk.Chunk<A>> => {
    if (max < min) {
      return STM.succeed(acc)
    }

    return self.takeUpTo(max).flatMap((bs) => {
      const remaining = min - bs.length
      if (remaining === 1) {
        return self.take.map((b) => pipe(acc, Chunk.concat(bs), Chunk.append(b)))
      }

      if (remaining > 1) {
        return self.take.flatMap((b) =>
          self.takeRemainder(
            remaining - 1,
            max - bs.length - 1,
            pipe(acc, Chunk.concat(bs), Chunk.append(b))
          )
        )
      }

      return STM.succeed(pipe(acc, Chunk.concat(bs)))
    })
  }
}
