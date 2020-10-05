import type { Endomorphism } from "../../Function"
import { identity } from "../../Function"
import type { IdentityURI } from "../../Modules"
import type { Derive } from "../../Prelude/Derive"
import type { URIS } from "../../Prelude/HKT"
import type { Associative } from "../Associative"
import * as A from "../Associative"
import type { Bounded } from "../Bounded"
import type { Identity } from "./definition"

/**
 * Creates a new `Identity`
 */
export function makeIdentity<A>(identity: A, op: (y: A) => (x: A) => A): Identity<A> {
  return {
    Associative: "Associative",
    combine: op,
    identity
  }
}

/**
 * Derive `Identity` from `Associative` and `identity`
 */
export function fromAssociative<A>(A: Associative<A>) {
  return (identity: A) => makeIdentity(identity, A.combine)
}

/**
 * Derive `Identity`
 */
export function deriveIdentity<F extends URIS, A>(
  D: Derive<F, [IdentityURI]>,
  I: Identity<A>
) {
  return D.derive(I)
}

/**
 * Fold `Identity` through an array
 */
export function fold<A>(M: Identity<A>): (as: ReadonlyArray<A>) => A {
  const foldM = A.fold(M)
  return (as) => foldM(M.identity, as)
}

/**
 * The dual of a `Monoid`, obtained by swapping the arguments of `concat`.
 */
export function dual<A>(M: Identity<A>): Identity<A> {
  return makeIdentity(M.identity, A.dual(M).combine)
}

/**
 * `Identity` for endomorphisms
 */
export function endomorphism<A = never>(): Identity<Endomorphism<A>> {
  return makeIdentity(identity, (y) => (x) => (a) => x(y(a)))
}

/**
 * `Identity` for function combination
 */
export function func<M>(M: Identity<M>): <A = never>() => Identity<(a: A) => M> {
  return <A>() => makeIdentity((_: A) => M.identity, A.func(M)<A>().combine)
}

/**
 * `Identity` that returns last `Max` of elements
 */
export function join<A>(B: Bounded<A>): Identity<A> {
  return makeIdentity(B.bottom, A.join(B).combine)
}

/**
 * `Identity` that returns last `Min` of elements
 */
export function meet<A>(B: Bounded<A>): Identity<A> {
  return makeIdentity(B.top, A.meet(B).combine)
}

/**
 * Given a struct of `Identity` returns a `Identity` for the struct
 */
export function struct<O extends Record<string, any>>(
  identities: {
    [K in keyof O]: Identity<O[K]>
  }
): Identity<O> {
  const empty: any = {}
  for (const key of Object.keys(identities)) {
    empty[key] = identities[key].identity
  }
  return makeIdentity(empty, A.struct(identities).combine)
}

/**
 * Given a tuple of `Identity` returns a `Identity` for the tuple
 */
export function tuple<T extends ReadonlyArray<Identity<any>>>(
  ...identities: T
): Identity<
  {
    [K in keyof T]: T[K] extends Associative<infer A> ? A : never
  }
> {
  return makeIdentity(
    identities.map((m) => m.identity) as any,
    A.tuple(...identities).combine as any
  )
}

/**
 * Boolean `Identity` under conjunction
 */
export const all: Identity<boolean> = makeIdentity(true, A.all.combine)

/**
 * Boolean `Identity` under disjunction
 */
export const any: Identity<boolean> = fromAssociative(A.any)(true)

/**
 * Number `Identity` under multiplication
 */
export const product: Identity<number> = fromAssociative(A.product)(1)

/**
 * String `Identity` under concatenation
 */
export const string: Identity<string> = fromAssociative(A.string)("")

/**
 * Number `Identity` under addition
 */
export const sum: Identity<number> = fromAssociative(A.sum)(0)

/**
 * Void `Identity`
 */
const void_: Identity<void> = fromAssociative(A.void)(undefined)

export { void_ as void }
