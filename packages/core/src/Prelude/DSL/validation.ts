// ets_tracing: off

import * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"
import * as E from "@effect-ts/system/Either"
import { pipe } from "@effect-ts/system/Function"

import type { Associative } from "../../Associative/index.js"
import type { Applicative } from "../Applicative/index.js"
import type { Fail } from "../FX/Fail/index.js"
import type { Run } from "../FX/Run/index.js"
import * as HKT from "../HKT/index.js"
import type { Monad } from "../Monad/index.js"
import { succeedF } from "./succeed.js"

export function getValidationF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C> & Run<F, C> & Fail<F, C> & Applicative<F, C>
): <Z>(A: Associative<Z>) => Applicative<F, HKT.CleanParam<C, "E"> & HKT.Fix<"E", Z>>
export function getValidationF<F>(
  F: Monad<HKT.UHKT2<F>> &
    Run<HKT.UHKT2<F>> &
    Fail<HKT.UHKT2<F>> &
    Applicative<HKT.UHKT2<F>>
): <Z>(A: Associative<Z>) => Applicative<HKT.UHKT2<F>, HKT.Fix<"E", Z>> {
  return <Z>(A: Associative<Z>) =>
    HKT.instance<Applicative<HKT.UHKT2<F>, HKT.Fix<"E", Z>>>({
      any: F.any,
      map: F.map,
      both: (fb) => (fa) =>
        pipe(
          F.either(fa),
          F.both(F.either(fb)),
          F.map(({ tuple: [maybeA, maybeB] }) =>
            E.fold_(
              maybeA,
              (ea) =>
                E.fold_(
                  maybeB,
                  (eb) => F.fail(A.combine(ea, eb)),
                  () => F.fail(ea)
                ),
              (a) =>
                E.fold_(
                  maybeB,
                  (e) => F.fail(e),
                  (b) => succeedF(F)(Tp.tuple(a, b))
                )
            )
          ),
          F.flatten
        )
    })
}
