import * as E from "@effect-ts/system/Either"
import { pipe, tuple } from "@effect-ts/system/Function"
import type { Erase } from "@effect-ts/system/Utils"

import type { Associative } from "../../../Classic/Associative"
import type { Applicative, Monad } from "../../Combined"
import type { Auto, FixE, UF__, URIS } from "../../HKT"
import { instance } from "../../HKT"
import type { Fail } from "../Fail"
import type { Run } from "../Run"

export function getValidationF<F extends URIS, C = Auto>(
  F: Monad<F, C> & Run<F, C> & Fail<F, C> & Applicative<F, C>
): <Z>(A: Associative<Z>) => Applicative<F, Erase<C, Auto> & FixE<Z>>
export function getValidationF(
  F: Monad<UF__> & Run<UF__> & Fail<UF__> & Applicative<UF__>
): <Z>(A: Associative<Z>) => Applicative<UF__, FixE<Z>> {
  return <Z>(A: Associative<Z>) =>
    instance<Applicative<UF__, FixE<Z>>>({
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
                  (b) =>
                    pipe(
                      F.any(),
                      F.map(() => tuple(a, b))
                    )
                )
            )
          ),
          F.flatten
        )
    })
}
