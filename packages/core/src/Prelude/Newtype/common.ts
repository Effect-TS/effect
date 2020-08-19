/**
 * @since 1.0.0
 */
import { Generic, genericDef, newtype, typeDef, TypeOf } from "./newtype"

/**
 * A newtype representing addition.
 *
 * @since 1.0.0
 */
export const Sum = genericDef("@newtype/Sum")

/**
 * @since 1.0.0
 */
export interface Sum<A> extends Generic<A, typeof Sum> {}

/**
 * A newtype representing multiplication.
 *
 * @since 1.0.0
 */
export const Prod = genericDef("@newtype/Prod")

/**
 * @since 1.0.0
 */
export interface Prod<A> extends Generic<A, typeof Prod> {}

/**
 * A newtype representing logical disjunction.
 */
const Or_ = typeDef<boolean>()("@newtype/Or")

/**
 * @since 1.0.0
 */
export interface Or extends TypeOf<typeof Or_> {}

/**
 * @since 1.0.0
 */
export const Or = newtype<Or>()(Or_)

/**
 * A newtype represeting logical conjunction.
 */
const And_ = typeDef<boolean>()("@newtype/And")

/**
 * @since 1.0.0
 */
export interface And extends TypeOf<typeof And_> {}

/**
 * @since 1.0.0
 */
export const And = newtype<And>()(And_)

/**
 * A newtype representing parameterized logical disjunction.
 *
 * @since 1.0.0
 */
export const OrF = genericDef("@newtype/OrF")

/**
 * @since 1.0.0
 */
export interface OrF<A> extends Generic<A, typeof OrF> {}

/**
 * A newtype representing parameterized logical conjunction.
 *
 * @since 1.0.0
 */
export const AndF = genericDef("@newtype/AndF")

/**
 * @since 1.0.0
 */
export interface AndF<A> extends Generic<A, typeof AndF> {}

/**
 * A newtype representing taking the first of two elements.
 *
 * @since 1.0.0
 */
export const First = genericDef("@newtype/First")

/**
 * @since 1.0.0
 */
export interface First<A> extends Generic<A, typeof First> {}

/**
 * A newtype representing taking the last of two elements.
 *
 * @since 1.0.0
 */
export const Last = genericDef("@newtype/Last")

/**
 * @since 1.0.0
 */
export interface Last<A> extends Generic<A, typeof Last> {}

/**
 * A newtype representing taking the min of two elements.
 *
 * @since 1.0.0
 */
export const Min = genericDef("@newtype/Min")

/**
 * @since 1.0.0
 */
export interface Min<A> extends Generic<A, typeof Min> {}

/**
 * A newtype representing taking the max of two elements.
 *
 * @since 1.0.0
 */
export const Max = genericDef("@newtype/Max")

/**
 * @since 1.0.0
 */
export interface Max<A> extends Generic<A, typeof Max> {}

/**
 * A newtype representing another type in a failed state
 *
 * @since 1.0.0
 */
export const Failure = genericDef("@newtype/Failure")

/**
 * @since 1.0.0
 */
export interface Failure<A> extends Generic<A, typeof Failure> {}

/**
 * A newtype representing an input error in another type
 *
 * @since 1.0.0
 */
export const FailureIn = genericDef("@newtype/FailureIn")

/**
 * @since 1.0.0
 */
export interface FailureIn<A> extends Generic<A, typeof FailureIn> {}

/**
 * A newtype representing an output error in another type
 *
 * @since 1.0.0
 */
export const FailureOut = genericDef("@newtype/FailureOut")

/**
 * @since 1.0.0
 */
export interface FailureOut<A> extends Generic<A, typeof FailureOut> {}

/**
 * A newtype representing a Boolean Product
 *
 * @since 1.0.0
 */
export const BooleanProd = Prod.of<boolean>()

/**
 * A newtype representing a Boolean Sum
 *
 * @since 1.0.0
 */
export const BooleanSum = Sum.of<boolean>()

/**
 * A newtype representing a String Sum
 *
 * @since 1.0.0
 */
export const StringSum = Sum.of<string>()
