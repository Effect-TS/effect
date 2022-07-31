import { AtomicInternal, UnsafeAPI } from "@effect/core/io/Ref/operations/_internal/AtomicInternal"
import { SynchronizedInternal } from "@effect/core/io/Ref/operations/_internal/SynchronizedInternal"

/**
 * @tsplus static effect/core/io/Ref.Ops unsafeMake
 */
export function unsafeMake<A>(value: A): Ref<A> {
  return new AtomicInternal(new UnsafeAPI(new AtomicReference(value)))
}

/**
 * @tsplus static effect/core/io/Ref/Synchronized.Ops unsafeMake
 */
export function unsafeMakeSynchronized<A>(initial: A): Ref.Synchronized<A> {
  return new SynchronizedInternal(
    Ref.unsafeMake<A>(initial),
    TSemaphore.unsafeMake(1)
  )
}
