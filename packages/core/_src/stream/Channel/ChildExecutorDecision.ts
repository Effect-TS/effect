/**
 * @tsplus type ets/Channel/ChildExecutorDecision
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
 * @tsplus type ets/Channel/ChildExecutorDecision/Ops
 */
export interface ChildExecutorDecisionOps {}
export const ChildExecutorDecision: ChildExecutorDecisionOps = {}

/**
 * @tsplus static ets/Channel/ChildExecutorDecision/Ops Continue
 */
export const _continue: ChildExecutorDecision = new Continue()

export { _continue as continue }

/**
 * @tsplus static ets/Channel/ChildExecutorDecision/Ops Close
 */
export function close(value: unknown): ChildExecutorDecision {
  return new Close(value)
}

/**
 * @tsplus static ets/Channel/ChildExecutorDecision/Ops Yield
 */
export const _yield: ChildExecutorDecision = new Yield()

export { _yield as yield }
