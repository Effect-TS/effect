import { Instruction } from "./primitives"

export const _S = "_S"
export const _R = "_R"
export const _E = "_E"
export const _A = "_A"
export const _I = "_I"
export const _U = "_U"

export const EffectURI = "Effect"
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
