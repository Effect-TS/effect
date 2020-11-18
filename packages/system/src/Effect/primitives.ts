import type * as Cause from "../Cause/core"
import type * as Exit from "../Exit/exit"
import type { FiberContext } from "../Fiber/context"
import type * as Fiber from "../Fiber/core"
import type { FiberID } from "../Fiber/id"
import type { FiberRef } from "../FiberRef/fiberRef"
import type * as O from "../Option"
import type { Scope } from "../Scope"
import type { Supervisor } from "../Supervisor"
import type { XPure } from "../XPure"
import type { Effect, FFI, IFail } from "./effect"
import { Base } from "./effect"

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
  | IFail<any>
  | IDescriptor<any, any, any>
  | IYield
  | IRead<any, any, any, any>
  | IProvide<any, any, any>
  | ISuspend<any, any, any>
  | ISuspendPartial<any, any, any, any, any>
  | IFiberRefNew<any>
  | IFiberRefModify<any, any>
  | IRaceWith<any, any, any, any, any, any, any, any, any, any, any, any>
  | ISupervise<any, any, any>
  | IGetForkScope<any, any, any>
  | IOverrideForkScope<any, any, any>
  | XPure<unknown, never, any, any, any>
  | FFI<any, any, any>
  | IGetExecutionTraces

export class IFlatMap<R, E, A, R1, E1, A1> extends Base<R & R1, E | E1, A1> {
  readonly _tag = "FlatMap"

  constructor(readonly val: Effect<R, E, A>, readonly f: (a: A) => Effect<R1, E1, A1>) {
    super()
  }
}

export class ISucceed<A> extends Base<unknown, never, A> {
  readonly _tag = "Succeed"

  constructor(readonly val: A) {
    super()
  }
}

export class ExecutionTrace {
  constructor(readonly file: string, readonly op: string) {}
}

export class IGetExecutionTraces extends Base<
  unknown,
  never,
  readonly ExecutionTrace[]
> {
  readonly _tag = "GetExecutionTraces"

  constructor(readonly internal: boolean) {
    super()
  }
}

export class IEffectPartial<E, A> extends Base<unknown, E, A> {
  readonly _tag = "EffectPartial"

  constructor(readonly effect: () => A, readonly onThrow: (u: unknown) => E) {
    super()
  }
}

export class IEffectTotal<A> extends Base<unknown, never, A> {
  readonly _tag = "EffectTotal"

  constructor(readonly effect: () => A) {
    super()
  }
}

export class IEffectAsync<R, E, A> extends Base<R, E, A> {
  readonly _tag = "EffectAsync"

  constructor(
    readonly register: (cb: (_: Effect<R, E, A>) => void) => O.Option<Effect<R, E, A>>,
    readonly blockingOn: readonly FiberID[]
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
    readonly success: (a: A) => Effect<R3, E3, A3>
  ) {
    super()
  }

  apply(v: A): Effect<R & R2 & R3, E2 | E3, A2 | A3> {
    return this.success(v)
  }
}

export type FailureReporter = (e: Cause.Cause<unknown>) => void

export class IFork<R, E, A> extends Base<R, never, FiberContext<E, A>> {
  readonly _tag = "Fork"

  constructor(
    readonly value: Effect<R, E, A>,
    readonly scope: O.Option<Scope<Exit.Exit<any, any>>>,
    readonly reportFailure: O.Option<FailureReporter>
  ) {
    super()
  }
}

export class IInterruptStatus<R, E, A> extends Base<R, E, A> {
  readonly _tag = "InterruptStatus"

  constructor(readonly effect: Effect<R, E, A>, readonly flag: Fiber.InterruptStatus) {
    super()
  }
}

export class ICheckInterrupt<R, E, A> extends Base<R, E, A> {
  readonly _tag = "CheckInterrupt"

  constructor(readonly f: (_: Fiber.InterruptStatus) => Effect<R, E, A>) {
    super()
  }
}

export class IDescriptor<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Descriptor"

  constructor(readonly f: (_: Fiber.Descriptor) => Effect<R, E, A>) {
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

  constructor(readonly f: (_: R0) => Effect<R, E, A>) {
    super()
  }
}

export class IProvide<R, E, A> extends Base<unknown, E, A> {
  readonly _tag = "Provide"

  constructor(readonly r: R, readonly next: Effect<R, E, A>) {
    super()
  }
}

export class ISuspend<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Suspend"

  constructor(readonly factory: () => Effect<R, E, A>) {
    super()
  }
}

export class ISuspendPartial<S, R, E, A, E2> extends Base<R, E | E2, A> {
  readonly _tag = "SuspendPartial"

  constructor(
    readonly factory: () => Effect<R, E, A>,
    readonly onThrow: (u: unknown) => E2
  ) {
    super()
  }
}

export class IFiberRefNew<A> extends Base<unknown, never, FiberRef<A>> {
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

  constructor(readonly fiberRef: FiberRef<A>, readonly f: (a: A) => [B, A]) {
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
    readonly scope: O.Option<Scope<Exit.Exit<any, any>>>
  ) {
    super()
  }
}

export class ISupervise<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Supervise"

  constructor(readonly effect: Effect<R, E, A>, readonly supervisor: Supervisor<any>) {
    super()
  }
}

export class IGetForkScope<R, E, A> extends Base<R, E, A> {
  readonly _tag = "GetForkScope"

  constructor(readonly f: (_: Scope<Exit.Exit<any, any>>) => Effect<R, E, A>) {
    super()
  }
}

export class IOverrideForkScope<R, E, A> extends Base<R, E, A> {
  readonly _tag = "OverrideForkScope"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly forkScope: O.Option<Scope<Exit.Exit<any, any>>>
  ) {
    super()
  }
}

export * from "./effect"
