import { Option } from "fp-ts/lib/Option"
import { Lazy, FunctionN } from "fp-ts/lib/function"

import { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { encaseOption } from "./encaseOption"

export function chainOption<E>(
  onEmpty: Lazy<E>
): <A, B>(
  bind: FunctionN<[A], Option<B>>
) => <S, R, E2>(eff: Effect<S, R, E2, A>) => Effect<S, R, E | E2, B> {
  return (bind) => (inner) => chain_(inner, (a) => encaseOption(bind(a), onEmpty))
}
