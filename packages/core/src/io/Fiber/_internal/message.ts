import type { FiberRuntime } from "@effect/core/io/Fiber/_internal/runtime"

export type FiberMessage = InterruptSignal | Stateful | Resume | YieldNow

export class InterruptSignal {
  readonly _tag = "InterruptSignal"
  constructor(readonly cause: Cause<never>) {}
}

export class Stateful {
  readonly _tag = "Stateful"
  constructor(
    readonly onFiber: (fiber: FiberRuntime<any, any>, status: Fiber.Status) => void
  ) {}
}

export class Resume {
  readonly _tag = "Resume"
  constructor(
    readonly effect: Effect<any, any, any>
  ) {}
}

export class YieldNow {
  readonly _tag = "YieldNow"
}
