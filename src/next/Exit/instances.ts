import * as A from "../../Array"
import { CMonad2, CApplicative2 } from "../../Base"

import { ap } from "./ap"
import { chain } from "./chain"
import { Exit } from "./exit"
import { map } from "./map"
import { succeed } from "./succeed"

export const URI = "@matechs/core/Eff/ExitURI"
export type URI = typeof URI

declare module "../../Base/HKT" {
  interface URItoKind2<E, A> {
    [URI]: Exit<E, A>
  }
}

export const monadExit: CMonad2<URI> & CApplicative2<URI> = {
  URI,
  chain,
  map,
  of: succeed,
  ap
}

export const applicativeExit: CApplicative2<URI> = {
  URI,
  map,
  of: succeed,
  ap
}

export const sequenceArray =
  
  A.sequence(applicativeExit)
