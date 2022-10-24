import type { FiberRuntime } from "@effect/core/io/Fiber/_internal/runtime"

/** @internal */
export type FiberMessage = InterruptSignal | Stateful | Resume | YieldNow

/** @internal */
export class InterruptSignal {
  readonly _tag = "InterruptSignal"
  constructor(readonly cause: Cause<never>) {}
}

/** @internal */
export class Stateful {
  readonly _tag = "Stateful"
  constructor(
    readonly onFiber: (fiber: FiberRuntime<any, any>, status: Fiber.Status) => void
  ) {}
}

/** @internal */
export class Resume {
  readonly _tag = "Resume"
  constructor(
    readonly effect: Effect<any, any, any>
  ) {}
}

/** @internal */
export class YieldNow {
  readonly _tag = "YieldNow"
}
