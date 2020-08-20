import { constant, flow, pipe, tuple } from "../../Function"
import type { ApplicativeF, ApplicativeK } from "../Applicative"
import type { AssociativeBothF, AssociativeBothK } from "../AssociativeBoth"
import type { FailF, FailK } from "../FX/Fail"
import type { RunF, RunK } from "../FX/Run"
import type { ErrFor, HKTTypeS, HKTTypeSO, URIS } from "../HKT"
import { castS, castSO, instance } from "../HKT"
import type { MonadF, MonadK } from "../Monad"
import { succeedF } from "./core"

export interface AssociativeErr<F, TL0, TL1, TL2, TL3> {
  combineErr: <E>(
    y: ErrFor<F, TL0, TL1, TL2, TL3, E>
  ) => <E2>(
    x: ErrFor<F, TL0, TL1, TL2, TL3, E2>
  ) => ErrFor<F, TL0, TL1, TL2, TL3, E | E2>
}

export type ValidationStackK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = ApplicativeK<F, TL0, TL1, TL2, TL3> &
  RunK<F, TL0, TL1, TL2, TL3> &
  FailK<F, TL0, TL1, TL2, TL3> &
  MonadK<F, TL0, TL1, TL2, TL3> &
  AssociativeErr<F, TL0, TL1, TL2, TL3>

export type ValidationStackF<
  F,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = ApplicativeF<F, TL0, TL1, TL2, TL3> &
  RunF<F, TL0, TL1, TL2, TL3> &
  FailF<F, TL0, TL1, TL2, TL3> &
  MonadF<F, TL0, TL1, TL2, TL3> &
  AssociativeErr<F, TL0, TL1, TL2, TL3>

export function validationAssociativeBothF<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(F: ValidationStackK<F, TL0, TL1, TL2, TL3>): AssociativeBothK<F, TL0, TL1, TL2, TL3>
export function validationAssociativeBothF<
  F,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(F: ValidationStackF<F, TL0, TL1, TL2, TL3>): AssociativeBothF<F, TL0, TL1, TL2, TL3> {
  return instance<AssociativeBothF<F, TL0, TL1, TL2, TL3>>({
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
                  return coerce(F.fail(F.combineErr(r.left)(l.left)))
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
