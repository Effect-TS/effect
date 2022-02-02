import type { Effect } from "../../src/io/Effect"
import { Promise } from "../../src/io/Promise"

export function withLatch<R, E, A>(
  release: (_: Effect<unknown, never, void>) => Effect<R, E, A>
): Effect<R, E, A> {
  return Promise.make<never, void>().flatMap((latch) =>
    release(latch.succeed(undefined).asUnit()).zipLeft(latch.await())
  )
}
