import type { SinkEndReason } from "@effect/core/stream/Stream/SinkEndReason"

export type HandoffSignal<E, A> = Emit<A> | Halt<E> | End

export class Emit<A> {
  readonly _tag = "Emit"
  constructor(readonly elements: Chunk<A>) {}
}

export class Halt<E> {
  readonly _tag = "Halt"
  constructor(readonly error: Cause<E>) {}
}

export class End {
  readonly _tag = "End"
  constructor(readonly reason: SinkEndReason) {}
}

/**
 * @tsplus type effect/core/stream/Stream/HandoffSignal.Ops
 */
export interface HandoffSignalOps {}
export const HandoffSignal: HandoffSignalOps = {}

/**
 * @tsplus static effect/core/stream/Stream/HandoffSignal.Ops Emit
 */
export function emit<A>(elements: Chunk<A>): HandoffSignal<never, A> {
  return new Emit<A>(elements)
}

/**
 * @tsplus static effect/core/stream/Stream/HandoffSignal.Ops Halt
 */
export function halt<E>(error: Cause<E>): HandoffSignal<E, never> {
  return new Halt(error)
}

/**
 * @tsplus static effect/core/stream/Stream/HandoffSignal.Ops End
 */
export function end(reason: SinkEndReason): HandoffSignal<never, never> {
  return new End(reason)
}
