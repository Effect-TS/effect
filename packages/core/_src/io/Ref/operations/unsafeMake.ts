import { RefInternal } from "@effect/core/io/Ref/operations/_internal/RefInternal"

/**
 * @tsplus static ets/Ref/Ops unsafeMake
 */
export function unsafeMake<A>(value: A): Ref<A> {
  return new RefInternal(new AtomicReference(value))
}
