import { concreteTDeferred } from "@effect/core/stm/TDeferred/operations/_internal/InternalTDeferred"

/**
 * @tsplus getter ets/TDeferred poll
 */
export function poll<E, A>(self: TDeferred<E, A>): USTM<Option<Either<E, A>>> {
  concreteTDeferred(self)
  return self.ref.get
}
