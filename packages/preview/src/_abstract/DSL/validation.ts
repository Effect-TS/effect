import { constant, flow, pipe, tuple } from "../../Function"
import { ApplicativeF, ApplicativeKE } from "../Applicative"
import { Associative } from "../Associative"
import {
  AssociativeBothF,
  AssociativeBothK,
  makeAssociativeBoth
} from "../AssociativeBoth"
import { FailF, FailKE } from "../FX/Fail"
import { RunF, RunKE } from "../FX/Run"
import { castS, castSO, HKTTypeS, HKTTypeSO, URIS } from "../HKT"
import { MonadF, MonadKE } from "../Monad"

import { succeedF } from "./core"

export type ValidationStack<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = ApplicativeKE<F, E, TL0, TL1, TL2, TL3> &
  RunKE<F, E, TL0, TL1, TL2, TL3> &
  FailKE<F, E, TL0, TL1, TL2, TL3> &
  MonadKE<F, E, TL0, TL1, TL2, TL3>

export type ValidationStackF<
  F,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = ApplicativeF<F, TL0, TL1, TL2, TL3> &
  RunF<F, TL0, TL1, TL2, TL3> &
  FailF<F, TL0, TL1, TL2, TL3> &
  MonadF<F, TL0, TL1, TL2, TL3>

export function validationAssociativeBothF<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  F: ValidationStack<F, TL0, TL1, TL2, TL3>,
  A: Associative<E>
): AssociativeBothK<F, TL0, TL1, TL2, TL3>
export function validationAssociativeBothF<
  F,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  F: ValidationStackF<F, TL0, TL1, TL2, TL3>,
  A: Associative<any>
): AssociativeBothF<F, TL0, TL1, TL2, TL3> {
  return makeAssociativeBoth<F>()<TL0, TL1, TL2, TL3>()({
    both: (fb) => (fa) => {
      const coerce = flow(
        castS<HKTTypeS<typeof fa>>()(F.URI),
        castSO<HKTTypeSO<typeof fb>>()(F.URI)
      )

      return pipe(
        F.run(fa),
        F.both(F.run(fb)),
        F.map(([l, r]) => {
          switch (l._tag) {
            case "Left": {
              switch (r._tag) {
                case "Right": {
                  return coerce(F.fail(l.left))
                }
                case "Left": {
                  return coerce(F.fail(A.combine(r.left)(l.left)))
                }
              }
            }
            case "Right": {
              switch (r._tag) {
                case "Right": {
                  return coerce(succeedF(F)(constant(tuple(l.right, r.right))))
                }
                case "Left": {
                  return coerce(F.fail(r.left))
                }
              }
            }
          }
        }),
        F.flatten
      )
    }
  })
}
