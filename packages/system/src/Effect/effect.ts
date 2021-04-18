// tracing: off

import * as St from "../Structural"
import { _A, _E, _R, _S1, _S2, _U, _W } from "./commons"
import type { Instruction } from "./primitives"

export const EffectURI = "Effect"
export type EffectURI = typeof EffectURI

export interface Effect<R, E, A> {
  readonly [_U]: EffectURI
  readonly [_E]: () => E
  readonly [_A]: () => A
  readonly [_R]: (_: R) => void

  readonly [_S1]: (_: unknown) => void
  readonly [_S2]: () => unknown
  readonly [_W]: () => unknown
}

export type IO<E, A> = Effect<unknown, E, A>
export type RIO<R, A> = Effect<R, never, A>
export type UIO<A> = Effect<unknown, never, A>

export abstract class Base<R, E, A>
  implements Effect<R, E, A>, St.HasEquals, St.HasHash {
  readonly [_S1]!: (_: unknown) => void;
  readonly [_S2]!: () => unknown;
  readonly [_W]: () => unknown;

  readonly [_U]: EffectURI;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
  readonly [_R]: (_: R) => void;

  [St.equalsSym](that: unknown): boolean {
    return this === that
  }

  [St.hashSym](): number {
    return St.hashIncremental(this)
  }
}

/**
 * @optimize identity
 */
export function instruction<R, E, A>(self: Effect<R, E, A>): Instruction {
  // @ts-expect-error
  return self
}
