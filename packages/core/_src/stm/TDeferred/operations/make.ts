import { InternalTDeferred } from "@effect/core/stm/TDeferred/operations/_internal/InternalTDeferred"

/**
 * @tsplus static ets/TDeferred/Ops make
 * @tsplus static ets/TDeferred/Ops __call
 */
export function make<E, A>(): USTM<TDeferred<E, A>> {
  return TRef.make(Maybe.none).map((ref) => new InternalTDeferred(ref))
}
