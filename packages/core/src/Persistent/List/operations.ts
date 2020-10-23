import * as List from "@effect-ts/system/List"

import type { Ord } from "../../Classic/Ord"
import { Ordering, toNumber } from "../../Classic/Ordering"
import { pipe } from "../../Function"
import type { ListURI } from "../../Modules"
import * as P from "../../Prelude"

export const foreachF = P.implementForeachF<[ListURI]>()(() => (G) => (f) => (fa) =>
  List.foldr_(fa, P.succeedF(G)(List.empty()), (a, acc) =>
    pipe(
      f(a),
      G.both(acc),
      G.map(([b, l]) => List.prepend_(l, b))
    )
  )
)

export const Traversable = P.instance<P.Traversable<[ListURI]>>({
  foreachF,
  map: List.map
})

export const sequence = P.sequenceF(Traversable)

/**
 * Sort the given list by passing each value through the function and
 * comparing the resulting value.
 *
 * Performs a stable sort.
 *
 * @complexity O(n * log(n))
 */
export function sortBy<B>(
  O: Ord<B>
): <A>(f: (a: A) => B) => (l: List.List<A>) => List.List<A> {
  const so = sortBy_(O)
  return <A>(f: (a: A) => B) => (l: List.List<A>): List.List<A> => so(l, f)
}

/**
 * Sort the given list by passing each value through the function and
 * comparing the resulting value.
 *
 * Performs a stable sort.
 *
 * @complexity O(n * log(n))
 */
export function sortBy_<B>(
  O: Ord<B>
): <A>(l: List.List<A>, f: (a: A) => B) => List.List<A> {
  return <A>(l: List.List<A>, f: (a: A) => B): List.List<A> => {
    if (l.length === 0) {
      return l
    }
    const arr: { elm: A; prop: B; idx: number }[] = []
    let i = 0
    List.forEach_(l, (elm) => arr.push({ idx: i++, elm, prop: f(elm) }))
    arr.sort(({ idx: i, prop: a }, { idx: j, prop: b }) => {
      const c = O.compare(b)(a)
      return c !== Ordering.wrap("eq") ? toNumber(c) : i < j ? -1 : 1
    })
    const newL = List.emptyPushable<A>()
    for (let i = 0; i < arr.length; ++i) {
      List.push(arr[i].elm, newL)
    }
    return newL
  }
}
