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

export interface Validation<F extends HKT.HKT, E> extends HKT.HKT {
  readonly type: HKT.Kind<F, this["R"], E, this["A"]>
}

export const getValidationF =
  <F>(M_: Monad<F> & Run<F> & Fail<F> & Applicative<F>) =>
  <Z>(S_: Associative<Z>): Applicative<Validation<F, Z>> =>
    HKT.instance<Applicative<Validation<F, Z>>>({
      any: M_.any,
      map: M_.map,
      both:
        <B>(fb: HKT.Kind<F, any, Z, B>) =>
        <A>(fa: HKT.Kind<F, any, Z, A>) =>
          pipe(
            M_.either(fa),
            M_.both(M_.either(fb)),
            M_.map(Tp.toNative),
            M_.map(
              ([eitherA, eitherB]): HKT.Kind<F, any, Z, Tp.Tuple<[A, B]>> =>
                E.fold_(
                  eitherA,
                  (ea) =>
                    E.fold_(
                      eitherB,
                      (eb) => M_.fail(S_.combine(ea, eb)),
                      () => M_.fail(ea)
                    ),
                  (a) =>
                    E.fold_(
                      eitherB,
                      (e) => M_.fail(e),
                      (b) => succeedF({ ...M_ })(Tp.tuple(a, b))
                    )
                )
            ),
            M_.flatten
          )
    })
