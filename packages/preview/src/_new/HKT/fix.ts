import { Generic, genericDef } from "../../Newtype"

export const FixE = genericDef("@newtype/FixE")
export interface FixE<F> extends Generic<F, typeof FixE> {}
export type OrE<A, B> = A extends FixE<infer X> ? X : B

export const FixR = genericDef("@newtype/FixR")
export interface FixR<F> extends Generic<F, typeof FixR> {}
export type OrR<A, B> = A extends FixR<infer X> ? X : B

export const FixS = genericDef("@newtype/FixS")
export interface FixS<F> extends Generic<F, typeof FixS> {}
export type OrS<A, B> = A extends FixS<infer X> ? X : B

export const FixX = genericDef("@newtype/FixX")
export interface FixX<F> extends Generic<F, typeof FixX> {}
export type OrX<A, B> = A extends FixX<infer X> ? X : B

export const FixI = genericDef("@newtype/FixI")
export interface FixI<F> extends Generic<F, typeof FixI> {}
export type OrI<A, B> = A extends FixI<infer X> ? X : B

export const FixK = genericDef("@newtype/FixK")
export interface FixK<F> extends Generic<F, typeof FixK> {}
export type OrK<A, B> = A extends FixK<infer X> ? X : B

export const FixN = genericDef("@newtype/FixN")
export interface FixN<F extends string> extends Generic<F, typeof FixK> {}
export type OrN<A, B> = A extends FixN<infer X> ? X : B
