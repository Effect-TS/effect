import { Generic, genericDef, newtype, typeDef, TypeOf } from "./newtype"

/**
 * A newtype representing addition.
 */
export const Sum = genericDef("@newtypes/Sum")

export interface Sum<A> extends Generic<A, typeof Sum> {}

/**
 * A newtype representing multiplication.
 */
export const Prod = genericDef("@newtypes/Prod")

export interface Prod<A> extends Generic<A, typeof Prod> {}

/**
 * A newtype representing logical disjunction.
 */
const Or_ = typeDef<boolean>()("@newtypes/Or")

export interface Or extends TypeOf<typeof Or_> {}

export const Or = newtype<Or>()(Or_)

/**
 * A newtype represeting logical conjunction.
 */
const And_ = typeDef<boolean>()("@newtypes/And")

export interface And extends TypeOf<typeof And_> {}

export const And = newtype<And>()(And_)

/**
 * A newtype representing parameterized logical disjunction.
 */
export const OrF = genericDef("@newtypes/OrF")

export interface OrF<A> extends Generic<A, typeof OrF> {}

/**
 * A newtype representing parameterized logical conjunction.
 */
export const AndF = genericDef("@newtypes/AndF")

export interface AndF<A> extends Generic<A, typeof AndF> {}

/**
 * A newtype representing taking the first of two elements.
 */
export const First = genericDef("@newtypes/First")

export interface First<A> extends Generic<A, typeof First> {}

/**
 * A newtype representing taking the last of two elements.
 */
export const Last = genericDef("@newtypes/Last")

export interface Last<A> extends Generic<A, typeof Last> {}

/**
 * A newtype representing taking the min of two elements.
 */
export const Min = genericDef("@newtypes/Min")

export interface Min<A> extends Generic<A, typeof Min> {}

/**
 * A newtype representing taking the max of two elements.
 */
export const Max = genericDef("@newtypes/Max")

export interface Max<A> extends Generic<A, typeof Max> {}

/**
 * A newtype representing another type in a failed state
 */
export const Failure = genericDef("@newtypes/Failure")

export interface Failure<A> extends Generic<A, typeof Failure> {}

/**
 * A newtype representing an input error in another type
 */
export const FailureIn = genericDef("@newtypes/FailureIn")

export interface FailureIn<A> extends Generic<A, typeof FailureIn> {}

/**
 * A newtype representing an output error in another type
 */
export const FailureOut = genericDef("@newtypes/FailureOut")

export interface FailureOut<A> extends Generic<A, typeof FailureOut> {}

/**
 * A newtype representing a Boolean Product
 */
export const BooleanProd = Prod<boolean>()

/**
 * A newtype representing a Boolean Sum
 */
export const BooleanSum = Sum<boolean>()

/**
 * A newtype representing a String Sum
 */
export const StringSum = Sum<string>()
