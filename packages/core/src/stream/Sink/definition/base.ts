import type { _E, _In, _L, _R, _Z } from "./symbols"

export const SinkSym = Symbol.for("@effect-ts/core/stream/Sink")
export type SinkSym = typeof SinkSym

/**
 * @tsplus type ets/Sink
 */
export interface Sink<R, E, In, L, Z> {
  readonly [SinkSym]: SinkSym
  readonly [_R]: (_: R) => void
  readonly [_E]: () => E
  readonly [_In]: (_: In) => void
  readonly [_L]: () => L
  readonly [_Z]: () => Z
}

/**
 * @tsplus type ets/SinkOps
 */
export interface SinkOps {}
export const Sink: SinkOps = {}
