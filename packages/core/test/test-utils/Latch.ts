import type { UIO } from "../../src/io/Effect"
import { Effect } from "../../src/io/Effect"
import { Promise } from "../../src/io/Promise"
import * as Ref from "../../src/io/Ref"

export function withLatch<R, E, A>(
  f: (release: UIO<void>) => Effect<R, E, A>
): Effect<R, E, A> {
  return Promise.make<never, void>().flatMap(
    (latch) => f(latch.succeed(undefined).asUnit()) < latch.await()
  )
}

export function withLatchAwait<R, E, A>(
  f: (release: UIO<void>, await: UIO<void>) => Effect<R, E, A>
): Effect<R, E, A> {
  return Effect.Do()
    .bind("ref", () => Ref.make(true))
    .bind("latch", () => Promise.make<never, void>())
    .bind("result", ({ latch, ref }) =>
      f(
        latch.succeed(undefined).asUnit(),
        Effect.uninterruptibleMask(
          ({ restore }) => Ref.set_(ref, false) > restore(latch.await())
        )
      )
    )
    .tap(({ latch, ref }) => Effect.whenEffect(Ref.get(ref), latch.await()))
    .map(({ result }) => result)
}
