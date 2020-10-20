import * as O from "@effect-ts/system/Option"

import type { Predicate } from "../../Function"
import { pipe } from "../../Function"
import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"
import type { Separated } from "../../Utils"
import type { Associative } from "../Associative"
import { makeAssociative } from "../Associative"
import type { Either } from "../Either"
import { left, right } from "../Either"
import type { Equal } from "../Equal"
import type { Identity } from "../Identity"
import { fold, fromAssociative, makeIdentity } from "../Identity"
import type { Ord } from "../Ord"
import { makeOrd } from "../Ord"
import { Ordering } from "../Ordering"
import type { Show } from "../Show"

export function getEqual<A>(E: Equal<A>): Equal<O.Option<A>> {
  return {
    equals: (y) => (x) =>
      x === y ||
      (O.isNone(x) ? O.isNone(y) : O.isNone(y) ? false : E.equals(y.value)(x.value))
  }
}

export function getShow<A>(S: Show<A>): Show<O.Option<A>> {
  return {
    show: (ma) => (O.isNone(ma) ? "none" : `some(${S.show(ma.value)})`)
  }
}

export const AssociativeEither = P.instance<P.AssociativeEither<[OptionURI]>>({
  or: <B>(fb: O.Option<B>) => <A>(fa: O.Option<A>): O.Option<Either<A, B>> =>
    fa._tag === "Some"
      ? O.some(left(fa.value))
      : fb._tag === "Some"
      ? O.some(right(fb.value))
      : O.none
})

export const Covariant = P.instance<P.Covariant<[OptionURI]>>({
  map: O.map
})

export const Any = P.instance<P.Any<[OptionURI]>>({
  any: () => O.some({})
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[OptionURI]>>({
  flatten: O.flatten
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<[OptionURI]>>({
  ...Any,
  ...AssociativeFlatten
})

export const Monad = P.instance<P.Monad<[OptionURI]>>({
  ...Covariant,
  ...IdentityFlatten
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[OptionURI]>>({
  both: O.zip
})

export const IdentityBoth = P.instance<P.IdentityBoth<[OptionURI]>>({
  ...Any,
  ...AssociativeBoth
})

export const Applicative = P.instance<P.Applicative<[OptionURI]>>({
  ...Covariant,
  ...IdentityBoth
})

export const Extend = P.instance<P.Extend<[OptionURI]>>({
  extend: O.extend
})

export const Foldable = P.instance<P.Foldable<[OptionURI]>>({
  reduce: (b, f) => (fa) => (O.isNone(fa) ? b : f(b, fa.value)),
  reduceRight: (b, f) => (fa) => (O.isNone(fa) ? b : f(fa.value, b)),
  foldMap: (M) => (f) => (fa) => (O.isNone(fa) ? M.identity : f(fa.value))
})

export const foreachF = P.implementForeachF<[OptionURI]>()(() => (G) => (f) => (fa) =>
  O.isNone(fa) ? P.succeedF(G)(O.none) : pipe(f(fa.value), G.map(O.some))
)

export const Traversable = P.instance<P.Traversable<[OptionURI]>>({
  ...Covariant,
  foreachF
})

export const Fail = P.instance<P.FX.Fail<[OptionURI]>>({
  fail: () => O.none
})

/**
 * Returns `true` if `ma` contains `a`
 */
export function elem<A>(E: Equal<A>): (a: A) => (ma: O.Option<A>) => boolean {
  const el = elem_(E)
  return (a) => (ma) => el(ma, a)
}

/**
 * Returns `true` if `ma` contains `a`
 */
export function elem_<A>(E: Equal<A>): (ma: O.Option<A>, a: A) => boolean {
  return (ma, a) => (O.isNone(ma) ? false : E.equals(ma.value)(a))
}

/**
 * `Apply` Identity
 *
 * | x       | y       | combine(y)(x)      |
 * | ------- | ------- | ------------------ |
 * | none    | none    | none               |
 * | some(a) | none    | none               |
 * | none    | some(a) | none               |
 * | some(a) | some(b) | some(concat(a, b)) |
 */
export function getApplyIdentity<A>(M: Identity<A>): Identity<O.Option<A>> {
  return fromAssociative(getApplyAssociative(M))(O.none)
}

/**
 * `Apply` Associative
 *
 * | x       | y       | combine(y)(x)      |
 * | ------- | ------- | ------------------ |
 * | none    | none    | none               |
 * | some(a) | none    | none               |
 * | none    | some(a) | none               |
 * | some(a) | some(b) | some(concat(a, b)) |
 */
export function getApplyAssociative<A>(S: Associative<A>): Associative<O.Option<A>> {
  return makeAssociative((y) => (x) =>
    O.isSome(x) && O.isSome(y) ? O.some(S.combine(y.value)(x.value)) : O.none
  )
}

/**
 * `Identity` returning the left-most non-`None` value
 *
 * | x       | y       | combine(y)(x) |
 * | ------- | ------- | ------------- |
 * | none    | none    | none          |
 * | some(a) | none    | some(a)       |
 * | none    | some(a) | some(a)       |
 * | some(a) | some(b) | some(a)       |
 */
export function getLastIdentity<A>(): Identity<O.Option<A>> {
  return fromAssociative(getLastAssociative<A>())(O.none)
}

/**
 * `Associative` returning the left-most non-`None` value
 *
 * | x       | y       | combine(y)(x) |
 * | ------- | ------- | ------------- |
 * | none    | none    | none          |
 * | some(a) | none    | some(a)       |
 * | none    | some(a) | some(a)       |
 * | some(a) | some(b) | some(a)       |
 */
export function getLastAssociative<A>(): Associative<O.Option<A>> {
  return makeAssociative((y) => (x) => (O.isNone(x) ? x : y))
}

/**
 * `Associative` returning the left-most non-`None` value
 *
 * | x       | y       | combine(y)(x) |
 * | ------- | ------- | ------------- |
 * | none    | none    | none          |
 * | some(a) | none    | some(a)       |
 * | none    | some(a) | some(a)       |
 * | some(a) | some(b) | some(a)       |
 */
export function getFirstAssociative<A>(): Associative<O.Option<A>> {
  return makeAssociative((y) => (x) => (O.isNone(x) ? y : x))
}

/**
 * `Identity` returning the left-most non-`None` value
 *
 * | x       | y       | combine(y)(x) |
 * | ------- | ------- | ------------- |
 * | none    | none    | none          |
 * | some(a) | none    | some(a)       |
 * | none    | some(a) | some(a)       |
 * | some(a) | some(b) | some(a)       |
 */
export function getFirstIdentity<A>(): Identity<O.Option<A>> {
  return fromAssociative(getFirstAssociative<A>())(O.none)
}

export type AOfOptions<Ts extends O.Option<any>[]> = {
  [k in keyof Ts]: Ts[k] extends O.Option<infer A> ? A : never
}[number]

export const getFirst = <Ts extends O.Option<any>[]>(
  ...items: Ts
): O.Option<AOfOptions<Ts>> => fold(getFirstIdentity<AOfOptions<Ts>>())(items)

export const getLast = <Ts extends O.Option<any>[]>(
  ...items: Ts
): O.Option<AOfOptions<Ts>> => fold(getLastIdentity<AOfOptions<Ts>>())(items)

/**
 * The `Ord` instance allows `Option` values to be compared with
 * `compare`, whenever there is an `Ord` instance for
 * the type the `Option` contains.
 *
 * `None` is considered to be less than any `Some` value.
 */
export function getOrd<A>(_: Ord<A>): Ord<O.Option<A>> {
  return makeOrd(getEqual(_).equals, (y) => (x) =>
    x === y
      ? Ordering.wrap("eq")
      : O.isSome(x)
      ? O.isSome(y)
        ? _.compare(y.value)(x.value)
        : Ordering.wrap("gt")
      : Ordering.wrap("lt")
  )
}

export const filter: P.Filterable<[OptionURI]>["filter"] = <A>(
  predicate: Predicate<A>
) => (fa: O.Option<A>): O.Option<A> =>
  O.isNone(fa) ? O.none : predicate(fa.value) ? fa : O.none

export const filterMap: <A, B>(
  f: (a: A) => O.Option<B>
) => (fa: O.Option<A>) => O.Option<B> = (f) => (ma) =>
  O.isNone(ma) ? O.none : f(ma.value)

const defaultSeparate = { left: O.none, right: O.none }

export function separate<A, B>(
  ma: O.Option<Either<A, B>>
): Separated<O.Option<A>, O.Option<B>> {
  const o = O.map_(ma, (e) => ({
    left: O.getLeft(e),
    right: O.getRight(e)
  }))
  return O.isNone(o) ? defaultSeparate : o.value
}

export const partition: P.Filterable<[OptionURI]>["partition"] = <A>(
  predicate: Predicate<A>
) => (fa: O.Option<A>) => ({
  left: filter((a: A) => !predicate(a))(fa),
  right: filter(predicate)(fa)
})

export const partitionMap: <A, B, B1>(
  f: (a: A) => Either<B, B1>
) => (fa: O.Option<A>) => Separated<O.Option<B>, O.Option<B1>> = (f) => (fa) =>
  separate(O.map_(fa, f))

export const Filterable = P.instance<P.Filterable<[OptionURI]>>({
  filter,
  filterMap,
  partition,
  partitionMap
})

export const sequence = P.sequenceF(Traversable)

export const separateF = P.implementSeparateF<[OptionURI]>()(
  (_) => (F) => (f) => (fa) => {
    const o = O.map_(fa, (a) =>
      pipe(
        f(a),
        F.map((e) => ({
          left: O.getLeft(e),
          right: O.getRight(e)
        }))
      )
    )
    return O.isNone(o)
      ? P.succeedF(F)({
          left: O.none,
          right: O.none
        })
      : o.value
  }
)

export const compactF = P.implementCompactF<[OptionURI]>()(
  (_) => (F) => (f) => (fa) => {
    return O.isNone(fa) ? P.succeedF(F)(O.none) : f(fa.value)
  }
)

export const Wiltable = P.instance<P.Wiltable<[OptionURI]>>({
  separateF
})

export const Witherable = P.instance<P.Witherable<[OptionURI]>>({
  compactF
})

export const Compactable = P.instance<P.Compactable<[OptionURI]>>({
  compact: O.flatten,
  separate
})

export function getIdentity<A>(A: Associative<A>) {
  return makeIdentity<O.Option<A>>(O.none, (y) => (x) =>
    O.isNone(x) ? y : O.isNone(y) ? x : O.some(A.combine(y.value)(x.value))
  )
}

export const alt = P.altF({ ...Covariant, ...AssociativeEither })

export const gen = P.genF(Monad)

export const bind = P.bindF(Monad)

const do_ = P.doF(Monad)

export { do_ as do }

export const struct = P.structF({ ...Monad, ...Applicative })

export const tuple = P.tupleF({ ...Monad, ...Applicative })
