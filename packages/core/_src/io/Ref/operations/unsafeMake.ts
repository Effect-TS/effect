import { AtomicInternal, UnsafeAPI } from "@effect/core/io/Ref/operations/_internal/AtomicInternal"

/**
 * @tsplus static ets/Ref/Ops unsafeMake
 */
export function unsafeMake<A>(value: A): Ref<A> {
  return Object.setPrototypeOf({
    unsafe: new UnsafeAPI(new AtomicReference(value))
  }, AtomicInternal)
}
