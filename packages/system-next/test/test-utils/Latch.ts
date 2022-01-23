import { pipe } from "../../src/data/Function"
import * as T from "../../src/io/Effect"
import * as Promise from "../../src/io/Promise"

export function withLatch<R, E, A>(
  release: (_: T.UIO<void>) => T.Effect<R, E, A>
): T.Effect<R, E, A> {
  return pipe(
    Promise.make<never, void>(),
    T.chain((latch) =>
      pipe(
        release(T.asUnit(Promise.succeed_(latch, undefined))),
        T.zipLeft(Promise.await(latch))
      )
    )
  )
}
