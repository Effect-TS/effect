import * as E from "../../../_system/Either"
import { pipe, tuple } from "../../../_system/Function"
import { Associative } from "../../Associative"
import { Auto, Fix, HKTURI, Kind, Or, URIS } from "../../HKT"
import { Applicative, Monad } from "../../Prelude"
import { Fail } from "../Fail"
import { Run } from "../Run"

export function getValidationF<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto
>(
  F: Monad<F, FK, FX, FI, FS, FR, Auto> &
    Run<F, FK, FX, FI, FS, FR, Auto> &
    Fail<F, FK, FX, FI, FS, FR, Auto> &
    Applicative<F, FK, FX, FI, FS, FR, Auto>
): <Z>(A: Associative<Z>) => Applicative<F, FK, FX, FI, FS, FR, Fix<Z>>
export function getValidationF<
  F extends HKTURI,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto
>(
  F: Monad<F, FK, FX, FI, FS, FR, Auto> &
    Run<F, FK, FX, FI, FS, FR, Auto> &
    Fail<F, FK, FX, FI, FS, FR, Auto> &
    Applicative<F, FK, FX, FI, FS, FR, Auto>
): <Z>(A: Associative<Z>) => Applicative<F, FK, FX, FI, FS, FR, Fix<Z>> {
  return <Z>(A: Associative<Z>): Applicative<F, FK, FX, FI, FS, FR, Fix<Z>> => ({
    any: F.any,
    map: F.map,
    both: <K2, SO, SO2, X2, I2, S, R2, B>(
      fb: Kind<
        F,
        Or<FK, K2>,
        SO,
        SO2,
        Or<FX, X2>,
        Or<FI, I2>,
        Or<FS, S>,
        Or<FR, R2>,
        Z,
        B
      >
    ) => <K, SI, X, I, R, A>(
      fa: Kind<F, Or<FK, K>, SI, SO, Or<FX, X>, Or<FI, I>, Or<FS, S>, Or<FR, R>, Z, A>
    ) =>
      pipe(
        F.run(fa),
        F.both(F.run(fb)),
        F.map(
          ([maybeA, maybeB]): Kind<
            F,
            Or<FK, never>,
            SO2,
            SO2,
            Or<FX, never>,
            Or<FI, unknown>,
            Or<FS, S>,
            Or<FR, unknown>,
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
