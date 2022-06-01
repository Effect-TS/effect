import type { ErasedExecutor } from "@effect/core/stream/Channel/ChannelExecutor"

export const ChannelStateSym = Symbol.for("@effect/core/stream/Channel/ChannelState")
export type ChannelStateSym = typeof ChannelStateSym

export const _R = Symbol.for("@effect/core/stream/Channel/ChannelState/R")
export type _R = typeof _R

export const _E = Symbol.for("@effect/core/stream/Channel/ChannelState/E")
export type _E = typeof _E

/**
 * @tsplus type ets/Channel/State
 */
export interface ChannelState<R, E> {
  readonly [ChannelStateSym]: ChannelStateSym
  readonly [_R]: (_: R) => void
  readonly [_E]: () => E
}

export declare namespace ChannelState {
  type Done = ChannelStateDone
  type Emit = ChannelStateEmit
  type Effect<R, E> = ChannelStateEffect<R, E>
  type Read<R, E> = ChannelStateRead<R, E>
}

export abstract class ChannelStateBase<R, E> implements ChannelState<R, E> {
  readonly [ChannelStateSym]: ChannelStateSym = ChannelStateSym
  readonly [_R]!: (_: R) => void
  readonly [_E]!: () => E
}

export class ChannelStateDone extends ChannelStateBase<unknown, never> {
  readonly _tag = "Done"
}

export class ChannelStateEmit extends ChannelStateBase<unknown, never> {
  readonly _tag = "Emit"
}

export class ChannelStateEffect<R, E> extends ChannelStateBase<R, E> {
  readonly _tag = "Effect"
  constructor(readonly effect: Effect<R, E, unknown>) {
    super()
  }
}

export class ChannelStateRead<R, E> extends ChannelStateBase<R, E> {
  readonly _tag = "Read"
  constructor(
    readonly upstream: ErasedExecutor<R>,
    readonly onEffect: (_: Effect<R, never, void>) => Effect<R, never, void>,
    readonly onEmit: (_: unknown) => Effect<R, never, void> | undefined,
    readonly onDone: (_: Exit<unknown, unknown>) => Effect<R, never, void> | undefined
  ) {
    super()
  }
}

/**
 * @tsplus type ets/Channel/State/Ops
 */
export interface ChannelStateOps {}
export const ChannelState: ChannelStateOps = {}

/**
 * @tsplus unify ets/Channel/State
 */
export function unifyChannelState<X extends ChannelState<any, any>>(
  self: X
): ChannelState<
  [X] extends [{ [_R]: () => infer R }] ? R : never,
  [X] extends [{ [_E]: () => infer E }] ? E : never
> {
  return self
}

/**
 * @tsplus macro remove
 */
export function concreteChannelState<R, E>(
  _: ChannelState<R, E>
): asserts _ is
  | ChannelStateDone
  | ChannelStateEmit
  | ChannelStateEffect<R, E>
  | ChannelStateRead<R, E>
{
  //
}

/**
 * @tsplus static ets/Channel/State/Ops Done
 */
export const channelStateDone: ChannelState<unknown, never> = new ChannelStateDone()

/**
 * @tsplus static ets/Channel/State/Ops Emit
 */
export const channelStateEmit: ChannelState<unknown, never> = new ChannelStateEmit()

/**
 * @tsplus static ets/Channel/State/Ops Effect
 */
export function channelStateEffect<R, E>(
  effect: Effect<R, E, unknown>
): ChannelState<R, E> {
  return new ChannelStateEffect(effect)
}

/**
 * @tsplus static ets/Channel/State/Ops Read
 */
export function channelStateRead<R, _E>(
  upstream: ErasedExecutor<R>,
  onEffect: (_: Effect<R, never, void>) => Effect<R, never, void>,
  onEmit: (_: unknown) => Effect<R, never, void> | undefined,
  onDone: (_: Exit<unknown, unknown>) => Effect<R, never, void> | undefined
): ChannelState<R, _E> {
  return new ChannelStateRead(upstream, onEffect, onEmit, onDone)
}

/**
 * @tsplus fluent ets/Channel/State effectOrUnit
 */
export function effectOrUnit<R, E>(
  self: ChannelState<R, E>,
  __tsplusTrace?: string
): Effect<R, E, unknown> {
  concreteChannelState(self)
  return self._tag === "Effect" ? self.effect : Effect.unit
}

/**
 * @tsplus fluent ets/Channel/State effectOrUndefinedIgnored
 */
export function effectOrUndefinedIgnored<R, E>(
  self: ChannelState<R, E>,
  __tsplusTrace?: string
): Effect<R, never, void> | undefined {
  concreteChannelState(self)
  return self._tag === "Effect" ? self.effect.ignore().asUnit() : undefined
}
