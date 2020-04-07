// Copyright 2019 Ryan Zeigler
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* istanbul ignore file */

import { function as F, monad as M, option as O, pipeable as P } from "fp-ts";

export type List<A> = Cons<A> | Nil;

export interface Cons<A> {
  readonly _tag: "cons";
  readonly head: A;
  readonly tail: List<A>;
}

export interface Nil {
  readonly _tag: "nil";
}

export function isCons<A>(list: List<A>): list is Cons<A> {
  return list._tag === "cons";
}

export function isNil<A>(list: List<A>): list is Nil {
  return list._tag === "nil";
}

export const nil: List<never> = { _tag: "nil" };

export function cons<A>(h: A, t: List<A>): List<A> {
  return {
    _tag: "cons",
    head: h,
    tail: t
  };
}

export function of<A>(a: A): List<A> {
  return cons(a, nil);
}

export function foldl<A, B>(list: List<A>, b: B, f: F.FunctionN<[B, A], B>): B {
  let iter = list;
  let seed = b;
  while (isCons(iter)) {
    seed = f(seed, iter.head);
    iter = iter.tail;
  }
  return seed;
}

export function foldlc<A, B>(b: B, f: F.FunctionN<[B, A], B>): F.FunctionN<[List<A>], B> {
  return (list) => foldl(list, b, f);
}

export function reverse<A>(list: List<A>): List<A> {
  return foldl(list, nil as List<A>, (t, h) => cons(h, t));
}

export function foldr<A, B>(list: List<A>, b: B, f: F.FunctionN<[A, B], B>): B {
  return P.pipe(list, reverse, foldlc(b, F.flip(f)));
}

export function snoc<A>(append: A, list: List<A>): List<A> {
  return foldr(list, of(append), cons);
}

export function cata<A, B>(
  list: List<A>,
  ifCons: F.FunctionN<[A, List<A>], B>,
  ifNil: F.Lazy<B>
): B {
  if (isCons(list)) {
    return ifCons(list.head, list.tail);
  }
  return ifNil();
}

export function catac<A, B>(
  ifCons: F.FunctionN<[A, List<A>], B>,
  ifNil: F.Lazy<B>
): F.FunctionN<[List<A>], B> {
  return (list) => cata(list, ifCons, ifNil);
}

export function head<A>(list: List<A>): O.Option<A> {
  return cata(list, O.some, () => O.none);
}

export function tail<A>(list: List<A>): O.Option<List<A>> {
  return cata(
    list,
    (_, rest) => O.some(rest),
    () => O.none
  );
}

export function last<A>(list: List<A>): O.Option<A> {
  if (isNil(list)) {
    return O.none;
  }
  let iter = list;
  while (isCons(iter.tail)) {
    iter = iter.tail;
  }
  return O.some(iter.head);
}

export const isEmpty = isNil;

export const nonEmpty = F.not(isNil);

export function find<A>(list: List<A>, f: F.Predicate<A>): O.Option<A> {
  let iter = list;
  while (isCons(iter)) {
    if (f(iter.head)) {
      return O.some(iter.head);
    }
    iter = iter.tail;
  }
  return O.none;
}

export function findc<A>(f: F.Predicate<A>): F.FunctionN<[List<A>], O.Option<A>> {
  return (list) => find(list, f);
}

export function foldrc<A, B>(b: B, f: F.FunctionN<[A, B], B>): F.FunctionN<[List<A>], B> {
  return (list) => foldr(list, b, f);
}

export function map<A, B>(list: List<A>, f: F.FunctionN<[A], B>): List<B> {
  return P.pipe(
    list,
    foldlc(nil as List<B>, (t, a) => cons(f(a), t)),
    reverse
  );
}

export function lift<A, B>(f: F.FunctionN<[A], B>): F.FunctionN<[List<A>], List<B>> {
  return (list) => map(list, f);
}

export function filter<A>(list: List<A>, f: F.Predicate<A>): List<A> {
  return foldr(list, nil as List<A>, (a, t) => (f(a) ? cons(a, t) : t));
}

export function filterc<A>(f: F.Predicate<A>): F.FunctionN<[List<A>], List<A>> {
  return (list) => filter(list, f);
}

export function concat<A>(front: List<A>, back: List<A>): List<A> {
  return foldr(front, back, cons);
}

/**
 * Get the size of a list.
 *
 * This has pathologically bad performance.
 * @param list
 */
export function size(list: List<unknown>): number {
  let ct = 0;
  let iter = list;
  while (isCons(iter)) {
    ct++;
    iter = iter.tail;
  }
  return ct;
}

export function chain<A, B>(list: List<A>, f: F.FunctionN<[A], List<B>>): List<B> {
  return P.pipe(list, lift(f), foldlc(nil as List<B>, concat));
}

export function ap<A, B>(list: List<A>, fns: List<F.FunctionN<[A], B>>): List<B> {
  return chain(list, (a) => map(fns, (f) => f(a)));
}

export function flatten<A>(list: List<List<A>>): List<A> {
  return foldl(list, nil as List<A>, concat);
}

export function fromArray<A>(as: readonly A[]): List<A> {
  return as.reduceRight((t, h) => cons(h, t), nil as List<A>);
}

export function toArray<A>(as: List<A>): A[] {
  const out: A[] = [];
  let iter = as;
  while (isCons(iter)) {
    out.push(iter.head);
    iter = iter.tail;
  }
  return out;
}

export const URI = "matechs/WaveList";
export type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    [URI]: List<A>;
  }
}

export const instances: M.Monad1<URI> = {
  URI,
  map,
  of,
  ap: F.flip(ap),
  chain
};
