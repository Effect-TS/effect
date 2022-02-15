import * as Iter from "../../../../collection/immutable/Iterable"
import { List } from "../../../../collection/immutable/List"
import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Either } from "../../../../data/Either"

export function partitionMap<A, A1, A2>(
  as: Iterable<A>,
  f: (a: A) => Either<A1, A2>
): Tuple<[List<A1>, List<A2>]> {
  return Iter.reduceRight_(
    as,
    Tuple(List.empty<A1>(), List.empty<A2>()),
    (a, { tuple: [es, bs] }) =>
      f(a).fold(
        (e) => Tuple(es.prepend(e), bs),
        (b) => Tuple(es, bs.prepend(b))
      )
  )
}
