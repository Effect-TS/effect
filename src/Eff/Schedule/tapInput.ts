import { zipSecond_ } from "../Effect"
import { Effect } from "../Effect/effect"

import { Schedule } from "./schedule"
import { updated_ } from "./updated_"

/**
 * Sends every input value to the specified sink.
 */
export const tapInput_ = <S, R, ST, A, B, S1, R1, A1 extends A>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1) => Effect<S1, R1, never, any>
): Schedule<S | S1, R & R1, ST, A1, B> =>
  updated_(self, (update) => (a: A1, s) => zipSecond_(f(a), update(a, s)))

/**
 * Sends every input value to the specified sink.
 */
export const tapInput = <A, S1, R1, A1 extends A>(
  f: (a: A1) => Effect<S1, R1, never, any>
) => <S, R, ST, B>(
  self: Schedule<S, R, ST, A, B>
): Schedule<S | S1, R & R1, ST, A1, B> => tapInput_(self, f)
