// ets_tracing: off

import { pipe } from "../../Function/index.js"
import type { Has, Tag } from "../../Has/index.js"
import type { AssociativeFlatten } from "../AssociativeFlatten/index.js"
import type { Access, Provide } from "../FX/index.js"
import type * as HKT from "../HKT/index.js"
import type { Monad } from "../Monad/index.js"

export function accessMF<F extends HKT.URIS, C = HKT.Auto>(
  F: Access<F, C> & AssociativeFlatten<F, C>
): <K, Q, W, X, I, S, R, R2, E, A>(
  f: (r: HKT.OrFix<"R", C, R2>) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
) => HKT.Kind<F, C, K, Q, W, X, I, S, R & R2, E, A>
export function accessMF<F>(
  F: Access<HKT.UHKT3<F>> & AssociativeFlatten<HKT.UHKT3<F>>
): <R, E, A>(f: (r: R) => HKT.HKT3<F, R, E, A>) => HKT.HKT3<F, R, E, A> {
  return (x) => pipe(x, F.access, F.flatten)
}

export function accessServiceMF<F extends HKT.URIS, C extends HKT.V<"R", "-">>(
  F: Monad<F, C> & Access<F, C>
): <Service>(
  H: Tag<Service>
) => <K, Q, W, X, I, S, R, E, A>(
  f: (_: Service) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
) => HKT.Kind<F, C, K, Q, W, X, I, S, R & Has<Service>, E, A>
export function accessServiceMF<F>(
  F: Monad<HKT.UHKT3<F>, HKT.V<"R", "-">> & Access<HKT.UHKT3<F>, HKT.V<"R", "-">>
) {
  return <Service>(H: Tag<Service>) =>
    <R, E, A>(
      f: (_: Service) => HKT.HKT3<F, R, E, A>
    ): HKT.HKT3<F, Has<Service> & R, E, A> =>
      accessMF(F)((x: Has<Service>) => pipe(x, H.read, f))
}

export function provideServiceF<F extends HKT.URIS, C extends HKT.V<"R", "-">>(
  F: Monad<F, C> & Access<F, C> & Provide<F, C>
): <Service>(
  H: Tag<Service>
) => (
  S: Service
) => <K, Q, W, X, I, S, R, E, A>(
  fa: HKT.Kind<F, C, K, Q, W, X, I, S, R & Has<Service>, E, A>
) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
export function provideServiceF<F>(
  F: Monad<HKT.UHKT3<F>, HKT.V<"R", "-">> &
    Access<HKT.UHKT3<F>, HKT.V<"R", "-">> &
    Provide<HKT.UHKT3<F>, HKT.V<"R", "-">>
) {
  return <Service>(H: Tag<Service>) =>
    <R, E, A>(S: Service) =>
    (fa: HKT.HKT3<F, Has<Service> & R, E, A>): HKT.HKT3<F, R, E, A> =>
      accessMF(F)((r: R) =>
        pipe(fa, F.provide({ ...r, [H.key]: S } as unknown as R & Has<Service>))
      )
}

export function provideSomeF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C> & Access<F, C> & Provide<F, C>
): <R, R2>(
  f: (_: HKT.OrFix<"R", C, R2>) => HKT.OrFix<"R", C, R>
) => <K, Q, W, X, I, S, E, A>(
  fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
) => HKT.Kind<F, C, K, Q, W, X, I, S, R2, E, A>
export function provideSomeF<F>(
  F: Monad<HKT.UHKT3<F>> & Access<HKT.UHKT3<F>> & Provide<HKT.UHKT3<F>>
) {
  return <R0, R, E, A>(f: (r0: R0) => R) =>
    (fa: HKT.HKT3<F, R, E, A>): HKT.HKT3<F, R0, E, A> =>
      accessMF(F)((r0: R0) => pipe(fa, F.provide(f(r0))))
}
