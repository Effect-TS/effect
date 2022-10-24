import { concreteTDeferred } from "@effect/core/stm/TDeferred/operations/_internal/InternalTDeferred"
import type { Either } from "@fp-ts/data/Either"
import type { Option } from "@fp-ts/data/Option"

/**
 * @tsplus getter effect/core/stm/TDeferred poll
 * @category destructors
 * @since 1.0.0
 */
export function poll<E, A>(self: TDeferred<E, A>): USTM<Option<Either<E, A>>> {
  concreteTDeferred(self)
  return self.ref.get
}
