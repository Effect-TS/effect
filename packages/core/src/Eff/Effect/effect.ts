import { MaURIS, Kind4 } from "../../Base"

import { Instruction } from "./primitives"

export const _S = "_S"
export const _R = "_R"
export const _E = "_E"
export const _A = "_A"
export const _I = "_I"
export const _U = "_U"

export const EffectURI = "@matechs/core/Eff/EffectURI"
export type EffectURI = typeof EffectURI

export interface Effect<S, R, E, A> {
  readonly [_U]: EffectURI
  readonly [_S]: () => S
  readonly [_E]: () => E
  readonly [_A]: () => A
  readonly [_R]: (_: R) => void

  readonly [_I]: Instruction
}

export type Sync<A> = Effect<never, unknown, never, A>
export type SyncE<E, A> = Effect<never, unknown, E, A>
export type SyncR<R, A> = Effect<never, R, never, A>
export type SyncRE<R, E, A> = Effect<never, R, E, A>
export type Async<A> = Effect<unknown, unknown, never, A>
export type AsyncR<R, A> = Effect<unknown, R, never, A>
export type AsyncE<E, A> = Effect<unknown, unknown, E, A>
export type AsyncRE<R, E, A> = Effect<unknown, R, E, A>

export type SOf<T> = [T] extends [{ [_S]: () => infer S }] ? S : never
export type ROf<T> = [T] extends [{ [_R]: (_: infer R) => void }] ? R : unknown
export type EOf<T> = [T] extends [{ [_E]: () => infer E }] ? E : never
export type AOf<T> = [T] extends [{ [_A]: () => infer A }] ? A : never
export type KOf<T> = [T] extends [{ [_U]: infer URI }]
  ? URI extends MaURIS
    ? Kind4<URI, SOf<T>, ROf<T>, EOf<T>, AOf<T>>
    : T
  : T
