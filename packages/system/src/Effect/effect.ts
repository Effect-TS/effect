import type { Instruction } from "./primitives"

export const _R = "_R"
export const _E = "_E"
export const _A = "_A"
export const _I = "_I"
export const _U = "_U"

export const EffectURI = "Effect"
export type EffectURI = typeof EffectURI

export interface Effect<R, E, A> {
  readonly [_U]: EffectURI
  readonly [_E]: () => E
  readonly [_A]: () => A
  readonly [_R]: (_: R) => void

  readonly [_I]: Instruction

  readonly _S1: (_: unknown) => void
  readonly _S2: () => never
}

export type IO<E, A> = Effect<unknown, E, A>
export type RIO<R, A> = Effect<R, never, A>
export type UIO<A> = Effect<unknown, never, A>
