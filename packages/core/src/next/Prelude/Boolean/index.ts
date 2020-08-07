import * as C from "../Closure"
import * as Eq from "../Equal"
import * as I from "../Identity"
import { And, BooleanProd, BooleanSum, Or, Prod, Sum } from "../Newtype"

/**
 * @category closure
 */

export const ConjunctionClosure = C.make<And>((l, r) =>
  And.wrap(And.unwrap(l) && And.unwrap(r))
)

export const DisjunctionClosure = C.make<Or>((l, r) =>
  Or.wrap(Or.unwrap(l) || Or.unwrap(r))
)

export const ProdClosure = C.make<Prod<boolean>>((l, r) =>
  BooleanProd.wrap(BooleanProd.unwrap(l) && BooleanProd.unwrap(r))
)

export const SumClosure = C.make<Sum<boolean>>((l, r) =>
  BooleanSum.wrap(BooleanSum.unwrap(l) || BooleanSum.unwrap(r))
)

/**
 * @category identity
 */

export const ConjunctionIdentity = I.make(And.wrap(true), ConjunctionClosure.combine)

export const DisjunctionIdentity = I.make(Or.wrap(false), DisjunctionClosure.combine)

export const ProdIdentity = I.make(BooleanProd.wrap(false), ProdClosure.combine)

export const SumIdentity = I.make(BooleanSum.wrap(false), SumClosure.combine)

/**
 * @category equal
 */

export const Equal = Eq.strict<boolean>()
