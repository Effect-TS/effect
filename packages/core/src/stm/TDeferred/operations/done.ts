import { concreteTDeferred } from "@effect/core/stm/TDeferred/operations/_internal/InternalTDeferred"
import type { Either } from "@fp-ts/data/Either"
import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/stm/TDeferred.Aspect done
 * @tsplus pipeable effect/core/stm/TDeferred done
 * @category destructors
 * @since 1.0.0
 */
export function done<E, A>(value: Either<E, A>) {
  return (self: TDeferred<E, A>): STM<never, never, boolean> => {
    concreteTDeferred(self)
    return self.ref.get.flatMap((option) => {
      switch (option._tag) {
        case "None": {
          return self.ref.set(Option.some(value)).zipRight(STM.succeed(true))
        }
        case "Some": {
          return STM.succeed(false)
        }
      }
    })
  }
}
