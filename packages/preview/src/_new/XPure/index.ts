import { constant, identity } from "../../_system/Function"
import * as X from "../../_system/XPure"
import * as P from "../Prelude"

export const XPureURI = "XPureURI"
export type XPureURI = typeof XPureURI

declare module "../HKT" {
  interface URItoKind<K, SI, SO, X, I, S, R, E, A> {
    [XPureURI]: X.XPure<SI, SO, R, E, A>
  }
}

export const Any: P.Any<XPureURI> = {
  any: () => X.succeed(constant({}))
}

export const AssociativeBoth: P.AssociativeBoth<XPureURI> = {
  both: X.zip
}

export const AssociativeEither: P.AssociativeEither<XPureURI> = {
  either: X.orElseEither
}

export const AssociativeFlatten: P.AssociativeFlatten<XPureURI> = {
  flatten: (ffa) => X.chain_(ffa, identity)
}
