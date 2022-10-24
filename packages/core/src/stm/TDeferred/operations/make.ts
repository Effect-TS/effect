import { InternalTDeferred } from "@effect/core/stm/TDeferred/operations/_internal/InternalTDeferred"
import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/stm/TDeferred.Ops make
 * @tsplus static effect/core/stm/TDeferred.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make<E, A>(): USTM<TDeferred<E, A>> {
  return TRef.make(Option.none).map((ref) => new InternalTDeferred(ref))
}
