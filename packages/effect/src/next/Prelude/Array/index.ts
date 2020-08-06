import * as A from "../../../Array"
import { pipe } from "../../../Function"
import { Covariant } from "../Covariant"
import { HKT } from "../HKT"
import * as IdentityBoth from "../IdentityBoth"
import { Traversable1 } from "../Traversable"

export const TraversableURI = "TraversableArray"
export type TraversableURI = typeof TraversableURI

declare module "../HKT" {
  interface URItoKind<A> {
    [TraversableURI]: readonly A[]
  }
}

export const Traversable: Traversable1<TraversableURI> = {
  URI: TraversableURI,
  map: (f) => (fa) => fa.map(f),
  foreach: <G>(G: IdentityBoth.IdentityBoth<G> & Covariant<G>) => <A, B>(
    f: (a: A) => HKT<G, B>
  ) => (fa: readonly A[]): HKT<G, readonly B[]> =>
    A.reduce_(fa, IdentityBoth.succeed(G)([] as readonly B[]), (b, a) =>
      pipe(
        b,
        G.both(f(a)),
        G.map(([x, y]) => [...x, y])
      )
    )
}

export { range } from "../../../Array"
