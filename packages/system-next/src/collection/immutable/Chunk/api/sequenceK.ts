import type { Kind } from "../../../../prelude/HKT"
import type * as TypeClasses from "../../../../prelude/TypeClasses"
import type { Chunk } from "../_definition"

/**
 * @ets getter ets/Chunk sequenceK
 */
export function sequenceK<A>(self: Chunk<A>) {
  return <G>(
    G: TypeClasses.Applicative<G> &
      ([A] extends [Kind<G, any, any, any>]
        ? unknown
        : ["invalid applicative instance for", A])
  ): [A] extends [Kind<G, infer R, infer E, infer B>]
    ? Kind<G, R, E, Chunk<B>>
    : never => {
    const val = self.mapK(G)((x) => x as any)
    return val as any
  }
}
