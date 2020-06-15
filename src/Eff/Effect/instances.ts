import { CApplicative4MA, CMonad4MA } from "../../Base"
import * as D from "../../Do"

import { Effect } from "./effect"
import { IFlatMap, ISucceed } from "./primitives"

//
// @category Instances
//

export const URI = "@matechs/core/Eff"
export type URI = typeof URI

declare module "../../Base/HKT" {
  interface MaToKind<S, R, E, A> {
    [URI]: Effect<S, R, E, A>
  }
}

export const monadEff: CMonad4MA<URI> & CApplicative4MA<URI> = {
  URI,
  ap: (fa) => (fab) =>
    new IFlatMap(fab, (f) => new IFlatMap(fa, (a) => new ISucceed(f(a)))),
  chain: (f) => (fa) => new IFlatMap(fa, f),
  map: (f) => (fa) => new IFlatMap(fa, (x) => new ISucceed(f(x))),
  of: (a) => new ISucceed(a)
}

export function Do() {
  return D.Do(monadEff)
}
