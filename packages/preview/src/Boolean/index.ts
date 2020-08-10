import * as C from "../_abstract/Closure"
import * as Eq from "../_abstract/Equal"
import * as I from "../_abstract/Identity"
import { And, BooleanProd, BooleanSum, Or, Prod, Sum } from "../_abstract/Newtype"

/**
 * @category closure
 */

export const ConjunctionClosure = C.makeClosure<And>((l, r) =>
  And.wrap(And.unwrap(l) && And.unwrap(r))
)

export const DisjunctionClosure = C.makeClosure<Or>((l, r) =>
  Or.wrap(Or.unwrap(l) || Or.unwrap(r))
)

export const ProdClosure = C.makeClosure<Prod<boolean>>((l, r) =>
  BooleanProd.wrap(BooleanProd.unwrap(l) && BooleanProd.unwrap(r))
)

export const SumClosure = C.makeClosure<Sum<boolean>>((l, r) =>
  BooleanSum.wrap(BooleanSum.unwrap(l) || BooleanSum.unwrap(r))
)

/**
 * @category identity
 */

export const ConjunctionIdentity = I.makeIdentity(
  And.wrap(true),
  ConjunctionClosure.combine
)

export const DisjunctionIdentity = I.makeIdentity(
  Or.wrap(false),
  DisjunctionClosure.combine
)

export const ProdIdentity = I.makeIdentity(BooleanProd.wrap(false), ProdClosure.combine)

export const SumIdentity = I.makeIdentity(BooleanSum.wrap(false), SumClosure.combine)

/**
 * @category equal
 */

export const Equal = Eq.strict<boolean>()

/**
 * @category combinators
 */

export function and(a: boolean, b: boolean) {
  return a && b
}

export function fold<A, B>(
  onFalse: () => A,
  onTrue: () => B
): (value: boolean) => A | B {
  return (value) => (value ? onTrue() : onFalse())
}

export function not(a: boolean) {
  return !a
}

export function or(a: boolean, b: boolean) {
  return a || b
}
