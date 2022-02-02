import type { Effect } from "../../src/io/Effect"
import * as Promise from "../../src/io/Promise"

export function withLatch<R, E, A>(
  release: (_: Effect<unknown, never, void>) => Effect<R, E, A>
): Effect<R, E, A> {
  return Promise.make<never, void>().flatMap((latch) =>
    release(Promise.succeed_(latch, undefined).asUnit()).zipLeft(Promise.await(latch))
  )
}
