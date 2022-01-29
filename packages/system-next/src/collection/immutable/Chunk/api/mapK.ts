import type { Kind } from "../../../../prelude/HKT"
import type * as TypeClasses from "../../../../prelude/TypeClasses"
import type { Chunk } from "../_definition"
import { append_, empty } from "../core"
import { reduce_ } from "./reduce"

/**
 * @ets getter ets/Chunk mapK
 */
export function mapK<A>(self: Chunk<A>) {
  return <G>(G: TypeClasses.Applicative<G>) =>
    <R, E, B>(f: (a: A) => Kind<G, R, E, B>): Kind<G, R, E, Chunk<B>> =>
      reduce_<A, Kind<G, R, E, Chunk<B>>>(self, G.of(empty()), (fbs, a) =>
        pipe(
          fbs,
          G.map((bs) => (b: B) => append_(bs, b)),
          G.ap(f(a))
        )
      )
}
