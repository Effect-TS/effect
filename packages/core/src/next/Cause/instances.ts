import * as AP from "../../Apply"
import * as A from "../../Array"
import { CMonad1, CApplicative1 } from "../../Base"
import * as D from "../../Do"
import * as E from "../../Either"
import * as O from "../../Option"

import { ap } from "./ap"
import { Cause, Fail } from "./cause"
import { chain } from "./chain"
import { map } from "./map"

//
// @category Instances
//

export const URI = "@matechs/core/Eff/Cause"
export type URI = typeof URI

declare module "../../Base/HKT" {
  interface URItoKind<A> {
    [URI]: Cause<A>
  }
}

export const monadCause: CMonad1<URI> & CApplicative1<URI> = {
  URI,
  of: Fail,
  chain,
  map,
  ap
}

export const applicativeCause: CApplicative1<URI> = {
  URI,
  ap,
  map,
  of: Fail
}

//
// @category Derivations
//

export const sequenceOption = O.sequence(applicativeCause)

export const sequenceEither = E.sequence(applicativeCause)

export const sequenceArray = A.sequence(applicativeCause)

export const sequenceT = AP.sequenceT(applicativeCause)

export const sequenceS = AP.sequenceS(applicativeCause)

export const Do = () => D.Do(monadCause)
