/* adapted from https://github.com/gcanti/fp-ts */

import type {
  CApplicative2C,
  CApply2C,
  CBifunctor2,
  CChain2C,
  CChainRec2C,
  CComonad2,
  CFoldable2,
  CMonad2C,
  CSemigroupoid2,
  CSequence2,
  CTraversable2,
  CTraverse2,
  Traverse2
} from "../Base"
import type { Either } from "../Either"
import type { Monoid } from "../Monoid"
import * as RT from "../Readonly/Tuple"
import type { Semigroup } from "../Semigroup"

export const URI = "@matechs/core/Tuple"

export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind2<E, A> {
    readonly [URI]: [A, E]
  }
}

export const fst: {
  <A, S>(sa: [A, S]): A
} = RT.fst

export const snd: {
  <A, S>(sa: [A, S]): S
} = RT.snd

export const swap: {
  <A, S>(sa: [A, S]): [S, A]
} = RT.swap as any

export const make: {
  <A, S>(a: A, s: S): [A, S]
} = RT.make as any

export const ap: {
  <S>(S: Semigroup<S>): <A>(fa: [A, S]) => <B>(fab: [(a: A) => B, S]) => [B, S]
} = RT.ap as any

export const ap_: {
  <S>(S: Semigroup<S>): <A, B>(fab: [(a: A) => B, S], fa: [A, S]) => [B, S]
} = RT.ap_ as any

export function getApply<S>(S: Semigroup<S>): CApply2C<URI, S> {
  return {
    URI,
    _E: undefined as any,
    map,
    ap: ap(S)
  }
}

export const of: <S>(M: Monoid<S>) => <A>(a: A) => [A, S] = RT.of as any

export function getApplicative<S>(M: Monoid<S>): CApplicative2C<URI, S> {
  return {
    ...getApply(M),
    of: of(M)
  }
}

export const chain: {
  <S>(S: Semigroup<S>): <A, B>(f: (a: A) => [B, S]) => (fa: [A, S]) => [B, S]
} = RT.chain as any

export const chain_: {
  <S>(S: Semigroup<S>): <A, B>(fa: [A, S], f: (a: A) => [B, S]) => [B, S]
} = RT.chain_ as any

export function getChain<S>(S: Semigroup<S>): CChain2C<URI, S> & CApply2C<URI, S> {
  return {
    ...getApply(S),
    chain: chain(S)
  }
}

export function getMonad<S>(M: Monoid<S>): CMonad2C<URI, S> & CApplicative2C<URI, S> {
  return {
    ...getChain(M),
    of: of(M)
  }
}

export function getChainRec<S>(
  M: Monoid<S>
): CChainRec2C<URI, S> & CApplicative2C<URI, S> {
  return {
    ...getMonad(M),
    chainRec: chainRec(M)
  }
}

export const chainRec: {
  <S>(M: Monoid<S>): <A, B>(a: A, f: (a: A) => [Either<A, B>, S]) => [B, S]
} = RT.chainRec as any

export const compose: <E, A>(
  la: [A, E]
) => <B>(ab: [B, A]) => [B, E] = RT.compose as any

export const compose_: <B, E, A>(ab: [B, A], la: [A, E]) => [B, E] = RT.compose_ as any

export const traverse: CTraverse2<URI> = RT.traverse as any

export const traverse_: Traverse2<URI> = RT.traverse_ as any

export const sequence: CSequence2<URI> = RT.sequence as any

export const bimap: <E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
) => (fa: [A, E]) => [B, G] = RT.bimap as any

export const bimap_: <E, G, A, B>(
  fa: [A, E],
  f: (e: E) => G,
  g: (a: A) => B
) => [B, G] = RT.bimap_ as any

export const extend: <E, A, B>(
  f: (fa: [A, E]) => B
) => (ma: [A, E]) => [B, E] = RT.extend as any

export const extend_: <E, A, B>(
  ma: [A, E],
  f: (fa: [A, E]) => B
) => [B, E] = RT.extend_ as any

export const duplicate: <E, A>(ma: [A, E]) => [[A, E], E] = RT.duplicate as any

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => <E>(fa: [A, E]) => M = RT.foldMap as any

export const foldMap_: <M>(
  M: Monoid<M>
) => <A, E>(fa: [A, E], f: (a: A) => M) => M = RT.foldMap_ as any

export const map: <A, B>(f: (a: A) => B) => <E>(fa: [A, E]) => [B, E] = RT.map as any

export const map_: <A, E, B>(fa: [A, E], f: (a: A) => B) => [B, E] = RT.map_ as any

export const mapLeft: <E, G>(
  f: (e: E) => G
) => <A>(fa: [A, E]) => [A, G] = RT.mapLeft as any

export const mapLeft_: <A, E, G>(
  fa: [A, E],
  f: (e: E) => G
) => [A, G] = RT.mapLeft_ as any

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => <E>(fa: [A, E]) => B = RT.reduce as any

export const reduce_: <A, E, B>(
  fa: [A, E],
  b: B,
  f: (b: B, a: A) => B
) => B = RT.reduce_ as any

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => <E>(fa: [A, E]) => B = RT.reduceRight as any

export const reduceRight_: <A, E, B>(
  fa: [A, E],
  b: B,
  f: (a: A, b: B) => B
) => B = RT.reduceRight_ as any

export const tuple: CSemigroupoid2<URI> &
  CBifunctor2<URI> &
  CComonad2<URI> &
  CFoldable2<URI> &
  CTraversable2<URI> = {
  URI,
  compose,
  map,
  bimap,
  mapLeft,
  extract: fst,
  extend,
  reduce,
  foldMap,
  reduceRight,
  traverse,
  sequence
}
