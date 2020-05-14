/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { Applicative } from "fp-ts/lib/Applicative"
import type { Separated } from "fp-ts/lib/Compactable"
import type { HKT } from "fp-ts/lib/HKT"
import type { TraversableWithIndex2C } from "fp-ts/lib/TraversableWithIndex"
import type { Witherable2C } from "fp-ts/lib/Witherable"

import type { Either } from "../../Either"
import type { Monoid } from "../../Monoid"
import type { Option } from "../../Option"
import type { Ord } from "../../Ord"

import type { Next } from "./Next"
import { URI } from "./URI"
import { empty } from "./empty"
import { keys } from "./keys"
import { mapWithIndex_ } from "./mapWithIndex_"
import { readonlyMap } from "./readonlyMap"

/**
 * @since 2.5.0
 */
export function getWitherable<K>(
  O: Ord<K>
): Witherable2C<URI, K> & TraversableWithIndex2C<URI, K, K> {
  const keysO = keys(O)

  const reduceWithIndex = <A, B>(
    fa: ReadonlyMap<K, A>,
    b: B,
    f: (k: K, b: B, a: A) => B
  ): B => {
    let out: B = b
    const ks = keysO(fa)
    const len = ks.length
    for (let i = 0; i < len; i++) {
      const k = ks[i]
      out = f(k, out, fa.get(k)!)
    }
    return out
  }

  const foldMapWithIndex = <M>(M: Monoid<M>) => <A>(
    fa: ReadonlyMap<K, A>,
    f: (k: K, a: A) => M
  ): M => {
    let out: M = M.empty
    const ks = keysO(fa)
    const len = ks.length
    for (let i = 0; i < len; i++) {
      const k = ks[i]
      out = M.concat(out, f(k, fa.get(k)!))
    }
    return out
  }

  const reduceRightWithIndex = <A, B>(
    fa: ReadonlyMap<K, A>,
    b: B,
    f: (k: K, a: A, b: B) => B
  ): B => {
    let out: B = b
    const ks = keysO(fa)
    const len = ks.length
    for (let i = len - 1; i >= 0; i--) {
      const k = ks[i]
      out = f(k, fa.get(k)!, out)
    }
    return out
  }

  const traverseWithIndex = <F>(
    F: Applicative<F>
  ): (<K, A, B>(
    ta: ReadonlyMap<K, A>,
    f: (k: K, a: A) => HKT<F, B>
  ) => HKT<F, ReadonlyMap<K, B>>) => {
    return <K, A, B>(ta: ReadonlyMap<K, A>, f: (k: K, a: A) => HKT<F, B>) => {
      let fm: HKT<F, ReadonlyMap<K, B>> = F.of(empty)
      const entries = ta.entries()
      let e: Next<readonly [K, A]>
      // tslint:disable-next-line: strict-boolean-expressions
      while (!(e = entries.next()).done) {
        const [key, a] = e.value
        fm = F.ap(
          F.map(fm, (m) => (b: B) => new Map(m).set(key, b)),
          f(key, a)
        )
      }
      return fm
    }
  }

  const traverse = <F>(
    F: Applicative<F>
  ): (<K, A, B>(
    ta: ReadonlyMap<K, A>,
    f: (a: A) => HKT<F, B>
  ) => HKT<F, ReadonlyMap<K, B>>) => {
    const traverseWithIndexF = traverseWithIndex(F)
    return (ta, f) => traverseWithIndexF(ta, (_, a) => f(a))
  }

  const sequence = <F>(
    F: Applicative<F>
  ): (<K, A>(ta: ReadonlyMap<K, HKT<F, A>>) => HKT<F, ReadonlyMap<K, A>>) => {
    const traverseWithIndexF = traverseWithIndex(F)
    return (ta) => traverseWithIndexF(ta, (_, a) => a)
  }

  return {
    ...readonlyMap,
    _E: undefined as any,
    reduce: (fa, b, f) => reduceWithIndex(fa, b, (_, b, a) => f(b, a)),
    foldMap: (M) => {
      const foldMapWithIndexM = foldMapWithIndex(M)
      return (fa, f) => foldMapWithIndexM(fa, (_, a) => f(a))
    },
    reduceRight: (fa, b, f) => reduceRightWithIndex(fa, b, (_, a, b) => f(a, b)),
    traverse,
    sequence,
    mapWithIndex: mapWithIndex_,
    reduceWithIndex,
    foldMapWithIndex,
    reduceRightWithIndex,
    traverseWithIndex,
    wilt: <F>(
      F: Applicative<F>
    ): (<K, A, B, C>(
      wa: ReadonlyMap<K, A>,
      f: (a: A) => HKT<F, Either<B, C>>
    ) => HKT<F, Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>>>) => {
      const traverseF = traverse(F)
      return (wa, f) => F.map(traverseF(wa, f), readonlyMap.separate)
    },
    wither: <F>(
      F: Applicative<F>
    ): (<K, A, B>(
      wa: ReadonlyMap<K, A>,
      f: (a: A) => HKT<F, Option<B>>
    ) => HKT<F, ReadonlyMap<K, B>>) => {
      const traverseF = traverse(F)
      return (wa, f) => F.map(traverseF(wa, f), readonlyMap.compact)
    }
  }
}
