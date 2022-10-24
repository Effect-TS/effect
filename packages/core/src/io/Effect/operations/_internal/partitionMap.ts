import type { Either } from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"

/** @internal */
export function partitionMap<A, A1, A2>(
  as: Iterable<A>,
  f: (a: A) => Either<A1, A2>
): readonly [List.List<A1>, List.List<A2>] {
  return pipe(
    ReadonlyArray.fromIterable(as),
    ReadonlyArray.reduceRight(
      [List.empty<A1>(), List.empty<A2>()] as const,
      ([lefts, rights], current) => {
        const either = f(current)
        switch (either._tag) {
          case "Left": {
            return [pipe(lefts, List.prepend(either.left)), rights] as const
          }
          case "Right": {
            return [lefts, pipe(rights, List.prepend(either.right))] as const
          }
        }
      }
    )
  )
}
