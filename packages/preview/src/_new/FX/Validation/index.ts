import * as E from "../../../_system/Either"
import { pipe, tuple } from "../../../_system/Function"
import { Erase } from "../../../_system/Utils"
import { Associative } from "../../Associative"
import { Auto, FixE, HKTURI, Kind, URIS } from "../../HKT"
import { Applicative, Monad } from "../../Prelude"
import { Fail } from "../Fail"
import { Run } from "../Run"

export function getValidationF<F extends URIS, C = Auto>(
  F: Monad<F, C> & Run<F, C> & Fail<F, C> & Applicative<F, C>
): <Z>(A: Associative<Z>) => Applicative<F, Erase<C, Auto> & FixE<Z>>
export function getValidationF<F extends HKTURI>(
  F: Monad<F> & Run<F> & Fail<F> & Applicative<F>
): <Z>(A: Associative<Z>) => Applicative<F, FixE<Z>> {
  return <Z>(A: Associative<Z>): Applicative<F, FixE<Z>> => ({
    any: F.any,
    map: F.map,
    both: <K2, SO, SO2, X2, I2, S, R2, B>(
      fb: Kind<F, K2, SO, SO2, X2, I2, S, R2, Z, B>
    ) => <K, SI, X, I, R, A>(fa: Kind<F, K, SI, SO, X, I, S, R, Z, A>) =>
      pipe(
        F.run(fa),
        F.both(F.run(fb)),
        F.map(
          ([maybeA, maybeB]): Kind<
            F,
            never,
            SO2,
            SO2,
            never,
            unknown,
            S,
            unknown,
            Z,
            readonly [A, B]
          > =>
            E.fold_(
              maybeA,
              (ea) =>
                E.fold_(
                  maybeB,
                  (eb) => F.fail(A.combine(eb)(ea)),
                  () => F.fail(ea)
                ),
              (a) =>
                E.fold_(
                  maybeB,
                  (e) => F.fail(e),
                  (b) =>
                    pipe(
                      F.any<S, SO2, SO2>(),
                      F.map(() => tuple(a, b))
                    )
                )
            )
        ),
        F.flatten
      )
  })
}
