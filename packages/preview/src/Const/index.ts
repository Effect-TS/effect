/* adapted from https://github.com/gcanti/fp-ts */

/**
 * The `Const` type constructor, which wraps its first type argument and ignores its second.
 * That is, `Const<E, A>` is isomorphic to `E` for any `A`.
 *
 * `Const` has some useful instances. For example, the `Applicative` instance allows us to collect results using a `Monoid`
 * while ignoring return values.
 */
import { unsafeCoerce } from "../Function"
import { intersect } from "../Utils"
import { makeAnyE } from "../_abstract/Any"
import { makeApplicativeE } from "../_abstract/Applicative"
import * as Associative from "../_abstract/Associative"
import { makeAssociativeBothE } from "../_abstract/AssociativeBoth"
import * as Bounded from "../_abstract/Bounded"
import { makeContravariant } from "../_abstract/Contravariant"
import { makeCovariant } from "../_abstract/Covariant"
import * as Eq from "../_abstract/Equal"
import * as Identity from "../_abstract/Identity"
import { makeIdentityBothE } from "../_abstract/IdentityBoth"
import * as Ord from "../_abstract/Ord"
import * as Show from "../_abstract/Show"

export type Const<E, A> = E & {
  readonly _A: A
}

export const ConstURI = "Const"
export type ConstURI = typeof ConstURI

declare module "../_abstract/HKT" {
  interface URItoKind<K, NK extends string, SI, SO, X, I, S, Env, Err, Out> {
    readonly [ConstURI]: Const<Err, Out>
  }
}

export function bimap_<E, A, G, B>(
  fea: Const<E, A>,
  f: (e: E) => G,
  g: (a: A) => B
): Const<G, B> {
  return makeConst(f(fea))()
}

export function bimap<E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
): (fa: Const<E, A>) => Const<G, B> {
  return (fa) => bimap_(fa, f, g)
}

export const contramap_: <E, A, B>(
  fa: Const<E, A>,
  f: (b: B) => A
) => Const<E, B> = unsafeCoerce

export function contramap<A, B>(f: (b: B) => A): <E>(fa: Const<E, A>) => Const<E, B> {
  return (fa) => contramap_(fa, f)
}

/**
 * The `Any` instance for `Const[E, +_]`
 */
export function getAny<E>(e: E) {
  return makeAnyE(ConstURI)<E>()({
    any: makeConst(e)
  })
}

/**
 * The `AssociativeBoth` instance for `Const[E, +_]`
 */
export function getAssociativeBoth<E>(A: Associative.Associative<E>) {
  return makeAssociativeBothE(ConstURI)<E>()({
    both: (fb) => (fa) => makeConst(A.combine(fb)(fa))()
  })
}

/**
 * The `Contravariant` instance for `Const[E, +_]`
 */
export const Contravariant = makeContravariant(ConstURI)({
  contramap
})

/**
 * The `Covariant` instance for `Const[E, +_]`
 */
export const Covariant = makeCovariant(ConstURI)({
  map
})

/**
 * The `IdentityBoth` instance for `Const[E, +_]`
 */
export function getIdentityBoth<E>(I: Identity.Identity<E>) {
  return makeIdentityBothE(ConstURI)<E>()(
    intersect(getAny(I.identity), getAssociativeBoth(I))
  )
}

/**
 * The `Applicative` instance for `Const[E, +_]`
 */
export function getApplicative<E>(I: Identity.Identity<E>) {
  return makeApplicativeE(ConstURI)<E>()(intersect(Covariant, getIdentityBoth(I)))
}

/**
 * The `Show` instance for `Const[E, +_]`
 */
export function getShow<E>(S: Show.Show<E>) {
  return <A>() => Show.makeShow<Const<E, A>>((c) => `make(${S.show(c)})`)
}

/**
 * The `Bounded` instance for `Const[E, +_]`
 */
export function getBounded<E>(
  B: Bounded.Bounded<E>
): <A>() => Bounded.Bounded<Const<E, A>> {
  return () => B as any
}

/**
 * The `Equal` instance for `Const[E, +_]`
 */
export function getEqual<E>(E: Eq.Equal<E>): <A>() => Eq.Equal<Const<E, A>> {
  return () => E as any
}

/**
 * The `Identity` instance for `Const[E, +_]`
 */
export function getIdentity<E>(
  I: Identity.Identity<E>
): <A>() => Identity.Identity<Const<E, A>> {
  return () => I as any
}

/**
 * The `Ord` instance for `Const[E, +_]`
 */
export function getOrd<E>(O: Ord.Ord<E>): <A>() => Ord.Ord<Const<E, A>> {
  return () => O as any
}

/**
 * The `Associative` instance for `Const[E, +_]`
 */
export function getAssociative<E>(
  A: Associative.Associative<E>
): <A>() => Associative.Associative<Const<E, A>> {
  return () => A as any
}

/**
 * Construct `Const[E, A]`
 */
export const makeConst: <E>(e: E) => <A = never>() => Const<E, A> = (e) => () =>
  unsafeCoerce(e)

/**
 * Maps `Const[E, A]` to `Const[E, B]` via `f : A => B`
 */
export const map_: <E, A, B>(
  fa: Const<E, A>,
  f: (a: A) => B
) => Const<E, B> = unsafeCoerce

/**
 * Maps `Const[E, A]` to `Const[E, B]` via `f : A => B`
 */
export function map<A, B>(f: (a: A) => B): <E>(fa: Const<E, A>) => Const<E, B> {
  return (fa) => map_(fa, f)
}

/**
 * Maps `Const[E, A]` to `Const[E1, A]` via `f : E => E1`
 */
export const mapLeft_: <E, A, G>(fea: Const<E, A>, f: (e: E) => G) => Const<G, A> = (
  fea,
  f
) => makeConst(f(fea))()

/**
 * Maps `Const[E, A]` to `Const[E1, A]` via `f : E => E1`
 */
export function mapLeft<E, G>(f: (e: E) => G): <A>(fa: Const<E, A>) => Const<G, A> {
  return (fa) => mapLeft_(fa, f)
}
