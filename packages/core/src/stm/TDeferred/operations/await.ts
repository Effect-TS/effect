import { concreteTDeferred } from "@effect/core/stm/TDeferred/operations/_internal/InternalTDeferred"
import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus getter effect/core/stm/TDeferred await
 * @category destructors
 * @since 1.0.0
 */
export function await_<E, A>(self: TDeferred<E, A>): STM<never, E, A> {
  concreteTDeferred(self)
  return self.ref.get.collect(Option.map(STM.fromEither)).flatten
}

export { await_ as await }
