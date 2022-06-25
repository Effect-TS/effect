import { SynchronizedInternal } from "@effect/core/io/Ref/operations/_internal/SynchronizedInternal"

/**
 * Creates a new `Ref` with the specified value.
 *
 * @tsplus static ets/Ref/Ops make
 */
export function makeRef<A>(value: LazyArg<A>, __tsplusTrace?: string): Effect<never, never, Ref<A>> {
  return Effect.succeed(Ref.unsafeMake(value()))
}

/**
 * Creates a new `Ref.Synchronized` with the specified value.
 *
 * @tsplus static ets/Ref/Synchronized/Ops make
 * @tsplus static ets/Ref/Synchronized/Ops __call
 */
export function makeSynchronized<A>(
  value: LazyArg<A>,
  __tsplusTrace?: string
): Effect<never, never, Ref.Synchronized<A>> {
  return Effect.Do()
    .bind("ref", () => Ref.make<A>(value))
    .bind("semaphore", () => Semaphore.make(1))
    .map(({ ref, semaphore }) =>
      Object.setPrototypeOf({
        ref,
        semaphore
      }, SynchronizedInternal)
    )
}
