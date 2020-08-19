/**
 * @since 1.0.0
 */
import { genericDef, Generic } from "../Newtype"

/**
 * @since 1.0.0
 */
export const FixE = genericDef("@newtype/FixE")
/**
 * @since 1.0.0
 */
export interface FixE<F> extends Generic<F, typeof FixE> {}
/**
 * @since 1.0.0
 */
export type OrE<A, B> = A extends FixE<infer X> ? X : B

/**
 * @since 1.0.0
 */
export const FixR = genericDef("@newtype/FixR")
/**
 * @since 1.0.0
 */
export interface FixR<F> extends Generic<F, typeof FixR> {}
/**
 * @since 1.0.0
 */
export type OrR<A, B> = A extends FixR<infer X> ? X : B

/**
 * @since 1.0.0
 */
export const FixS = genericDef("@newtype/FixS")
/**
 * @since 1.0.0
 */
export interface FixS<F> extends Generic<F, typeof FixS> {}
/**
 * @since 1.0.0
 */
export type OrS<A, B> = A extends FixS<infer X> ? X : B

/**
 * @since 1.0.0
 */
export const FixX = genericDef("@newtype/FixX")
/**
 * @since 1.0.0
 */
export interface FixX<F> extends Generic<F, typeof FixX> {}
/**
 * @since 1.0.0
 */
export type OrX<A, B> = A extends FixX<infer X> ? X : B

/**
 * @since 1.0.0
 */
export const FixI = genericDef("@newtype/FixI")
/**
 * @since 1.0.0
 */
export interface FixI<F> extends Generic<F, typeof FixI> {}
/**
 * @since 1.0.0
 */
export type OrI<A, B> = A extends FixI<infer X> ? X : B

/**
 * @since 1.0.0
 */
export const FixK = genericDef("@newtype/FixK")
/**
 * @since 1.0.0
 */
export interface FixK<F> extends Generic<F, typeof FixK> {}
/**
 * @since 1.0.0
 */
export type OrK<A, B> = A extends FixK<infer X> ? X : B

/**
 * @since 1.0.0
 */
export const FixN = genericDef("@newtype/FixN")
/**
 * @since 1.0.0
 */
export interface FixN<F extends string> extends Generic<F, typeof FixK> {}
/**
 * @since 1.0.0
 */
export type OrN<A, B> = A extends FixN<infer X> ? X : B
