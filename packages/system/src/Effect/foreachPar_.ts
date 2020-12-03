import * as core from "./core"
import type { Effect } from "./effect"
import * as foreach from "./foreach"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, readonly B[]> {
  const arr = Array.from(as)

  return core.chain_(
    core.effectTotal<B[]>(() => []),
    (array) => {
      const fn = ([a, n]: [A, number]) =>
        core.chain_(
          core.suspend(() => f(a)),
          (b) =>
            core.effectTotal(() => {
              array[n] = b
            })
        )
      return core.chain_(
        foreach.foreachUnitPar_(
          arr.map((a, n) => [a, n] as [A, number]),
          fn
        ),
        () => core.effectTotal(() => array)
      )
    }
  )
}
