import * as E from "@effect-ts/system/Either"
import { pipe, tuple } from "@effect-ts/system/Function"
import type { Erase } from "@effect-ts/system/Utils"

import type { Associative } from "../../Classic/Associative"
import type { Applicative, Monad } from "../Combined"
import type { Fail } from "../FX/Fail"
import type { Run } from "../FX/Run"
import * as HKT from "../HKT"
import type { IndexedURI } from "../HKT/Kind"
import { succeedF } from "./dsl"

type V = HKT.V<"E", "+">

export function getValidationF<F extends HKT.URIS, C extends V>(
  F: Monad<F, C> & Run<F, C> & Fail<F, C> & Applicative<F, C>
): <Z>(
  A: Associative<Z>
) => Applicative<
  F,
  Erase<C, V> & HKT.Fix<F[0] extends IndexedURI<infer U, "E", infer Q> ? Q : "E", Z>
>
export function getValidationF(
  F: Monad<[HKT.UF__], V> &
    Run<[HKT.UF__], V> &
    Fail<[HKT.UF__], V> &
    Applicative<[HKT.UF__], V>
): <Z>(A: Associative<Z>) => Applicative<[HKT.UF__], HKT.Fix<"E", Z>> {
  return <Z>(A: Associative<Z>) =>
    HKT.instance<Applicative<[HKT.UF__], HKT.Fix<"E", Z>>>({
      any: F.any,
      map: F.map,
      both: (fb) => (fa) =>
        pipe(
          F.run(fa),
          F.both(F.run(fb)),
          F.map(([maybeA, maybeB]) =>
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
                  (b) => succeedF(F)(tuple(a, b))
                )
            )
          ),
          F.flatten
        )
    })
}
