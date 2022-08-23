import { AtomicInternal, UnsafeAPI } from "@effect/core/io/Ref/operations/_internal/AtomicInternal"
import { SynchronizedInternal } from "@effect/core/io/Ref/operations/_internal/SynchronizedInternal"

export interface Atomic<A> extends Ref<A> {
  unsafe: UnsafeAPI<A>
}

/**
 * @tsplus static effect/core/io/Ref.Ops unsafeMake
 */
export function unsafeMake<A>(value: A): Atomic<A> {
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
