import { Associative } from "../../../Classic/Associative"
import { Applicative, Monad } from "../../Combined"
import { Auto, Fix, instance, UF__, URIS } from "../../HKT"
import { Fail } from "../Fail"
import { Run } from "../Run"

import * as E from "@effect-ts/system/Either"
import { pipe, tuple } from "@effect-ts/system/Function"
import { Erase } from "@effect-ts/system/Utils"

export function getValidationF<F extends URIS, C = Auto>(
  F: Monad<F, C> & Run<F, C> & Fail<F, C> & Applicative<F, C>
): <Z>(A: Associative<Z>) => Applicative<F, Erase<C, Auto> & Fix<"E", Z>>
export function getValidationF(
  F: Monad<UF__> & Run<UF__> & Fail<UF__> & Applicative<UF__>
): <Z>(A: Associative<Z>) => Applicative<UF__, Fix<"E", Z>> {
  return <Z>(A: Associative<Z>) =>
    instance<Applicative<UF__, Fix<"E", Z>>>({
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
