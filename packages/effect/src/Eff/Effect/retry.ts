import * as E from "../../Either"
import { identity } from "../../Function"
import { Schedule } from "../Schedule/schedule"

import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { fail } from "./fail"
import { foldM_ } from "./foldM_"
import { map_ } from "./map_"
import { succeedNow } from "./succeedNow"
import { suspend } from "./suspend"

export const retryOrElseEither_ = <S, R, E, A, S1, R1, ST, O, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  policy: Schedule<S1, R1, ST, E, O>,
  orElse: (e: E, o: O) => Effect<S2, R2, E2, A2>
): Effect<S | S1 | S2, R & R1 & R2, E2, E.Either<A2, A>> => {
  const loop = (state: ST): Effect<S | S1 | S2, R & R1 & R2, E2, E.Either<A2, A>> =>
    foldM_(
      self,
      (err) =>
        foldM_(
          policy.update(err, state),
          (_) => map_(orElse(err, policy.extract(err, state)), E.left),
          (s) => suspend(() => loop(s))
        ),
      (x) => succeedNow(E.right(x))
    )

  return chain_(policy.initial, loop)
}

export const retryOrElse_ = <S, R, E, A, S1, R1, ST, O, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  policy: Schedule<S1, R1, ST, E, O>,
  orElse: (e: E, o: O) => Effect<S2, R2, E2, A2>
): Effect<S | S1 | S2, R & R1 & R2, E2, A | A2> =>
  map_(retryOrElseEither_(self, policy, orElse), E.fold(identity, identity))

export const retry_ = <S, R, E, A, S1, R1, ST, O>(
  self: Effect<S, R, E, A>,
  policy: Schedule<S1, R1, ST, E, O>
): Effect<S | S1, R & R1, E, A> => retryOrElse_(self, policy, (e, _) => fail(e))

export const retry = <S1, R1, E, ST, O>(policy: Schedule<S1, R1, ST, E, O>) => <
  S,
  R,
  A
>(
  self: Effect<S, R, E, A>
): Effect<S | S1, R & R1, E, A> => retry_(self, policy)
