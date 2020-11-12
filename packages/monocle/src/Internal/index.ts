import type { Array } from "@effect-ts/core/Classic/Array"
import * as A from "@effect-ts/core/Classic/Array"
import * as E from "@effect-ts/core/Classic/Either"
import * as O from "@effect-ts/core/Classic/Option"
import * as R from "@effect-ts/core/Classic/Record"
import type { Predicate } from "@effect-ts/core/Function"
import { constant, flow, identity, pipe } from "@effect-ts/core/Function"
import type * as P from "@effect-ts/core/Prelude"
import * as DSL from "@effect-ts/core/Prelude/DSL"

import type { At } from "../At"
import type { Iso } from "../Iso"
import type { Index } from "../Ix"
import type { Lens } from "../Lens"
import type { Optional } from "../Optional"
import type { Prism } from "../Prism"
import type { Traversal } from "../Traversal"

// -------------------------------------------------------------------------------------
// Iso
// -------------------------------------------------------------------------------------

export const isoAsLens = <S, A>(sa: Iso<S, A>): Lens<S, A> => ({
  get: sa.get,
  set: flow(sa.reverseGet, constant)
})

export const isoAsOptional = <S, A>(sa: Iso<S, A>): Optional<S, A> => ({
  getOption: flow(sa.get, O.some),
  set: flow(sa.reverseGet, constant)
})

// -------------------------------------------------------------------------------------
// Lens
// -------------------------------------------------------------------------------------

export const lensAsOptional = <S, A>(sa: Lens<S, A>): Optional<S, A> => ({
  getOption: flow(sa.get, O.some),
  set: sa.set
})

export const lensAsTraversal = <S, A>(sa: Lens<S, A>): Traversal<S, A> => ({
  modifyF: (F) => (f) => (s) =>
    pipe(
      f(sa.get(s)),
      F.map((a) => sa.set(a)(s))
    )
})

export const lensComposeLens = <A, B>(ab: Lens<A, B>) => <S>(
  sa: Lens<S, A>
): Lens<S, B> => ({
  get: (s) => ab.get(sa.get(s)),
  set: (b) => (s) => sa.set(ab.set(b)(sa.get(s)))(s)
})

export const lensComposePrism = <A, B>(ab: Prism<A, B>) => <S>(
  sa: Lens<S, A>
): Optional<S, B> => optionalComposeOptional(prismAsOptional(ab))(lensAsOptional(sa))

export const lensId = <S>(): Lens<S, S> => ({
  get: identity,
  set: constant
})

export const lensProp = <A, P extends keyof A>(prop: P) => <S>(
  lens: Lens<S, A>
): Lens<S, A[P]> => ({
  get: (s) => lens.get(s)[prop],
  set: (ap) => (s) => {
    const oa = lens.get(s)
    if (ap === oa[prop]) {
      return s
    }
    return lens.set(Object.assign({}, oa, { [prop]: ap }))(s)
  }
})

export const lensProps = <A, P extends keyof A>(...props: [P, P, ...Array<P>]) => <S>(
  lens: Lens<S, A>
): Lens<S, { [K in P]: A[K] }> => ({
  get: (s) => {
    const a = lens.get(s)
    const r: { [K in P]?: A[K] } = {}
    for (const k of props) {
      r[k] = a[k]
    }
    return r as any
  },
  set: (a) => (s) => {
    const oa = lens.get(s)
    for (const k of props) {
      if (a[k] !== oa[k]) {
        return lens.set(Object.assign({}, oa, a))(s)
      }
    }
    return s
  }
})

export const lensComponent = <A extends ReadonlyArray<unknown>, P extends keyof A>(
  prop: P
) => <S>(lens: Lens<S, A>): Lens<S, A[P]> => ({
  get: (s) => lens.get(s)[prop],
  set: (ap) => (s) => {
    const oa = lens.get(s)
    if (ap === oa[prop]) {
      return s
    }
    const copy: A = oa.slice() as any
    copy[prop] = ap
    return lens.set(copy)(s)
  }
})

// -------------------------------------------------------------------------------------
// Prism
// -------------------------------------------------------------------------------------

export const prismAsOptional = <S, A>(sa: Prism<S, A>): Optional<S, A> => ({
  getOption: sa.getOption,
  set: (a) => prismSet(a)(sa)
})

export const prismAsTraversal = <S, A>(sa: Prism<S, A>): Traversal<S, A> => ({
  modifyF: (F) => {
    const succeed = DSL.succeedF(F)
    return (f) => (s) =>
      O.fold_(
        sa.getOption(s),
        () => succeed(s),
        (a) => F.map<A, S>((a) => prismSet(a)(sa)(s))(f(a))
      )
  }
})

export const prismModifyOption = <A>(f: (a: A) => A) => <S>(sa: Prism<S, A>) => (
  s: S
): O.Option<S> =>
  O.map_(sa.getOption(s), (o) => {
    const n = f(o)
    return n === o ? s : sa.reverseGet(n)
  })

export const prismModify = <A>(f: (a: A) => A) => <S>(
  sa: Prism<S, A>
): ((s: S) => S) => {
  const g = prismModifyOption(f)(sa)
  return (s) => O.getOrElse_(g(s), () => s)
}

export const prismSet = <A>(a: A): (<S>(sa: Prism<S, A>) => (s: S) => S) =>
  prismModify(() => a)

export const prismComposeLens = <A, B>(ab: Lens<A, B>) => <S>(
  sa: Prism<S, A>
): Optional<S, B> => optionalComposeOptional(lensAsOptional(ab))(prismAsOptional(sa))

export const prismFromNullable = <A>(): Prism<A, NonNullable<A>> => ({
  getOption: O.fromNullable,
  reverseGet: identity
})

export function prismFromPredicate<A>(predicate: Predicate<A>): Prism<A, A> {
  return {
    getOption: O.fromPredicate(predicate),
    reverseGet: identity
  }
}

export const prismSome = <A>(): Prism<O.Option<A>, A> => ({
  getOption: identity,
  reverseGet: O.some
})

export const prismRight = <E, A>(): Prism<E.Either<E, A>, A> => ({
  getOption: O.fromEither,
  reverseGet: E.right
})

export const prismLeft = <E, A>(): Prism<E.Either<E, A>, E> => ({
  getOption: (s) => (E.isLeft(s) ? O.some(s.left) : O.none), // TODO: replace with E.getLeft in v3
  reverseGet: E.left
})

// -------------------------------------------------------------------------------------
// Optional
// -------------------------------------------------------------------------------------

export const optionalAsTraversal = <S, A>(sa: Optional<S, A>): Traversal<S, A> => ({
  modifyF: (F) => (f) => {
    const succeed = DSL.succeedF(F)
    return (s) =>
      O.fold_(
        sa.getOption(s),
        () => succeed(s),
        (a) => F.map<A, S>((a: A) => sa.set(a)(s))(f(a))
      )
  }
})

export const optionalModifyOption = <A>(f: (a: A) => A) => <S>(
  optional: Optional<S, A>
) => (s: S): O.Option<S> =>
  O.map_(optional.getOption(s), (a) => {
    const n = f(a)
    return n === a ? s : optional.set(n)(s)
  })

export const optionalModify = <A>(f: (a: A) => A) => <S>(
  optional: Optional<S, A>
): ((s: S) => S) => {
  const g = optionalModifyOption(f)(optional)
  return (s) => O.getOrElse_(g(s), () => s)
}

export const optionalComposeOptional = <A, B>(ab: Optional<A, B>) => <S>(
  sa: Optional<S, A>
): Optional<S, B> => ({
  getOption: flow(sa.getOption, O.chain(ab.getOption)),
  set: (b) => optionalModify(ab.set(b))(sa)
})

const findFirstMutable = <A>(predicate: Predicate<A>): Optional<Array<A>, A> => ({
  getOption: A.findFirst(predicate),
  set: (a) => (s) =>
    O.fold_(
      A.findIndex(predicate)(s),
      () => s,
      (i) => A.unsafeUpdateAt(i, a)(s)
    )
})

export const findFirst: <A>(
  predicate: Predicate<A>
) => Optional<ReadonlyArray<A>, A> = findFirstMutable as any

// -------------------------------------------------------------------------------------
// Traversal
// -------------------------------------------------------------------------------------

export function traversalComposeTraversal<A, B>(
  ab: Traversal<A, B>
): <S>(sa: Traversal<S, A>) => Traversal<S, B> {
  return (sa) => ({
    modifyF: (F) => (f) => sa.modifyF(F)(ab.modifyF(F)(f))
  })
}

export function fromTraversable<T extends P.URIS, C = P.Auto>(
  T: P.Traversable<T, C>
): <
  A,
  N extends string = P.Initial<C, "N">,
  K = P.Initial<C, "K">,
  Q = P.Initial<C, "Q">,
  W = P.Initial<C, "W">,
  X = P.Initial<C, "X">,
  I = P.Initial<C, "I">,
  S = P.Initial<C, "S">,
  R = P.Initial<C, "R">,
  E = P.Initial<C, "E">
>() => Traversal<P.Kind<T, C, N, K, Q, W, X, I, S, R, E, A>, A>
export function fromTraversable<T>(
  T: P.Traversable<P.UHKT<T>>
): <A>() => Traversal<P.HKT<T, A>, A> {
  return <A>(): Traversal<P.HKT<T, A>, A> => ({
    modifyF: T.foreachF
  })
}

// -------------------------------------------------------------------------------------
// Ix
// -------------------------------------------------------------------------------------

function indexMutableArray<A = never>(): Index<Array<A>, number, A> {
  return {
    index: (i) => ({
      getOption: A.lookup(i),
      set: (a) => (as) => O.getOrElse_(A.updateAt(i, a)(as), () => as)
    })
  }
}

export const indexArray: <A = never>() => Index<
  ReadonlyArray<A>,
  number,
  A
> = indexMutableArray as any

export function indexRecord<A = never>(): Index<
  Readonly<Record<string, A>>,
  string,
  A
> {
  return {
    index: (k) => ({
      getOption: R.lookup(k),
      set: (a) => (r) => {
        if (r[k] === a || O.isNone(R.lookup(k)(r))) {
          return r
        }
        return R.insertAt(k, a)(r)
      }
    })
  }
}

// -------------------------------------------------------------------------------------
// At
// -------------------------------------------------------------------------------------

export function atRecord<A = never>(): At<
  Readonly<Record<string, A>>,
  string,
  O.Option<A>
> {
  return {
    at: (key) => ({
      get: R.lookup(key),
      set: O.fold(
        () => R.deleteAt(key),
        (a) => R.insertAt(key, a)
      )
    })
  }
}
