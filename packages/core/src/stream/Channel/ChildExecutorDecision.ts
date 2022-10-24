/**
 * @tsplus type effect/core/stream/Channel/ChildExecutorDecision
 * @category model
 * @since 1.0.0
 */
export type ChildExecutorDecision = Continue | Close | Yield

/**
 * @category model
 * @since 1.0.0
 */
export class Continue {
  readonly _tag = "Continue"
}

/**
 * @category model
 * @since 1.0.0
 */
export class Close {
  readonly _tag = "Close"
  constructor(readonly value: unknown) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class Yield {
  readonly _tag = "Yield"
}

/**
 * @tsplus type effect/core/stream/Channel/ChildExecutorDecision.Ops
 * @category model
 * @since 1.0.0
 */
export interface ChildExecutorDecisionOps {}
export const ChildExecutorDecision: ChildExecutorDecisionOps = {}

/**
 * @tsplus static effect/core/stream/Channel/ChildExecutorDecision.Ops Continue
 * @category constructors
 * @since 1.0.0
 */
export const _continue: ChildExecutorDecision = new Continue()

export { _continue as continue }

/**
 * @tsplus static effect/core/stream/Channel/ChildExecutorDecision.Ops Close
 * @category constructors
 * @since 1.0.0
 */
export function close(value: unknown): ChildExecutorDecision {
  return new Close(value)
}

/**
 * @tsplus static effect/core/stream/Channel/ChildExecutorDecision.Ops Yield
 * @category constructors
 * @since 1.0.0
 */
export const _yield: ChildExecutorDecision = new Yield()

export { _yield as yield }
