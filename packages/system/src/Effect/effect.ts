// tracing: off

import { _A, _E, _R, _U } from "./commons"
import type { Instruction } from "./primitives"

export const EffectURI = "Effect"
export type EffectURI = typeof EffectURI

export interface Effect<R, E, A> {
  readonly [_U]: EffectURI
  readonly [_E]: () => E
  readonly [_A]: () => A
  readonly [_R]: (_: R) => void

  readonly _S1: (_: unknown) => void
  readonly _S2: () => unknown
}

export type IO<E, A> = Effect<unknown, E, A>
export type RIO<R, A> = Effect<R, never, A>
export type UIO<A> = Effect<unknown, never, A>

export abstract class Base<R, E, A> implements Effect<R, E, A> {
  readonly _S1!: (_: unknown) => void
  readonly _S2!: () => never;

  readonly [_U]: EffectURI;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
  readonly [_R]: (_: R) => void
}

/**
 * @optimize identity
 */
export function instruction<R, E, A>(self: Effect<R, E, A>): Instruction {
  // @ts-expect-error
  return self
}
