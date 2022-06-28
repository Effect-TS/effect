/**
 * @tsplus type effect/core/stream/Channel/ChildExecutorDecision
 */
export type ChildExecutorDecision = Continue | Close | Yield

export class Continue {
  readonly _tag = "Continue"
}

export class Close {
  readonly _tag = "Close"
  constructor(readonly value: unknown) {}
}

export class Yield {
  readonly _tag = "Yield"
}

/**
 * @tsplus type effect/core/stream/Channel/ChildExecutorDecision.Ops
 */
export interface ChildExecutorDecisionOps {}
export const ChildExecutorDecision: ChildExecutorDecisionOps = {}

/**
 * @tsplus static effect/core/stream/Channel/ChildExecutorDecision.Ops Continue
 */
export const _continue: ChildExecutorDecision = new Continue()

export { _continue as continue }

/**
 * @tsplus static effect/core/stream/Channel/ChildExecutorDecision.Ops Close
 */
export function close(value: unknown): ChildExecutorDecision {
  return new Close(value)
}

/**
 * @tsplus static effect/core/stream/Channel/ChildExecutorDecision.Ops Yield
 */
export const _yield: ChildExecutorDecision = new Yield()

export { _yield as yield }
