/* adapted from https://github.com/gcanti/fp-ts */

/**
 * Multi-way trees (aka rose trees) and forests, where a forest is
 *
 * ```ts
 * type Forest<A> = Array<Tree<A>>
 * ```
 */

import * as A from "../Array"
import type {
  URIS3,
  Kind3,
  URIS2,
  Kind2,
  URIS,
  Kind,
  HKT,
  CTraverse1,
  CApplicative,
  CSequence1,
  CMonad3,
  CMonad3C,
  CMonad2,
  CMonad2C,
  CMonad1,
  CMonad,
  CFoldable1,
  CTraversable1,
  CComonad1,
  CApplicative3,
  CApplicative3C,
  CApplicative2,
  CApplicative2C,
  CApplicative1,
  CMonad4,
  CApplicative4,
  URIS4,
  Kind4,
  CApplicative4MA,
  MaURIS,
  CApplicative4MAP,
  CApplicative4MAPC,
  CApplicative4MAC,
  CMonad4MA,
  CMonad4MAC,
  Traverse1,
  Monad1,
  Foldable1,
  Traversable1,
  Comonad1,
  Applicative1,
  Applicative
} from "../Base"
import { Eq, fromEquals } from "../Eq"
import { identity } from "../Function"
import { pipe } from "../Function"
import type { Monoid } from "../Monoid"
import type { Show } from "../Show"

export const URI = "@matechs/core/Tree"

export type URI = typeof URI

export declare type Forest<A> = ReadonlyArray<Tree<A>>

export interface Tree<A> {
  readonly value: A
  readonly forest: Forest<A>
}

declare module "../Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: Tree<A>
  }
}

export function make<A>(value: A, forest: Forest<A> = A.empty): Tree<A> {
  return {
    value,
    forest
  }
}

export function getShow<A>(S: Show<A>): Show<Tree<A>> {
  const show = (t: Tree<A>): string => {
    return t.forest === A.empty || t.forest.length === 0
      ? `make(${S.show(t.value)})`
      : `make(${S.show(t.value)}, [${t.forest.map(show).join(", ")}])`
  }
  return {
    show
  }
}

export function getEq<A>(E: Eq<A>): Eq<Tree<A>> {
  // eslint-disable-next-line prefer-const
  let SA: Eq<ReadonlyArray<Tree<A>>>
  const R: Eq<Tree<A>> = fromEquals(
    (x, y) => E.equals(x.value, y.value) && SA.equals(x.forest, y.forest)
  )
  SA = A.getEq(R)
  return R
}

const draw = (indentation: string, forest: Forest<string>): string => {
  let r = ""
  const len = forest.length
  let tree: Tree<string>
  for (let i = 0; i < len; i++) {
    tree = forest[i]
    const isLast = i === len - 1
    r += indentation + (isLast ? "└" : "├") + "─ " + tree.value
    r += draw(indentation + (len > 1 && !isLast ? "│  " : "   "), tree.forest)
  }
  return r
}

/**
 * Neat 2-dimensional drawing of a forest
 */
export function drawForest(forest: Forest<string>): string {
  return draw("\n", forest)
}

/**
 * Neat 2-dimensional drawing of a tree
 *
 * @example
 * import { make, drawTree, tree } from '@matechs/core/Tree'
 *
 * const fa = make('a', [
 *   tree.of('b'),
 *   tree.of('c'),
 *   make('d', [tree.of('e'), tree.of('f')])
 * ])
 *
 * assert.strictEqual(drawTree(fa), `a
 * ├─ b
 * ├─ c
 * └─ d
 *    ├─ e
 *    └─ f`)
 */
export function drawTree(tree: Tree<string>): string {
  return tree.value + drawForest(tree.forest)
}

/**
 * Build a tree from a seed value
 */
export function unfoldTree<A, B>(b: B, f: (b: B) => [A, Array<B>]): Tree<A> {
  const [a, bs] = f(b)
  return { value: a, forest: unfoldForest(bs, f) }
}

/**
 * Build a tree from a seed value
 */
export function unfoldForest<A, B>(
  bs: Array<B>,
  f: (b: B) => [A, Array<B>]
): Forest<A> {
  return bs.map((b) => unfoldTree(b, f))
}

/**
 * Monadic tree builder, in depth-first order
 */
export function unfoldTreeM<M extends MaURIS, E>(
  M: CMonad4MA<M> & CApplicative4MAC<M, E>
): <S, R, A, B>(
  b: B,
  f: (b: B) => Kind4<M, S, R, E, [A, Array<B>]>
) => Kind4<M, S, R, E, Tree<A>>
export function unfoldTreeM<M extends MaURIS, E>(
  M: CMonad4MAC<M, E> & CApplicative4MAPC<M, E>
): <S, R, A, B>(
  b: B,
  f: (b: B) => Kind4<M, S, R, E, [A, Array<B>]>
) => Kind4<M, unknown, R, E, Tree<A>>
export function unfoldTreeM<M extends MaURIS>(
  M: CMonad4MA<M> & CApplicative4MAP<M>
): <S, R, E, A, B>(
  b: B,
  f: (b: B) => Kind4<M, S, R, E, [A, Array<B>]>
) => Kind4<M, unknown, R, E, Tree<A>>
export function unfoldTreeM<M extends MaURIS>(
  M: CMonad4MA<M> & CApplicative4MA<M>
): <S, R, E, A, B>(
  b: B,
  f: (b: B) => Kind4<M, S, R, E, [A, Array<B>]>
) => Kind4<M, S, R, E, Tree<A>>
export function unfoldTreeM<M extends URIS4>(
  M: CMonad4<M> & CApplicative4<M>
): <S, R, E, A, B>(
  b: B,
  f: (b: B) => Kind4<M, S, R, E, [A, Array<B>]>
) => Kind4<M, S, R, E, Tree<A>>
export function unfoldTreeM<M extends URIS3>(
  M: CMonad3<M> & CApplicative3<M>
): <R, E, A, B>(
  b: B,
  f: (b: B) => Kind3<M, R, E, [A, Array<B>]>
) => Kind3<M, R, E, Tree<A>>
export function unfoldTreeM<M extends URIS3, E>(
  M: CMonad3C<M, E> & CApplicative3C<M, E>
): <R, A, B>(
  b: B,
  f: (b: B) => Kind3<M, R, E, [A, Array<B>]>
) => Kind3<M, R, E, Tree<A>>
export function unfoldTreeM<M extends URIS2>(
  M: CMonad2<M> & CApplicative2<M>
): <E, A, B>(b: B, f: (b: B) => Kind2<M, E, [A, Array<B>]>) => Kind2<M, E, Tree<A>>
export function unfoldTreeM<M extends URIS2, E>(
  M: CMonad2C<M, E> & CApplicative2C<M, E>
): <A, B>(b: B, f: (b: B) => Kind2<M, E, [A, Array<B>]>) => Kind2<M, E, Tree<A>>
export function unfoldTreeM<M extends URIS>(
  M: CMonad1<M> & CApplicative1<M>
): <A, B>(b: B, f: (b: B) => Kind<M, [A, Array<B>]>) => Kind<M, Tree<A>>
export function unfoldTreeM<M>(
  M: CMonad<M> & CApplicative<M>
): <A, B>(b: B, f: (b: B) => HKT<M, [A, Array<B>]>) => HKT<M, Tree<A>>
export function unfoldTreeM<M>(
  M: CMonad<M> & CApplicative<M>
): <A, B>(b: B, f: (b: B) => HKT<M, [A, Array<B>]>) => HKT<M, Tree<A>> {
  const unfoldForestMM = unfoldForestM(M)
  return (b, f) =>
    pipe(
      f(b),
      M.chain(([a, bs]) =>
        pipe(
          unfoldForestMM(bs, f),
          M.chain((ts) => M.of({ value: a, forest: ts }))
        )
      )
    )
}

/**
 * Monadic forest builder, in depth-first order
 */
export function unfoldForestM<M extends MaURIS, E>(
  M: CMonad4MAC<M, E> & CApplicative4MAC<M, E>
): <S, R, E, A, B>(
  bs: Array<B>,
  f: (b: B) => Kind4<M, S, R, E, [A, Array<B>]>
) => Kind4<M, S, R, E, Forest<A>>
export function unfoldForestM<M extends MaURIS, E>(
  M: CMonad4MAC<M, E> & CApplicative4MAPC<M, E>
): <S, R, E, A, B>(
  bs: Array<B>,
  f: (b: B) => Kind4<M, S, R, E, [A, Array<B>]>
) => Kind4<M, unknown, R, E, Forest<A>>
export function unfoldForestM<M extends MaURIS>(
  M: CMonad4MA<M> & CApplicative4MAP<M>
): <S, R, E, A, B>(
  bs: Array<B>,
  f: (b: B) => Kind4<M, S, R, E, [A, Array<B>]>
) => Kind4<M, unknown, R, E, Forest<A>>
export function unfoldForestM<M extends MaURIS>(
  M: CMonad4MA<M> & CApplicative4MA<M>
): <S, R, E, A, B>(
  bs: Array<B>,
  f: (b: B) => Kind4<M, S, R, E, [A, Array<B>]>
) => Kind4<M, S, R, E, Forest<A>>
export function unfoldForestM<M extends URIS4>(
  M: CMonad4<M> & CApplicative4<M>
): <S, R, E, A, B>(
  bs: Array<B>,
  f: (b: B) => Kind4<M, S, R, E, [A, Array<B>]>
) => Kind4<M, S, R, E, Forest<A>>
export function unfoldForestM<M extends URIS3>(
  M: CMonad3<M> & CApplicative3<M>
): <R, E, A, B>(
  bs: Array<B>,
  f: (b: B) => Kind3<M, R, E, [A, Array<B>]>
) => Kind3<M, R, E, Forest<A>>
export function unfoldForestM<M extends URIS3, E>(
  M: CMonad3C<M, E> & CApplicative3C<M, E>
): <R, A, B>(
  bs: Array<B>,
  f: (b: B) => Kind3<M, R, E, [A, Array<B>]>
) => Kind3<M, R, E, Forest<A>>
export function unfoldForestM<M extends URIS2>(
  M: CMonad2<M> & CApplicative2<M>
): <R, E, B>(
  bs: Array<B>,
  f: (b: B) => Kind2<M, R, [E, Array<B>]>
) => Kind2<M, R, Forest<E>>
export function unfoldForestM<M extends URIS2, E>(
  M: CMonad2C<M, E> & CApplicative2C<M, E>
): <A, B>(
  bs: Array<B>,
  f: (b: B) => Kind2<M, E, [A, Array<B>]>
) => Kind2<M, E, Forest<A>>
export function unfoldForestM<M extends URIS>(
  M: CMonad1<M> & CApplicative1<M>
): <A, B>(bs: Array<B>, f: (b: B) => Kind<M, [A, Array<B>]>) => Kind<M, Forest<A>>
export function unfoldForestM<M>(
  M: CMonad<M> & CApplicative<M>
): <A, B>(bs: Array<B>, f: (b: B) => HKT<M, [A, Array<B>]>) => HKT<M, Forest<A>>
export function unfoldForestM<M>(
  M: CMonad<M> & CApplicative<M>
): <A, B>(bs: Array<B>, f: (b: B) => HKT<M, [A, Array<B>]>) => HKT<M, Forest<A>> {
  const traverseM = A.traverse(M)
  return (bs, f) =>
    pipe(
      bs,
      traverseM((b) => unfoldTreeM(M)(b, f))
    )
}

export function elem_<A>(E: Eq<A>): (fa: Tree<A>, a: A) => boolean {
  const go = (fa: Tree<A>, a: A): boolean => {
    if (E.equals(a, fa.value)) {
      return true
    }
    return fa.forest.some((tree) => go(tree, a))
  }
  return go
}

export function elem<A>(E: Eq<A>): (a: A) => (fa: Tree<A>) => boolean {
  const go = (a: A) => (fa: Tree<A>): boolean => {
    if (E.equals(a, fa.value)) {
      return true
    }
    return fa.forest.some(go(a))
  }
  return go
}

/**
 * Fold a tree into a "summary" value in depth-first order.
 *
 * For each node in the tree, apply `f` to the `value` and the result of applying `f` to each `forest`.
 *
 * This is also known as the catamorphism on trees.
 *
 * @example
 * import { fold, make } from '@matechs/core/Tree'
 *
 * const t = make(1, [make(2), make(3)])
 *
 * const sum = (as: Array<number>) => as.reduce((a, acc) => a + acc, 0)
 *
 * // Sum the values in a tree:
 * assert.deepStrictEqual(fold((a: number, bs: Array<number>) => a + sum(bs))(t), 6)
 *
 * // Find the maximum value in the tree:
 * assert.deepStrictEqual(fold((a: number, bs: Array<number>) => bs.reduce((b, acc) => Math.max(b, acc), a))(t), 3)
 *
 * // Count the number of leaves in the tree:
 * assert.deepStrictEqual(fold((_: number, bs: Array<number>) => (bs.length === 0 ? 1 : sum(bs)))(t), 2)
 */
export function fold<A, B>(f: (a: A, bs: Array<B>) => B): (tree: Tree<A>) => B {
  const go = (tree: Tree<A>): B => f(tree.value, tree.forest.map(go))
  return go
}

export const map_: <A, B>(fa: Tree<A>, f: (a: A) => B) => Tree<B> = (fa, f) => ({
  value: f(fa.value),
  forest: fa.forest.map((t) => map_(t, f))
})

export const of: <A>(a: A) => Tree<A> = (a) => ({
  value: a,
  forest: A.empty
})

export const ap_: <A, B>(fab: Tree<(a: A) => B>, fa: Tree<A>) => Tree<B> = (fab, fa) =>
  chain_(fab, (f) => map_(fa, f))

export const chain_ = <A, B>(fa: Tree<A>, f: (a: A) => Tree<B>): Tree<B> => {
  const { forest, value } = f(fa.value)
  const concat = A.getMonoid<Tree<B>>().concat
  return {
    value,
    forest: concat(
      forest,
      fa.forest.map((t) => chain_(t, f))
    )
  }
}

export const reduce_ = <A, B>(fa: Tree<A>, b: B, f: (b: B, a: A) => B): B => {
  let r: B = f(b, fa.value)
  const len = fa.forest.length
  for (let i = 0; i < len; i++) {
    r = reduce_(fa.forest[i], r, f)
  }
  return r
}

export const foldMap_: <M>(M: Monoid<M>) => <A>(fa: Tree<A>, f: (a: A) => M) => M = (
  M
) => (fa, f) => reduce_(fa, M.empty, (acc, a) => M.concat(acc, f(a)))

export const reduceRight_ = <A, B>(fa: Tree<A>, b: B, f: (a: A, b: B) => B): B => {
  let r: B = b
  const len = fa.forest.length
  for (let i = len - 1; i >= 0; i--) {
    r = reduceRight_(fa.forest[i], r, f)
  }
  return f(fa.value, r)
}

export const traverse: CTraverse1<URI> = <F>(
  F: CApplicative<F>
): (<A, B>(f: (a: A) => HKT<F, B>) => (ta: Tree<A>) => HKT<F, Tree<B>>) => {
  const traverseF = A.traverse(F)
  const r = <A, B>(f: (a: A) => HKT<F, B>) => (ta: Tree<A>): HKT<F, Tree<B>> =>
    pipe(
      f(ta.value),
      F.map((value: B) => (forest: Forest<B>) => ({
        value,
        forest
      })),
      F.ap(
        pipe(
          ta.forest,
          traverseF((t) => r(f)(t))
        )
      )
    )
  return r
}

export const traverse_: Traverse1<URI> = <F>(
  F: CApplicative<F>
): (<A, B>(ta: Tree<A>, f: (a: A) => HKT<F, B>) => HKT<F, Tree<B>>) => {
  const traverseF = A.traverse(F)
  const r = <A, B>(ta: Tree<A>, f: (a: A) => HKT<F, B>): HKT<F, Tree<B>> =>
    pipe(
      f(ta.value),
      F.map((value: B) => (forest: Forest<B>) => ({
        value,
        forest
      })),
      F.ap(
        pipe(
          ta.forest,
          traverseF((t) => r(t, f))
        )
      )
    )
  return r
}

export const sequence: CSequence1<URI> = <F>(
  F: CApplicative<F>
): (<A>(ta: Tree<HKT<F, A>>) => HKT<F, Tree<A>>) => {
  const traverseF = traverse(F)
  return traverseF(identity)
}

export const extract: <A>(wa: Tree<A>) => A = (wa) => wa.value

export const extend_: <A, B>(wa: Tree<A>, f: (wa: Tree<A>) => B) => Tree<B> = (
  wa,
  f
) => ({
  value: f(wa),
  forest: wa.forest.map((t) => extend_(t, f))
})

export const extend: <A, B>(f: (fa: Tree<A>) => B) => (ma: Tree<A>) => Tree<B> = (
  f
) => (ma) => extend_(ma, f)

export const ap: <A>(fa: Tree<A>) => <B>(fab: Tree<(a: A) => B>) => Tree<B> = (fa) => (
  fab
) => ap_(fab, fa)

export const apFirst: <B>(fb: Tree<B>) => <A>(fa: Tree<A>) => Tree<A> = (fb) => (fa) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )

export const apFirst_: <A, B>(fa: Tree<A>, fb: Tree<B>) => Tree<A> = (fa, fb) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )

export const apSecond = <B>(fb: Tree<B>) => <A>(fa: Tree<A>): Tree<B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )

export const apSecond_ = <A, B>(fa: Tree<A>, fb: Tree<B>): Tree<B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )

export const chain: <A, B>(f: (a: A) => Tree<B>) => (ma: Tree<A>) => Tree<B> = (f) => (
  ma
) => chain_(ma, f)

export const chainTap: <A, B>(f: (a: A) => Tree<B>) => (ma: Tree<A>) => Tree<A> = (
  f
) => (ma) => chain_(ma, (x) => map_(f(x), () => x))

export const chainTap_: <A, B>(ma: Tree<A>, f: (a: A) => Tree<B>) => Tree<A> = (
  ma,
  f
) => chain_(ma, (x) => map_(f(x), () => x))

export const duplicate: <A>(ma: Tree<A>) => Tree<Tree<A>> = (ma) =>
  extend_(ma, (x) => x)

export const flatten: <A>(mma: Tree<Tree<A>>) => Tree<A> = (mma) =>
  chain_(mma, (x) => x)

export const foldMap: <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: Tree<A>) => M = (
  M
) => (f) => (fa) => foldMap_(M)(fa, f)

export const map: <A, B>(f: (a: A) => B) => (fa: Tree<A>) => Tree<B> = (f) => (fa) =>
  map_(fa, f)

export const reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Tree<A>) => B = (
  b,
  f
) => (fa) => reduce_(fa, b, f)

export const reduceRight: <A, B>(b: B, f: (a: A, b: B) => B) => (fa: Tree<A>) => B = (
  b,
  f
) => (fa) => reduceRight_(fa, b, f)

export const tree: CMonad1<URI> &
  CFoldable1<URI> &
  CTraversable1<URI> &
  CComonad1<URI> &
  CApplicative1<URI> = {
  URI,
  map,
  of,
  ap,
  chain,
  reduce,
  foldMap,
  reduceRight,
  traverse,
  sequence,
  extract,
  extend
}

//
// Compatibility with fp-ts ecosystem
//

const traverse__ = <F>(
  F: Applicative<F>
): (<A, B>(ta: Tree<A>, f: (a: A) => HKT<F, B>) => HKT<F, Tree<B>>) => {
  const traverseF = A.array_.traverse(F)
  const r = <A, B>(ta: Tree<A>, f: (a: A) => HKT<F, B>): HKT<F, Tree<B>> =>
    F.ap(
      F.map(f(ta.value), (value: B) => (forest: Forest<B>) => ({
        value,
        forest
      })),
      traverseF(ta.forest, (t) => r(t, f))
    )
  return r
}

export const tree_: Monad1<URI> &
  Foldable1<URI> &
  Traversable1<URI> &
  Comonad1<URI> &
  Applicative1<URI> = {
  URI,
  map: map_,
  of,
  ap: ap_,
  chain: chain_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse: traverse__,
  sequence: <F>(F: Applicative<F>): (<A>(ta: Tree<HKT<F, A>>) => HKT<F, Tree<A>>) => {
    const traverseF = traverse__(F)
    return (ta) => traverseF(ta, identity)
  },
  extract,
  extend: extend_
}
