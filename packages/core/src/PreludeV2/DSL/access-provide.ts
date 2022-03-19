// ets_tracing: off

import { pipe } from "../../Function/index.js"
import type { Has, Tag } from "../../Has/index.js"
import type { AssociativeFlatten } from "../AssociativeFlatten/index.js"
import type { Access, Provide } from "../FX/index.js"
import type * as HKT from "../HKT/index.js"
import type { Monad } from "../Monad/index.js"

export function accessMF<F extends HKT.HKT>(A_: Access<F>, F_: AssociativeFlatten<F>) {
  return <X, I, R, R2, E, A>(
    f: (r: R2) => HKT.Kind<F, X, I, R, E, A> // @todo: find a way to handle fixed R
  ): HKT.Kind<F, X, I, R & R2, E, A> => {
    return pipe(f, A_.access, F_.flatten)
  }
}

export function accessServiceMF<F extends HKT.HKT>(A_: Access<F>, M_: Monad<F>) {
  return <Service>(H: Tag<Service>) =>
    <X, I, R, E, A>(
      f: (_: Service) => HKT.Kind<F, X, I, R, E, A>
    ): HKT.Kind<F, X, I, R & Has<Service>, E, A> =>
      accessMF(A_, M_)((x: Has<Service>) => pipe(x, H.read, f))
}

export const provideServiceF =
  <F extends HKT.HKT>(A_: Access<F>, M_: Monad<F>, P_: Provide<F>) =>
  <Service>(H: Tag<Service>) =>
  (S: Service) =>
  <X, I, R, E, A>(
    fa: HKT.Kind<F, X, I, R & Has<Service>, E, A>
  ): HKT.Kind<F, X, I, R, E, A> =>
    accessMF(
      A_,
      M_
    )((r: R) =>
      pipe(fa, P_.provide({ ...r, [H.key]: S } as unknown as R & Has<Service>))
    )

export const provideSomeF =
  <F extends HKT.HKT>(A_: Access<F>, M_: Monad<F>, P_: Provide<F>) =>
  <R, R2>(f: (_: R2) => R) =>
  <X, I, E, A>(
    fa: HKT.Kind<F, X, I, R, E, A>
  ): HKT.Kind<F, X, I, R2, E, A> => // @todo: find a way to handle fixed R
    accessMF(A_, M_)((r0: R2) => pipe(fa, P_.provide(f(r0))))
