import * as E from "../../Either"
import { identity, pipe } from "../../Function"
import { HasClock } from "../Clock"
import { Driver, driver, Schedule } from "../Schedule/new"

import { catchAll } from "./catchAll"
import { chain } from "./chain"
import { Effect } from "./effect"
import { fail } from "./fail"
import { foldM } from "./foldM"
import { map } from "./map"
import { map_ } from "./map_"
import { orDie } from "./orDie"

function loop<S, R, E, A, S1, R1, O, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  orElse: (e: E, o: O) => Effect<S2, R2, E2, A2>,
  driver: Driver<S1, R1 & HasClock, E, O>
): Effect<S | S1 | S2, R & R1 & R2 & HasClock, E2, E.Either<A2, A>> {
  return pipe(
    self,
    map((a) => E.right(a)),
    catchAll((e) =>
      pipe(
        driver.next(e),
        foldM(
          () =>
            pipe(
              driver.last,
              orDie,
              chain((o) =>
                pipe(
                  orElse(e, o),
                  map((a) => E.left(a))
                )
              )
            ),
          () => loop(self, orElse, driver)
        )
      )
    )
  )
}

export const retryOrElseEither_ = <S, R, E, A, S1, R1, O, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  policy: Schedule<S1, R1, E, O>,
  orElse: (e: E, o: O) => Effect<S2, R2, E2, A2>
): Effect<S | S1 | S2, R & R1 & R2 & HasClock, E2, E.Either<A2, A>> => {
  return pipe(
    policy,
    driver,
    chain((a) => loop(self, orElse, a))
  )
}

export const retryOrElse_ = <S, R, E, A, S1, R1, O, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  policy: Schedule<S1, R1, E, O>,
  orElse: (e: E, o: O) => Effect<S2, R2, E2, A2>
): Effect<S | S1 | S2, R & R1 & R2 & HasClock, E2, A | A2> =>
  map_(retryOrElseEither_(self, policy, orElse), E.fold(identity, identity))

export const retry_ = <S, R, E, A, S1, R1, O>(
  self: Effect<S, R, E, A>,
  policy: Schedule<S1, R1, E, O>
): Effect<S | S1, R & R1 & HasClock, E, A> =>
  retryOrElse_(self, policy, (e, _) => fail(e))

export const retry = <S1, R1, E, O>(policy: Schedule<S1, R1, E, O>) => <S, R, A>(
  self: Effect<S, R, E, A>
): Effect<S | S1, R & R1 & HasClock, E, A> => retry_(self, policy)
