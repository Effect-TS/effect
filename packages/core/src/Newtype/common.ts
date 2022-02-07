// ets_tracing: off

import type { Generic, TypeOf } from "./newtype.js"
import { genericDef, newtype, typeDef } from "./newtype.js"

/**
 * A newtype representing addition.
 */
export const Sum = genericDef("@newtype/Sum")

export interface Sum<A> extends Generic<A, typeof Sum> {}

/**
 * A newtype representing multiplication.
 */
export const Prod = genericDef("@newtype/Prod")

export interface Prod<A> extends Generic<A, typeof Prod> {}

/**
 * A newtype representing logical disjunction.
 */
const Or_ = typeDef<boolean>()("@newtype/Or")

export interface Or extends TypeOf<typeof Or_> {}

export const Or = newtype<Or>()(Or_)

/**
 * A newtype represeting logical conjunction.
 */
const And_ = typeDef<boolean>()("@newtype/And")

export interface And extends TypeOf<typeof And_> {}

export const And = newtype<And>()(And_)

/**
 * A newtype representing parameterized logical disjunction.
 */
export const OrF = genericDef("@newtype/OrF")

export interface OrF<A> extends Generic<A, typeof OrF> {}

/**
 * A newtype representing parameterized logical conjunction.
 */
export const AndF = genericDef("@newtype/AndF")

export interface AndF<A> extends Generic<A, typeof AndF> {}

/**
 * A newtype representing taking the first of two elements.
 */
export const First = genericDef("@newtype/First")

export interface First<A> extends Generic<A, typeof First> {}

/**
 * A newtype representing taking the last of two elements.
 */
export const Last = genericDef("@newtype/Last")

export interface Last<A> extends Generic<A, typeof Last> {}

/**
 * A newtype representing taking the min of two elements.
 */
export const Min = genericDef("@newtype/Min")

export interface Min<A> extends Generic<A, typeof Min> {}

/**
 * A newtype representing taking the max of two elements.
 */
export const Max = genericDef("@newtype/Max")

export interface Max<A> extends Generic<A, typeof Max> {}

/**
 * A newtype representing another type in a failed state
 */
export const Failure = genericDef("@newtype/Failure")

export interface Failure<A> extends Generic<A, typeof Failure> {}

/**
 * A newtype representing an input error in another type
 */
export const FailureIn = genericDef("@newtype/FailureIn")

export interface FailureIn<A> extends Generic<A, typeof FailureIn> {}

/**
 * A newtype representing an output error in another type
 */
export const FailureOut = genericDef("@newtype/FailureOut")

export interface FailureOut<A> extends Generic<A, typeof FailureOut> {}

/**
 * A newtype representing a Boolean Product
 */
export const BooleanProd = Prod.of<boolean>()

/**
 * A newtype representing a Boolean Sum
 */
export const BooleanSum = Sum.of<boolean>()

/**
 * A newtype representing a String Sum
 */
export const StringSum = Sum.of<string>()
