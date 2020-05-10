import { Do as DoG } from "fp-ts-contrib/lib/Do"
import { Alt2 } from "fp-ts/lib/Alt"
import { Applicative, Applicative2M } from "fp-ts/lib/Applicative"
import { Apply2M, sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply"
import { Bifunctor2 } from "fp-ts/lib/Bifunctor"
import { Chain2M } from "fp-ts/lib/Chain"
import { ChainRec2M, tailRec } from "fp-ts/lib/ChainRec"
import { Compactable2, Separated } from "fp-ts/lib/Compactable"
import { Contravariant2 } from "fp-ts/lib/Contravariant"
import {
  Either,
  elem,
  exists,
  fromNullable,
  getApplyMonoid,
  getApplySemigroup,
  getEq,
  getSemigroup,
  getShow,
  getValidation,
  getValidationMonoid,
  getValidationSemigroup,
  getWitherable,
  isLeft,
  isRight,
  left as ELeft,
  Left,
  parseJSON,
  right as ERight,
  Right,
  stringifyJSON,
  swap,
  toError,
  tryCatch,
  URI
} from "fp-ts/lib/Either"
import { Extend2 } from "fp-ts/lib/Extend"
import { Filterable2 } from "fp-ts/lib/Filterable"
import { FilterableWithIndex2 } from "fp-ts/lib/FilterableWithIndex"
import { Foldable2 } from "fp-ts/lib/Foldable"
import { FoldableWithIndex2 } from "fp-ts/lib/FoldableWithIndex"
import { Functor2 } from "fp-ts/lib/Functor"
import { FunctorWithIndex2 } from "fp-ts/lib/FunctorWithIndex"
import { HKT, Kind2 } from "fp-ts/lib/HKT"
import { Monad2M } from "fp-ts/lib/Monad"
import { MonadThrow2M } from "fp-ts/lib/MonadThrow"
import { Profunctor2 } from "fp-ts/lib/Profunctor"
import { Semigroupoid2 } from "fp-ts/lib/Semigroupoid"
import { Traversable2 } from "fp-ts/lib/Traversable"
import { pipe, pipeable } from "fp-ts/lib/pipeable"

import { array } from "../Array"
import {
  chain as chainEffect,
  chainError as chainErrorEffect,
  map as mapEffect,
  pure as pureEffect,
  raiseError as raiseErrorEffect
} from "../Effect"
import { flow } from "../Function"
import { Option, option } from "../Option"
import { record } from "../Record"
import { Effect, Managed, Stream, StreamEither } from "../Support/Common"
import { Tree, tree } from "../Tree"

export {
  URI,
  Left,
  Right,
  Either,
  fromNullable,
  toError,
  tryCatch,
  isLeft,
  isRight,
  getShow,
  getEq,
  getSemigroup,
  getApplySemigroup,
  getApplyMonoid,
  swap,
  elem,
  exists,
  parseJSON,
  stringifyJSON,
  getWitherable,
  getValidation,
  getValidationMonoid,
  getValidationSemigroup
}

export function right<A>(a: A): Either<never, A> {
  return {
    _tag: "Right",
    right: a
  }
}

export function rightW<E = never, A = unknown>(a: A): Either<E, A> {
  return {
    _tag: "Right",
    right: a
  }
}

export function left<E>(e: E): Either<E, never> {
  return {
    _tag: "Left",
    left: e
  }
}

export function leftW<E, A = unknown>(e: E): Either<E, A> {
  return {
    _tag: "Left",
    left: e
  }
}

export function widenLeft<E2>(): <E, A>(_: Either<E, A>) => Either<E | E2, A> {
  return (_) => _
}

export function widenRight<A2>(): <E, A>(_: Either<E, A>) => Either<E, A | A2> {
  return (_) => _
}

export function fold<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  onLeft: (e: E) => StreamEither<S1, R1, E1, B>,
  onRight: (a: A) => StreamEither<S2, R2, E2, C>
): (ma: Either<E, A>) => StreamEither<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  onLeft: (e: E) => Stream<S1, R1, E1, B>,
  onRight: (a: A) => Stream<S2, R2, E2, C>
): (ma: Either<E, A>) => Stream<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  onLeft: (e: E) => Managed<S1, R1, E1, B>,
  onRight: (a: A) => Managed<S2, R2, E2, C>
): (ma: Either<E, A>) => Managed<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  onLeft: (e: E) => Effect<S1 | S2, R1, E1, B>,
  onRight: (a: A) => Effect<S1 | S2, R2, E2, C>
): (ma: Either<E, A>) => Effect<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<E, A, B, C>(
  onLeft: (e: E) => B,
  onRight: (a: A) => C
): (ma: Either<E, A>) => B | C
export function fold<E, A, B>(
  onLeft: (e: E) => B,
  onRight: (a: A) => B
): (ma: Either<E, A>) => B {
  return (ma) => (isLeft(ma) ? onLeft(ma.left) : onRight(ma.right))
}

export function orElse<E, A, M>(
  onLeft: (e: E) => Either<M, A>
): <B>(ma: Either<E, B>) => Either<M, A | B> {
  return (ma) => (isLeft(ma) ? onLeft(ma.left) : ma)
}

export function getOrElse<E, A>(onLeft: (e: E) => A): <B>(ma: Either<E, B>) => A | B {
  return (ma) => (isLeft(ma) ? onLeft(ma.left) : ma.right)
}

declare module "fp-ts/lib/HKT" {
  interface URItoKind2<E, A> {
    readonly EitherMerge: Either<E, A>
  }
}

/**
 * @since 2.0.0
 */
export const URIM = "EitherMerge"

/**
 * @since 2.0.0
 */
export type URIM = typeof URIM

declare module "fp-ts/lib/ChainRec" {
  export interface ChainRec2M<F extends URIM> extends Chain2M<F> {
    readonly chainRec: <E, A, B>(
      a: A,
      f: (a: A) => Kind2<F, E, Either<A, B>>
    ) => Kind2<F, E, B>
  }
}
declare module "fp-ts/lib/Chain" {
  export interface Chain2M<F extends URIM> extends Apply2M<F> {
    readonly chain: <E, A, B, E2>(
      fa: Kind2<F, E, A>,
      f: (a: A) => Kind2<F, E2, B>
    ) => Kind2<F, E | E2, B>
  }
}
declare module "fp-ts/lib/MonadThrow" {
  export interface MonadThrow2M<M extends URIM> extends Monad2M<M> {
    readonly throwError: <E, A>(e: E) => Kind2<M, E, A>
  }
}

declare type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

declare module "fp-ts/lib/Apply" {
  export interface Apply2M<F extends URIM> extends Functor2<F> {
    readonly ap: <E, A, B, E2>(
      fab: Kind2<F, E, (a: A) => B>,
      fa: Kind2<F, E2, A>
    ) => Kind2<F, E | E2, B>
  }
  export function sequenceT<F extends URIM>(
    F: Apply2M<F>
  ): <Z extends Array<Kind2<F, any, any>>>(
    ...t: Z & {
      readonly 0: Kind2<F, any, any>
    }
  ) => Kind2<
    F,
    {
      [K in keyof Z]: Z[K] extends Kind2<F, infer _E, infer _A> ? _E : never
    }[number],
    {
      [K in keyof Z]: Z[K] extends Kind2<F, infer _E, infer _A> ? _A : never
    }[number]
  >
  export function sequenceS<F extends URIM>(
    F: Apply2M<F>
  ): <NER extends Record<string, Kind2<F, any, any>>>(
    r: EnforceNonEmptyRecord<NER> & Record<string, Kind2<F, any, any>>
  ) => Kind2<
    F,
    {
      [K in keyof NER]: [NER[K]] extends [Kind2<F, infer _E, infer _A>] ? _E : never
    }[keyof NER],
    {
      [K in keyof NER]: [NER[K]] extends [Kind2<F, infer _E, infer _A>] ? _A : never
    }
  >
}
declare module "fp-ts/lib/Applicative" {
  export interface Applicative2M<F extends URIM> extends Apply2M<F> {
    readonly of: <E, A>(a: A) => Kind2<F, E, A>
  }
}
declare module "fp-ts/lib/Monad" {
  export interface Monad2M<M extends URIM> extends Applicative2M<M>, Chain2M<M> {
    _K: "Monad2M"
  }
}
declare module "fp-ts/lib/pipeable" {
  export interface PipeableApply2M<F extends URIM> extends PipeableFunctor2<F> {
    readonly ap: <E, A>(
      fa: Kind2<F, E, A>
    ) => <E2, B>(fab: Kind2<F, E2, (a: A) => B>) => Kind2<F, E | E2, B>
    readonly apFirst: <E, B>(
      fb: Kind2<F, E, B>
    ) => <E2, A>(fa: Kind2<F, E2, A>) => Kind2<F, E | E2, A>
    readonly apSecond: <E, B>(
      fb: Kind2<F, E, B>
    ) => <E2, A>(fa: Kind2<F, E2, A>) => Kind2<F, E | E2, B>
  }

  export interface PipeableChain2M<F extends URIM> extends PipeableApply2M<F> {
    readonly chain: <E, A, B>(
      f: (a: A) => Kind2<F, E, B>
    ) => <E2>(ma: Kind2<F, E2, A>) => Kind2<F, E | E2, B>
    readonly chainFirst: <E, A, B>(
      f: (a: A) => Kind2<F, E, B>
    ) => <E2>(ma: Kind2<F, E2, A>) => Kind2<F, E | E2, A>
    readonly flatten: <E, E2, A>(
      mma: Kind2<F, E, Kind2<F, E2, A>>
    ) => Kind2<F, E | E2, A>
  }

  export function pipeable<F extends URIM, I>(
    I: {
      readonly URI: F
    } & I
  ): (I extends Chain2M<F>
    ? PipeableChain2M<F>
    : I extends Apply2M<F>
    ? PipeableApply2M<F>
    : I extends Functor2<F>
    ? PipeableFunctor2<F>
    : {}) &
    (I extends Contravariant2<F> ? PipeableContravariant2<F> : {}) &
    (I extends FunctorWithIndex2<F, infer Ix> ? PipeableFunctorWithIndex2<F, Ix> : {}) &
    (I extends Bifunctor2<F> ? PipeableBifunctor2<F> : {}) &
    (I extends Extend2<F> ? PipeableExtend2<F> : {}) &
    (I extends FoldableWithIndex2<F, infer Ix>
      ? PipeableFoldableWithIndex2<F, Ix>
      : I extends Foldable2<F>
      ? PipeableFoldable2<F>
      : {}) &
    (I extends Alt2<F> ? PipeableAlt2<F> : {}) &
    (I extends FilterableWithIndex2<F, infer Ix>
      ? PipeableFilterableWithIndex2<F, Ix>
      : I extends Filterable2<F>
      ? PipeableFilterable2<F>
      : I extends Compactable2<F>
      ? PipeableCompactable2<F>
      : {}) &
    (I extends Profunctor2<F> ? PipeableProfunctor2<F> : {}) &
    (I extends Semigroupoid2<F> ? PipeableSemigroupoid2<F> : {}) &
    (I extends MonadThrow2M<F> ? PipeableMonadThrow2<F> : {})
}

declare module "fp-ts-contrib/lib/Do" {
  export function Do<M extends URIM>(M: Monad2M<M>): Do2MC<M, {}, never>

  export interface Do2MC<M extends URIM, S extends object, E> {
    do: <E2>(ma: Kind2<M, E2, any>) => Do2MC<M, S, E | E2>
    doL: <E2>(f: (s: S) => Kind2<M, E2, any>) => Do2MC<M, S, E | E2>
    bind: <N extends string, A, E2>(
      name: Exclude<N, keyof S>,
      ma: Kind2<M, E2, A>
    ) => Do2MC<
      M,
      S &
        {
          [K in N]: A
        },
      E | E2
    >
    bindL: <N extends string, A, E2>(
      name: Exclude<N, keyof S>,
      f: (s: S) => Kind2<M, E2, A>
    ) => Do2MC<
      M,
      S &
        {
          [K in N]: A
        },
      E | E2
    >
    let: <N extends string, A>(
      name: Exclude<N, keyof S>,
      a: A
    ) => Do2MC<
      M,
      S &
        {
          [K in N]: A
        },
      E
    >
    letL: <N extends string, A>(
      name: Exclude<N, keyof S>,
      f: (s: S) => A
    ) => Do2MC<
      M,
      S &
        {
          [K in N]: A
        },
      E
    >
    sequenceS: <I extends Record<string, Kind2<M, any, any>>>(
      r: EnforceNonEmptyRecord<I> &
        {
          [K in keyof S]?: never
        }
    ) => Do2MC<
      M,
      S &
        {
          [K in keyof I]: [I[K]] extends [Kind2<M, any, infer A>] ? A : never
        },
      | E
      | {
          [K in keyof I]: [I[K]] extends [Kind2<M, infer E2, any>] ? E2 : never
        }[keyof I]
    >
    sequenceSL: <I extends Record<string, Kind2<M, any, any>>>(
      f: (
        s: S
      ) => EnforceNonEmptyRecord<I> &
        {
          [K in keyof S]?: never
        }
    ) => Do2MC<
      M,
      S &
        {
          [K in keyof I]: [I[K]] extends [Kind2<M, any, infer A>] ? A : never
        },
      | E
      | {
          [K in keyof I]: [I[K]] extends [Kind2<M, infer E2, any>] ? E2 : never
        }[keyof I]
    >
    return: <A>(f: (s: S) => A) => Kind2<M, E, A>
    done: () => Kind2<M, E, S>
  }
}

export const either: Monad2M<URIM> &
  Foldable2<URIM> &
  Traversable2<URIM> &
  Bifunctor2<URIM> &
  Alt2<URIM> &
  Extend2<URIM> &
  ChainRec2M<URIM> &
  MonadThrow2M<URIM> = {
  URI: URIM,
  _K: "Monad2M",
  map: (ma, f) => (isLeft(ma) ? ma : right(f(ma.right))),
  of: right,
  ap: (mab, ma) => (isLeft(mab) ? mab : isLeft(ma) ? ma : right(mab.right(ma.right))),
  chain: (ma, f) => (isLeft(ma) ? ma : f(ma.right)),
  reduce: (fa, b, f) => (isLeft(fa) ? b : f(b, fa.right)),
  foldMap: (M) => (fa, f) => (isLeft(fa) ? M.empty : f(fa.right)),
  reduceRight: (fa, b, f) => (isLeft(fa) ? b : f(fa.right, b)),
  traverse: <F>(F: Applicative<F>) => <E, A, B>(
    ma: Either<E, A>,
    f: (a: A) => HKT<F, B>
  ): HKT<F, Either<E, B>> =>
    isLeft(ma) ? F.of(left(ma.left)) : F.map<B, Either<E, B>>(f(ma.right), right),
  sequence: <F>(F: Applicative<F>) => <E, A>(
    ma: Either<E, HKT<F, A>>
  ): HKT<F, Either<E, A>> =>
    isLeft(ma) ? F.of(left(ma.left)) : F.map<A, Either<E, A>>(ma.right, right),
  bimap: (fea, f, g) => (isLeft(fea) ? left(f(fea.left)) : right(g(fea.right))),
  mapLeft: (fea, f) => (isLeft(fea) ? left(f(fea.left)) : fea),
  alt: (fx, fy) => (isLeft(fx) ? fy() : fx),
  extend: (wa, f) => (isLeft(wa) ? wa : right(f(wa))),
  chainRec: (a, f) =>
    tailRec(f(a), (e) =>
      isLeft(e)
        ? ERight(ELeft(e.left))
        : isLeft(e.right)
        ? left(f(e.right.left))
        : right(right(e.right.right))
    ),
  throwError: left
}

export const Do = () => DoG(either)
export const sequenceT = ST(either)
export const sequenceS = SS(either)

export const {
  alt,
  ap,
  apFirst,
  apSecond,
  bimap,
  chain,
  chainFirst,
  duplicate,
  extend,
  filterOrElse,
  flatten,
  foldMap,
  fromOption,
  fromPredicate,
  map,
  mapLeft,
  reduce,
  reduceRight
} = pipeable(either)

export const sequenceOption = option.sequence(either)

export const traverseOption: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Option<A>) => Either<E, Option<B>> = (f) => (ta) =>
  option.traverse(either)(ta, f)

export const wiltOption: <A, E, B, C>(
  f: (a: A) => Either<E, Either<B, C>>
) => (wa: Option<A>) => Either<E, Separated<Option<B>, Option<C>>> = (f) => (wa) =>
  option.wilt(either)(wa, f)

export const witherOption: <A, E, B>(
  f: (a: A) => Either<E, Option<B>>
) => (ta: Option<A>) => Either<E, Option<B>> = (f) => (ta) =>
  option.wither(either)(ta, f)

export const sequenceEither = either.sequence(either)

export const traverseEither: <A, FE, B>(
  f: (a: A) => Either<FE, B>
) => <TE>(ta: Either<TE, A>) => Either<FE, Either<TE, B>> = (f) => (ta) =>
  either.traverse(either)(ta, f)

export const sequenceTree = tree.sequence(either)

export const traverseTree: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Tree<A>) => Either<E, Tree<B>> = (f) => (ta) => tree.traverse(either)(ta, f)

export const sequenceArray = array.sequence(either)

export const traverseArray: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Array<A>) => Either<E, Array<B>> = (f) => (ta) =>
  array.traverse(either)(ta, f)

export const traverseArrayWithIndex: <A, E, B>(
  f: (i: number, a: A) => Either<E, B>
) => (ta: Array<A>) => Either<E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(either)(ta, f)

export const wiltArray: <A, E, B, C>(
  f: (a: A) => Either<E, Either<B, C>>
) => (wa: Array<A>) => Either<E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(either)(wa, f)

export const witherArray: <A, E, B>(
  f: (a: A) => Either<E, Option<B>>
) => (ta: Array<A>) => Either<E, Array<B>> = (f) => (ta) => array.wither(either)(ta, f)

export const sequenceRecord = record.sequence(either)

export const traverseRecord: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Record<string, A>) => Either<E, Record<string, B>> = (f) => (ta) =>
  record.traverse(either)(ta, f)

export const traverseRecordWithIndex: <A, E, B>(
  f: (k: string, a: A) => Either<E, B>
) => (ta: Record<string, A>) => Either<E, Record<string, B>> = (f) => (ta) =>
  record.traverseWithIndex(either)(ta, f)

export const wiltRecord: <A, E, B, C>(
  f: (a: A) => Either<E, Either<B, C>>
) => (
  wa: Record<string, A>
) => Either<E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  record.wilt(either)(wa, f)

export const witherRecord: <A, E, B>(
  f: (a: A) => Either<E, Option<B>>
) => (ta: Record<string, A>) => Either<E, Record<string, B>> = (f) => (ta) =>
  record.wither(either)(ta, f)

export const nonFailable = <S, R, E, A>(
  _: Effect<S, R, E, A>
): Effect<S, R, never, Either<E, A>> =>
  pipe(_, mapEffect(right), chainErrorEffect(flow(left, pureEffect)))

export const failable = <S, R, E, A>(
  _: Effect<S, R, never, Either<E, A>>
): Effect<S, R, E, A> => pipe(_, chainEffect(fold(raiseErrorEffect, pureEffect)))
