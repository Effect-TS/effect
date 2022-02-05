// ets_tracing: off

import type * as Cause from "../Cause/core.js"
import type { Tuple } from "../Collections/Immutable/Tuple/index.js"
import type * as Exit from "../Exit/exit.js"
import type { FiberContext } from "../Fiber/context.js"
import type * as Fiber from "../Fiber/core.js"
import type { FiberID } from "../Fiber/id.js"
import type { Platform } from "../Fiber/index.js"
import type { Trace } from "../Fiber/tracing.js"
import type { Runtime } from "../FiberRef/fiberRef.js"
import type * as O from "../Option/index.js"
import type { Scope } from "../Scope/index.js"
import type { Supervisor } from "../Supervisor/index.js"
import type { XPureBase } from "../XPure/core.js"
import type { Effect } from "./effect.js"
import { Base } from "./effect.js"

//
// @category Primitives
//
export type Instruction =
  | IFlatMap<any, any, any, any, any, any>
  | ISucceed<any>
  | IEffectPartial<any, any>
  | IEffectTotal<any>
  | IEffectAsync<any, any, any>
  | IFold<any, any, any, any, any, any, any, any, any>
  | IFork<any, any, any>
  | IInterruptStatus<any, any, any>
  | ICheckInterrupt<any, any, any>
  | ICheckTracingStatus<any, any, any>
  | IFail<any>
  | IDescriptor<any, any, any>
  | IYield
  | ITrace
  | IRead<any, any, any, any>
  | IProvide<any, any, any>
  | ISuspend<any, any, any>
  | ISuspendPartial<any, any, any, any>
  | IFiberRefNew<any>
  | IFiberRefModify<any, any>
  | IRaceWith<any, any, any, any, any, any, any, any, any, any, any, any>
  | ISupervise<any, any, any>
  | IGetForkScope<any, any, any>
  | IOverrideForkScope<any, any, any>
  | ITracingStatus<any, any, any>
  | IPlatform<any, any, any>
  | ITracer<any, any, any>
  | XPureBase<unknown, unknown, unknown, any, any, any>

export class IFail<E> extends Base<unknown, E, never> {
  readonly _tag = "Fail"

  constructor(
    readonly fill: (_: () => Trace) => Cause.Cause<E>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IFlatMap<R, E, A, R1, E1, A1> extends Base<R & R1, E | E1, A1> {
  readonly _tag = "FlatMap"

  constructor(
    readonly val: Effect<R, E, A>,
    readonly f: (a: A) => Effect<R1, E1, A1>,
    readonly trace?: string
  ) {
    super()
  }
}

export class ISucceed<A> extends Base<unknown, never, A> {
  readonly _tag = "Succeed"

  constructor(readonly val: A, readonly trace?: string) {
    super()
  }
}

export class ITrace extends Base<unknown, never, Trace> {
  readonly _tag = "Trace"

  constructor() {
    super()
  }
}

export class ITracingStatus<R, E, A> extends Base<R, E, A> {
  readonly _tag = "TracingStatus"

  constructor(readonly effect: Effect<R, E, A>, readonly flag: boolean) {
    super()
  }
}

export class ICheckTracingStatus<R, E, A> extends Base<R, E, A> {
  readonly _tag = "CheckTracingStatus"

  constructor(readonly f: (tracingStatus: boolean) => Effect<R, E, A>) {
    super()
  }
}

export class IEffectPartial<E, A> extends Base<unknown, E, A> {
  readonly _tag = "EffectPartial"

  constructor(
    readonly effect: () => A,
    readonly onThrow: (u: unknown) => E,
    readonly trace?: string
  ) {
    super()
  }
}

export class IEffectTotal<A> extends Base<unknown, never, A> {
  readonly _tag = "EffectTotal"

  constructor(readonly effect: () => A, readonly trace?: string) {
    super()
  }
}

export class IEffectAsync<R, E, A> extends Base<R, E, A> {
  readonly _tag = "EffectAsync"

  constructor(
    readonly register: (cb: (_: Effect<R, E, A>) => void) => O.Option<Effect<R, E, A>>,
    readonly blockingOn: readonly FiberID[],
    readonly trace?: string
  ) {
    super()
  }
}

export class IFold<R, E, A, R2, E2, A2, R3, E3, A3> extends Base<
  R & R2 & R3,
  E2 | E3,
  A2 | A3
> {
  readonly _tag = "Fold"

  constructor(
    readonly value: Effect<R, E, A>,
    readonly failure: (cause: Cause.Cause<E>) => Effect<R2, E2, A2>,
    readonly apply: (a: A) => Effect<R3, E3, A3>,
    readonly trace?: string
  ) {
    super()
  }
}

export type FailureReporter = (e: Cause.Cause<unknown>) => void

export class IFork<R, E, A> extends Base<R, never, FiberContext<E, A>> {
  readonly _tag = "Fork"

  constructor(
    readonly value: Effect<R, E, A>,
    readonly scope: O.Option<Scope<Exit.Exit<any, any>>>,
    readonly reportFailure: O.Option<FailureReporter>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IInterruptStatus<R, E, A> extends Base<R, E, A> {
  readonly _tag = "InterruptStatus"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly flag: Fiber.InterruptStatus,
    readonly trace?: string
  ) {
    super()
  }
}

export class ICheckInterrupt<R, E, A> extends Base<R, E, A> {
  readonly _tag = "CheckInterrupt"

  constructor(
    readonly f: (_: Fiber.InterruptStatus) => Effect<R, E, A>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IDescriptor<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Descriptor"

  constructor(
    readonly f: (_: Fiber.Descriptor) => Effect<R, E, A>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IYield extends Base<unknown, never, void> {
  readonly _tag = "Yield"

  constructor() {
    super()
  }
}

export class IRead<R0, R, E, A> extends Base<R & R0, E, A> {
  readonly _tag = "Read"

  constructor(readonly f: (_: R0) => Effect<R, E, A>, readonly trace?: string) {
    super()
  }
}

export class IPlatform<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Platform"

  constructor(
    readonly f: (_: Platform<unknown>) => Effect<R, E, A>,
    readonly trace?: string
  ) {
    super()
  }
}

export class ITracer<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Tracer"

  constructor(
    readonly f: (tracer: (trace?: string) => void) => Effect<R, E, A>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IProvide<R, E, A> extends Base<unknown, E, A> {
  readonly _tag = "Provide"

  constructor(readonly r: R, readonly next: Effect<R, E, A>, readonly trace?: string) {
    super()
  }
}

export class ISuspend<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Suspend"

  constructor(
    readonly factory: (platform: Platform<unknown>, id: FiberID) => Effect<R, E, A>,
    readonly trace?: string
  ) {
    super()
  }
}

export class ISuspendPartial<R, E, A, E2> extends Base<R, E | E2, A> {
  readonly _tag = "SuspendPartial"

  constructor(
    readonly factory: (platform: Platform<unknown>, id: FiberID) => Effect<R, E, A>,
    readonly onThrow: (u: unknown) => E2,
    readonly trace?: string
  ) {
    super()
  }
}

export class IFiberRefNew<A> extends Base<unknown, never, Runtime<A>> {
  readonly _tag = "FiberRefNew"

  constructor(
    readonly initial: A,
    readonly onFork: (a: A) => A,
    readonly onJoin: (a: A, a2: A) => A
  ) {
    super()
  }
}

export class IFiberRefModify<A, B> extends Base<unknown, never, B> {
  readonly _tag = "FiberRefModify"

  constructor(
    readonly fiberRef: Runtime<A>,
    readonly f: (a: A) => Tuple<[B, A]>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IRaceWith<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3> extends Base<
  R & R1 & R2 & R3,
  E2 | E3,
  A2 | A3
> {
  readonly _tag = "RaceWith"

  constructor(
    readonly left: Effect<R, E, A>,
    readonly right: Effect<R1, E1, A1>,
    readonly leftWins: (
      exit: Exit.Exit<E, A>,
      fiber: Fiber.Fiber<E1, A1>
    ) => Effect<R2, E2, A2>,
    readonly rightWins: (
      exit: Exit.Exit<E1, A1>,
      fiber: Fiber.Fiber<E, A>
    ) => Effect<R3, E3, A3>,
    readonly scope: O.Option<Scope<Exit.Exit<any, any>>>,
    readonly trace?: string
  ) {
    super()
  }
}

export class ISupervise<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Supervise"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly supervisor: Supervisor<any>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IGetForkScope<R, E, A> extends Base<R, E, A> {
  readonly _tag = "GetForkScope"

  constructor(
    readonly f: (_: Scope<Exit.Exit<any, any>>) => Effect<R, E, A>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IOverrideForkScope<R, E, A> extends Base<R, E, A> {
  readonly _tag = "OverrideForkScope"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly forkScope: O.Option<Scope<Exit.Exit<any, any>>>,
    readonly trace?: string
  ) {
    super()
  }
}

export * from "./effect.js"
