/* adapted from https://github.com/rzeigler/waveguide */

import * as AP from "../Apply"
import type { CApplicative1, CMonad1, Monad1 } from "../Base"
import { Do as DoG } from "../Do"
import { flip } from "../Function"
import type { FunctionN, Lazy, Predicate } from "../Function"
import { pipe } from "../Function"
import { none, Option, some } from "../Option"

export function ap_<A, B>(fns: List<FunctionN<[A], B>>, list: List<A>): List<B> {
  return chain_(list, (a) => map_(fns, (f) => f(a)))
}

export function ap<A>(list: List<A>): <B>(fns: List<FunctionN<[A], B>>) => List<B> {
  return (fns) => chain_(list, (a) => map_(fns, (f) => f(a)))
}

export function cata_<A, B>(
  list: List<A>,
  ifCons: FunctionN<[A, List<A>], B>,
  ifNil: Lazy<B>
): B {
  if (isCons(list)) {
    return ifCons(list.head, list.tail)
  }
  return ifNil()
}

export function cata<A, B>(
  ifCons: FunctionN<[A, List<A>], B>,
  ifNil: Lazy<B>
): FunctionN<[List<A>], B> {
  return (list) => cata_(list, ifCons, ifNil)
}

export function chain_<A, B>(list: List<A>, f: FunctionN<[A], List<B>>): List<B> {
  return pipe(list, lift(f), foldl(nil as List<B>, concat))
}

export function chain<A, B>(f: FunctionN<[A], List<B>>): (list: List<A>) => List<B> {
  return (list) => pipe(list, lift(f), foldl(nil as List<B>, concat))
}
export type List<A> = Cons<A> | Nil

export interface Cons<A> {
  readonly _tag: "cons"
  readonly head: A
  readonly tail: List<A>
}

export interface Nil {
  readonly _tag: "nil"
}

export function concat<A>(front: List<A>, back: List<A>): List<A> {
  return foldr_(front, back, cons)
}

export function cons<A>(h: A, t: List<A>): List<A> {
  return {
    _tag: "cons",
    head: h,
    tail: t
  }
}

export function filter_<A>(list: List<A>, f: Predicate<A>): List<A> {
  return foldr_(list, nil as List<A>, (a, t) => (f(a) ? cons(a, t) : t))
}

export function filter<A>(f: Predicate<A>): FunctionN<[List<A>], List<A>> {
  return (list) => filter_(list, f)
}

export function find_<A>(list: List<A>, f: Predicate<A>): Option<A> {
  let iter = list
  while (isCons(iter)) {
    if (f(iter.head)) {
      return some(iter.head)
    }
    iter = iter.tail
  }
  return none
}

export function find<A>(f: Predicate<A>): FunctionN<[List<A>], Option<A>> {
  return (list) => find_(list, f)
}

export function flatten<A>(list: List<List<A>>): List<A> {
  return foldl_(list, nil as List<A>, concat)
}

export function foldl_<A, B>(list: List<A>, b: B, f: FunctionN<[B, A], B>): B {
  let iter = list
  let seed = b
  while (isCons(iter)) {
    seed = f(seed, iter.head)
    iter = iter.tail
  }
  return seed
}

export function foldl<A, B>(b: B, f: FunctionN<[B, A], B>): FunctionN<[List<A>], B> {
  return (list) => foldl_(list, b, f)
}

export function foldr_<A, B>(list: List<A>, b: B, f: FunctionN<[A, B], B>): B {
  return pipe(list, reverse, foldl(b, flip(f)))
}

export function foldr<A, B>(b: B, f: FunctionN<[A, B], B>): FunctionN<[List<A>], B> {
  return (list) => foldr_(list, b, f)
}

export function fromArray<A>(as: readonly A[]): List<A> {
  return as.reduceRight((t, h) => cons(h, t), nil as List<A>)
}

export function head<A>(list: List<A>): Option<A> {
  return cata_(list, some, () => none)
}

export function isCons<A>(list: List<A>): list is Cons<A> {
  return list._tag === "cons"
}

export const isEmpty = <A>(_: List<A>) => _._tag === "nil"

export function isNil<A>(list: List<A>): list is Nil {
  return list._tag === "nil"
}

export function last<A>(list: List<A>): Option<A> {
  if (isNil(list)) {
    return none
  }
  let iter = list
  while (isCons(iter.tail)) {
    iter = iter.tail
  }
  return some(iter.head)
}

export function lift<A, B>(f: FunctionN<[A], B>): FunctionN<[List<A>], List<B>> {
  return (list) => map_(list, f)
}

export function map_<A, B>(list: List<A>, f: FunctionN<[A], B>): List<B> {
  return pipe(
    list,
    foldl(nil as List<B>, (t, a) => cons(f(a), t)),
    reverse
  )
}

export function map<A, B>(f: FunctionN<[A], B>): (list: List<A>) => List<B> {
  return (list) =>
    pipe(
      list,
      foldl(nil as List<B>, (t, a) => cons(f(a), t)),
      reverse
    )
}

export const nil: List<never> = { _tag: "nil" }

export const nonEmpty = <A>(_: List<A>) => _._tag === "cons"

export function of<A>(a: A): List<A> {
  return cons(a, nil)
}

export function reverse<A>(list: List<A>): List<A> {
  return foldl_(list, nil as List<A>, (t, h) => cons(h, t))
}

/**
 * Get the size of a list.
 *
 * This has pathologically bad performance.
 * @param list
 */
export function size(list: List<unknown>): number {
  let ct = 0
  let iter = list
  while (isCons(iter)) {
    ct++
    iter = iter.tail
  }
  return ct
}

export function snoc_<A>(append: A, list: List<A>): List<A> {
  return foldr_(list, of(append), cons)
}

export function snoc<A>(append: A): (list: List<A>) => List<A> {
  return (list) => foldr_(list, of(append), cons)
}

export function tail<A>(list: List<A>): Option<List<A>> {
  return cata_(
    list,
    (_, rest) => some(rest),
    () => none
  )
}

export function toArray<A>(as: List<A>): A[] {
  const out: A[] = []
  let iter = as
  while (isCons(iter)) {
    out.push(iter.head)
    iter = iter.tail
  }
  return out
}

export const URI = "@matechs/core/List"
export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind<A> {
    [URI]: List<A>
  }
}

export const list: CMonad1<URI> & CApplicative1<URI> = {
  URI,
  map,
  of,
  ap,
  chain
}

export const listAp: CApplicative1<URI> = {
  URI,
  map,
  of,
  ap
}

export const Do = () => DoG(list)

export const sequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(listAp))()

export const sequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(listAp))()

//
// Compatibility with fp-ts ecosystem
//

export const list_: Monad1<URI> = {
  URI,
  ap: ap_,
  chain: chain_,
  map: map_,
  of
}
