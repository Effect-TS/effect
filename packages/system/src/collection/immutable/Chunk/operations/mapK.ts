import type { Kind } from "../../../../prelude/HKT"
import type * as TypeClasses from "../../../../prelude/TypeClasses"
import { Chunk } from "../definition"

/**
 * @tsplus getter ets/Chunk mapK
 */
export function mapK<A>(self: Chunk<A>) {
  return <G>(G: TypeClasses.Applicative<G>) =>
    <R, E, B>(f: (a: A) => Kind<G, R, E, B>): Kind<G, R, E, Chunk<B>> =>
      self.reduce<A, Kind<G, R, E, Chunk<B>>>(G.of(Chunk.empty()), (fbs, a) =>
        pipe(
          fbs,
          G.map((bs) => (b: B) => bs.append(b)),
          G.ap(f(a))
        )
      )
}
