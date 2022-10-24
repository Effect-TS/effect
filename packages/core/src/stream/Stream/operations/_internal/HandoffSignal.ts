import type { SinkEndReason } from "@effect/core/stream/Stream/SinkEndReason"
import type { Chunk } from "@fp-ts/data/Chunk"

/** @internal */
export type HandoffSignal<E, A> = Emit<A> | Halt<E> | End

export class Emit<A> {
  readonly _tag = "Emit"
  constructor(readonly elements: Chunk<A>) {}
}

/** @internal */
export class Halt<E> {
  readonly _tag = "Halt"
  constructor(readonly error: Cause<E>) {}
}

/** @internal */
export class End {
  readonly _tag = "End"
  constructor(readonly reason: SinkEndReason) {}
}

/**
 * @tsplus type effect/core/stream/Stream/HandoffSignal.Ops
 * @internal
 */
export interface HandoffSignalOps {}
export const HandoffSignal: HandoffSignalOps = {}

/**
 * @tsplus static effect/core/stream/Stream/HandoffSignal.Ops Emit
 * @internal
 */
export function emit<A>(elements: Chunk<A>): HandoffSignal<never, A> {
  return new Emit<A>(elements)
}

/**
 * @tsplus static effect/core/stream/Stream/HandoffSignal.Ops Halt
 * @internal
 */
export function halt<E>(error: Cause<E>): HandoffSignal<E, never> {
  return new Halt(error)
}

/**
 * @tsplus static effect/core/stream/Stream/HandoffSignal.Ops End
 * @internal
 */
export function end(reason: SinkEndReason): HandoffSignal<never, never> {
  return new End(reason)
}
