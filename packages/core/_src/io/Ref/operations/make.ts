import { SynchronizedInternal } from "@effect/core/io/Ref/operations/_internal/SynchronizedInternal"

/**
 * Creates a new `Ref` with the specified value.
 *
 * @tsplus static effect/core/io/Ref.Ops make
 */
export function makeRef<A>(
  value: LazyArg<A>
): Effect<never, never, Ref<A>> {
  return Effect.sync(Ref.unsafeMake(value()))
}

/**
 * Creates a new `Ref.Synchronized` with the specified value.
 *
 * @tsplus static effect/core/io/Ref/Synchronized.Ops make
 * @tsplus static effect/core/io/Ref/Synchronized.Ops __call
 */
export function makeSynchronized<A>(
  value: LazyArg<A>
): Effect<never, never, Ref.Synchronized<A>> {
  return Do(($) => {
    const ref = $(Ref.make<A>(value))
    const semaphore = $(TSemaphore.makeCommit(1))
    return Object.setPrototypeOf({ ref, semaphore }, SynchronizedInternal)
  })
}
