import { concreteTDeferred } from "@effect/core/stm/TDeferred/operations/_internal/InternalTDeferred"

/**
 * @tsplus fluent ets/TDeferred done
 */
export function done_<E, A>(self: TDeferred<E, A>, v: Either<E, A>): USTM<boolean> {
  concreteTDeferred(self)
  return self.ref.get.flatMap((_) =>
    _.isSome() ? STM.succeedNow(false) : self.ref.set(Option.some(v)) > STM.succeedNow(true)
  )
}

/**
 * @tsplus static ets/TDeferred/Aspects done
 */
export const done = Pipeable(done_)
