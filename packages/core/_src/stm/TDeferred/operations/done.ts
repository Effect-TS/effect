import { concreteTDeferred } from "@effect/core/stm/TDeferred/operations/_internal/InternalTDeferred"

/**
 * @tsplus static effect/core/stm/TDeferred.Aspect done
 * @tsplus pipeable effect/core/stm/TDeferred done
 */
export function done<E, A>(value: Either<E, A>) {
  return (self: TDeferred<E, A>): STM<never, never, boolean> => {
    concreteTDeferred(self)
    return self.ref.get.flatMap((_) =>
      _.isSome() ?
        STM.succeed(false) :
        self.ref.set(Maybe.some(value)) > STM.succeed(true)
    )
  }
}
