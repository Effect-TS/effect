import { Cause } from "../Cause/cause"
import { isEmpty } from "../Cause/isEmpty"

import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { halt } from "./halt"
import { unit } from "./unit"

export const uncause = <S, R, E, A>(
  effect: Effect<S, R, never, Cause<E>>
): Effect<S, R, E, void> => chain_(effect, (a) => (isEmpty(a) ? unit : halt(a)))
