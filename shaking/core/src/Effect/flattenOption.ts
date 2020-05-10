import { Option } from "fp-ts/lib/Option"

import { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { encaseOption } from "./encaseOption"

/**
 * Combines T.chain and T.fromOption
 */
export const flattenOption = <E>(onNone: () => E) => <S, R, E2, A>(
  eff: Effect<S, R, E2, Option<A>>
): Effect<S, R, E | E2, A> => chain_(eff, (x) => encaseOption(x, onNone))
