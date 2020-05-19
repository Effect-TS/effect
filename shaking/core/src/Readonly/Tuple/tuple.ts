import type { Apply2C } from "../../Apply"
import type {
  Applicative2C,
  Chain2C,
  Monad2C,
  ChainRec2C,
  Traverse2,
  Applicative,
  HKT,
  Sequence2,
  Semigroupoid2,
  Bifunctor2,
  Comonad2,
  Foldable2,
  Traversable2
} from "../../Base"
import type { Either } from "../../Either"
import type { Monoid } from "../../Monoid"
import type { Semigroup } from "../../Semigroup"

export const URI = "@matechs/core/Readonly/Tuple"

export type URI = typeof URI

declare module "../../Base/HKT" {
  interface URItoKind2<E, A> {
    readonly [URI]: readonly [A, E]
  }
}

export function fst<A, S>(sa: readonly [A, S]): A {
  return sa[0]
}

export function snd<A, S>(sa: readonly [A, S]): S {
  return sa[1]
}

export function swap<A, S>(sa: readonly [A, S]): readonly [S, A] {
  return [snd(sa), fst(sa)]
}

export function getApply<S>(S: Semigroup<S>): Apply2C<URI, S> {
  return {
    URI,
    _E: undefined as any,
    map: readonlyTuple.map,
    ap: (fab, fa) => [fst(fab)(fst(fa)), S.concat(snd(fab), snd(fa))]
  }
}

export const of = <S>(M: Monoid<S>) => <A>(a: A): readonly [A, S] => {
  return [a, M.empty]
}

export function getApplicative<S>(M: Monoid<S>): Applicative2C<URI, S> {
  return {
    ...getApply(M),
    of: of(M)
  }
}

export function getChain<S>(S: Semigroup<S>): Chain2C<URI, S> {
  return {
    ...getApply(S),
    chain: (fa, f) => {
      const [b, s] = f(fst(fa))
      return [b, S.concat(snd(fa), s)]
    }
  }
}

export function getMonad<S>(M: Monoid<S>): Monad2C<URI, S> {
  return {
    ...getChain(M),
    of: of(M)
  }
}

export function getChainRec<S>(M: Monoid<S>): ChainRec2C<URI, S> {
  const chainRec = <A, B>(
    a: A,
    f: (a: A) => readonly [Either<A, B>, S]
  ): readonly [B, S] => {
    let result: readonly [Either<A, B>, S] = f(a)
    let acc: S = M.empty
    let s: Either<A, B> = fst(result)
    while (s._tag === "Left") {
      acc = M.concat(acc, snd(result))
      result = f(s.left)
      s = fst(result)
    }
    return [s.right, M.concat(acc, snd(result))]
  }

  return {
    ...getChain(M),
    chainRec
  }
}

export const compose_: <E, A, B>(
  ab: readonly [B, A],
  la: readonly [A, E]
) => readonly [B, E] = (ba, ae) => [fst(ba), snd(ae)]

export const map_: <E, A, B>(fa: readonly [A, E], f: (a: A) => B) => readonly [B, E] = (
  ae,
  f
) => [f(fst(ae)), snd(ae)]

export const bimap_: <E, A, G, B>(
  fea: readonly [A, E],
  f: (e: E) => G,
  g: (a: A) => B
) => readonly [B, G] = (fea, f, g) => [g(fst(fea)), f(snd(fea))]

export const mapLeft_: <E, A, G>(
  fea: readonly [A, E],
  f: (e: E) => G
) => readonly [A, G] = (fea, f) => [fst(fea), f(snd(fea))]

export const extend_: <E, A, B>(
  wa: readonly [A, E],
  f: (wa: readonly [A, E]) => B
) => readonly [B, E] = (ae, f) => [f(ae), snd(ae)]

export const reduce_: <E, A, B>(
  fa: readonly [A, E],
  b: B,
  f: (b: B, a: A) => B
) => B = (ae, b, f) => f(b, fst(ae))

export const foldMap_: <M>(
  M: Monoid<M>
) => <E, A>(fa: readonly [A, E], f: (a: A) => M) => M = (_) => (ae, f) => f(fst(ae))

export const reduceRight_: <E, A, B>(
  fa: readonly [A, E],
  b: B,
  f: (a: A, b: B) => B
) => B = (ae, b, f) => f(fst(ae), b)

export const traverse: Traverse2<URI> = <F>(F: Applicative<F>) => <A, S, B>(
  as: readonly [A, S],
  f: (a: A) => HKT<F, B>
): HKT<F, readonly [B, S]> => {
  return F.map(f(fst(as)), (b) => [b, snd(as)])
}

export const sequence: Sequence2<URI> = <F>(F: Applicative<F>) => <A, S>(
  fas: readonly [HKT<F, A>, S]
): HKT<F, readonly [A, S]> => {
  return F.map(fst(fas), (a) => [a, snd(fas)])
}

export const readonlyTuple: Semigroupoid2<URI> &
  Bifunctor2<URI> &
  Comonad2<URI> &
  Foldable2<URI> &
  Traversable2<URI> = {
  URI,
  compose: compose_,
  map: map_,
  bimap: bimap_,
  mapLeft: mapLeft_,
  extract: fst,
  extend: extend_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse,
  sequence
}

export const bimap: <E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
) => (fa: readonly [A, E]) => readonly [B, G] = (f, g) => (fa) => bimap_(fa, f, g)

export const compose: <E, A>(
  la: readonly [A, E]
) => <B>(ab: readonly [B, A]) => readonly [B, E] = (la) => (ab) => compose_(ab, la)

export const duplicate: <E, A>(ma: readonly [A, E]) => readonly [readonly [A, E], E] = (
  ma
) => extend_(ma, (x) => x)

export const extend: <E, A, B>(
  f: (fa: readonly [A, E]) => B
) => (ma: readonly [A, E]) => readonly [B, E] = (f) => (fa) => extend_(fa, f)

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => <E>(fa: readonly [A, E]) => M = (M) => (f) => (fa) =>
  foldMap_(M)(fa, f)

export const map: <A, B>(
  f: (a: A) => B
) => <E>(fa: readonly [A, E]) => readonly [B, E] = (f) => (fa) => map_(fa, f)

export const mapLeft: <E, G>(
  f: (e: E) => G
) => <A>(fa: readonly [A, E]) => readonly [A, G] = (f) => (fa) => mapLeft_(fa, f)

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => <E>(fa: readonly [A, E]) => B = (b, f) => (fa) => reduce_(fa, b, f)

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => <E>(fa: readonly [A, E]) => B = (b, f) => (fa) => reduceRight_(fa, b, f)
