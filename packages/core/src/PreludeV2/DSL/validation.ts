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

export interface Validation<F extends HKT.HKT, E> extends HKT.HKT {
  readonly type: HKT.Kind<F, this["X"], this["I"], this["R"], E, this["A"]>
}

export const getValidationF =
  <F>(M_: Monad<F>, R_: Run<F>, F_: Fail<F>, A_: Applicative<F>) =>
  <Z>(S_: Associative<Z>): Applicative<Validation<F, Z>> =>
    HKT.instance<Applicative<Validation<F, Z>>>({
      any: A_.any,
      map: A_.map,
      both:
        <B>(fb: HKT.Kind<F, any, any, any, Z, B>) =>
        <A>(fa: HKT.Kind<F, any, any, any, Z, A>) =>
          pipe(
            R_.either(fa),
            A_.both(R_.either(fb)),
            A_.map(Tp.toNative),
            A_.map(
              ([eitherA, eitherB]): HKT.Kind<F, any, any, any, Z, Tp.Tuple<[A, B]>> =>
                E.fold_(
                  eitherA,
                  (ea) =>
                    E.fold_(
                      eitherB,
                      (eb) => F_.fail(S_.combine(ea, eb)),
                      () => F_.fail(ea)
                    ),
                  (a) =>
                    E.fold_(
                      eitherB,
                      (e) => F_.fail(e),
                      (b) => succeedF(A_)(Tp.tuple(a, b))
                    )
                )
            ),
            M_.flatten
          )
    })
