import { AtomicInternal, UnsafeAPI } from "@effect/core/io/Ref/operations/_internal/AtomicInternal"
import { SynchronizedInternal } from "@effect/core/io/Ref/operations/_internal/SynchronizedInternal"

/**
 * @tsplus static ets/Ref/Ops unsafeMake
 */
export function unsafeMake<A>(value: A): Ref<A> {
  return Object.setPrototypeOf({
    unsafe: new UnsafeAPI(new AtomicReference(value))
  }, AtomicInternal)
}

/**
 * @tsplus static ets/Ref/Synchronized/Ops unsafeMake
 */
export function unsafeMakeSynchronizedRef<A>(initial: A): Ref.Synchronized<A> {
  return Object.setPrototypeOf({
    ref: Ref.unsafeMake<A>(initial),
    semaphore: Semaphore.unsafeMake(1)
  }, SynchronizedInternal)
}
