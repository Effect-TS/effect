import { pipe } from "../../Function"
import * as A from "../../_system/Array"
import * as P from "../Prelude"

export const ArrayURI = "ArrayURI"
export type ArrayURI = typeof ArrayURI

declare module "../HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [ArrayURI]: A.Array<A>
  }
}

export const Any: P.Any<ArrayURI> = {
  F: ArrayURI,
  any: () => []
}

export const AssociativeBoth = P.instance<P.AssociativeBoth<ArrayURI>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<ArrayURI>>({
  flatten: A.flatten
})

export const Covariant = P.instance<P.Covariant<ArrayURI>>({
  map: A.map
})

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

export const Traversable = P.instance<P.Traversable<ArrayURI>>({
  map: A.map,
  foreachF
})
