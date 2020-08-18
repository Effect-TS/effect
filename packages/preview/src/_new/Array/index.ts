import { pipe } from "../../Function"
import * as A from "../../_system/Array"
import * as P from "../Prelude"

export const ArrayURI = "ArrayURI"
export type ArrayURI = typeof ArrayURI

declare module "../HKT" {
  interface URItoKind<K, SI, SO, X, I, S, R, E, A> {
    [ArrayURI]: A.Array<A>
  }
}

export const Any: P.Any<ArrayURI> = {
  URI: ArrayURI,
  any: () => []
}

export const AssociativeBoth: P.AssociativeBoth<ArrayURI> = {
  URI: ArrayURI,
  both: A.zip
}

export const AssociativeFlatten: P.AssociativeFlatten<ArrayURI> = {
  URI: ArrayURI,
  flatten: A.flatten
}

export const Covariant: P.Covariant<ArrayURI> = {
  URI: ArrayURI,
  map: A.map
}

export const Applicative: P.Applicative<ArrayURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeBoth
}

export const Monad: P.Monad<ArrayURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
}

export const foreachF = P.implementForeachF<ArrayURI>()((_) => (G) => (f) => (fa) =>
  A.reduce_(
    fa,
    pipe(
      G.any(),
      G.map(() => [] as typeof _.B[])
    ),
    (b, a) =>
      pipe(
        b,
        G.both(f(a)),
        G.map(([x, y]) => [...x, y])
      )
  )
)

export const Traversable: P.Traversable<ArrayURI> = {
  URI: ArrayURI,
  map: A.map,
  foreachF
}
