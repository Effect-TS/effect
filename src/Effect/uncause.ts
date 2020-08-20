import type { Cause } from "../Cause/cause"
import { isEmpty } from "../Cause/core"
import { chain_, halt, unit } from "./core"
import type { Effect } from "./effect"

export const uncause = <S, R, E, A>(
  effect: Effect<S, R, never, Cause<E>>
): Effect<S, R, E, void> => chain_(effect, (a) => (isEmpty(a) ? unit : halt(a)))
