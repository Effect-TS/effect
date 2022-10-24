import { AtomicInternal, UnsafeAPI } from "@effect/core/io/Ref/operations/_internal/AtomicInternal"
import { SynchronizedInternal } from "@effect/core/io/Ref/operations/_internal/SynchronizedInternal"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"

/**
 * @category model
 * @since 1.0.0
 */
export interface Atomic<A> extends Ref<A> {
  unsafe: UnsafeAPI<A>
}

/**
 * @tsplus static effect/core/io/Ref.Ops unsafeMake
 * @category constructors
 * @since 1.0.0
 */
export function unsafeMake<A>(value: A): Atomic<A> {
  return new AtomicInternal(new UnsafeAPI(MutableRef.make(value)))
}

/**
 * @tsplus static effect/core/io/Ref/Synchronized.Ops unsafeMake
 * @category constructors
 * @since 1.0.0
 */
export function unsafeMakeSynchronized<A>(initial: A): Ref.Synchronized<A> {
  return new SynchronizedInternal(
    Ref.unsafeMake<A>(initial),
    TSemaphore.unsafeMake(1)
  )
}
