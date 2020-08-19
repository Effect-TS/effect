import * as Cause from "../Cause/core"
import * as Exit from "../Exit/exit"
import { FiberContext } from "../Fiber/context"
import * as Fiber from "../Fiber/core"
import { FiberID } from "../Fiber/id"
import { FiberRef } from "../FiberRef/fiberRef"
import * as O from "../Option"
import { Scope } from "../Scope"
import { Supervisor } from "../Supervisor"

import { Effect, AsyncRE, _A, _I, _S, _R, _E, _U, EffectURI } from "./effect"

//
// @category Primitives
//
export type Instruction =
  | IFlatMap<any, any, any, any, any, any, any, any>
  | ISucceed<any>
  | IEffectPartial<any, any>
  | IEffectTotal<any>
  | IEffectAsync<any, any, any>
  | IFold<any, any, any, any, any, any, any, any, any, any, any, any>
  | IFork<any, any, any, any>
  | IInterruptStatus<any, any, any, any>
  | ICheckInterrupt<any, any, any, any>
  | IFail<any>
  | IDescriptor<any, any, any, any>
  | IYield
  | IRead<any, any, any, any, any>
  | IProvide<any, any, any, any>
  | ISuspend<any, any, any, any>
  | ISuspendPartial<any, any, any, any, any>
  | IFiberRefNew<any>
  | IFiberRefModify<any, any>
  | IRaceWith<
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >
  | ISupervise<any, any, any, any>
  | IGetForkScope<any, any, any, any>
  | IOverrideForkScope<any, any, any, any>

abstract class Base<S, R, E, A> implements Effect<S, R, E, A> {
  readonly [_U]: EffectURI;
  readonly [_S]: () => S;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
  readonly [_R]: (_: R) => void

  get [_I]() {
    return this as any
  }
}

export class IFlatMap<S, R, E, A, S1, R1, E1, A1> extends Base<
  S | S1,
  R & R1,
  E | E1,
  A1
> {
  readonly _tag = "FlatMap"

  constructor(
    readonly val: Effect<S, R, E, A>,
    readonly f: (a: A) => Effect<S1, R1, E1, A1>
  ) {
    super()
  }
}

export class ISucceed<A> extends Base<never, unknown, never, A> {
  readonly _tag = "Succeed"

  constructor(readonly val: A) {
    super()
  }
}

export class IEffectPartial<E, A> extends Base<never, unknown, E, A> {
  readonly _tag = "EffectPartial"

  constructor(readonly effect: () => A, readonly onThrow: (u: unknown) => E) {
    super()
  }
}

export class IEffectTotal<A> extends Base<never, unknown, never, A> {
  readonly _tag = "EffectTotal"

  constructor(readonly effect: () => A) {
    super()
  }
}

export class IEffectAsync<R, E, A> extends Base<unknown, R, E, A> {
  readonly _tag = "EffectAsync"

  constructor(
    readonly register: (
      cb: (_: AsyncRE<R, E, A>) => void
    ) => O.Option<AsyncRE<R, E, A>>,
    readonly blockingOn: readonly FiberID[]
  ) {
    super()
  }
}

export class IFold<S, R, E, A, S2, R2, E2, A2, S3, R3, E3, A3> extends Base<
  S | S2 | S3,
  R & R2 & R3,
  E2 | E3,
  A2 | A3
> {
  readonly _tag = "Fold"

  constructor(
    readonly value: Effect<S, R, E, A>,
    readonly failure: (cause: Cause.Cause<E>) => Effect<S2, R2, E2, A2>,
    readonly success: (a: A) => Effect<S3, R3, E3, A3>
  ) {
    super()
  }

  apply(v: A): Effect<S | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> {
    return this.success(v)
  }
}

export class IFork<S, R, E, A> extends Base<unknown, R, never, FiberContext<E, A>> {
  readonly _tag = "Fork"

  constructor(
    readonly value: Effect<S, R, E, A>,
    readonly scope: O.Option<Scope<Exit.Exit<any, any>>>
  ) {
    super()
  }
}

export class IInterruptStatus<S, R, E, A> extends Base<S, R, E, A> {
  readonly _tag = "InterruptStatus"

  constructor(
    readonly effect: Effect<S, R, E, A>,
    readonly flag: Fiber.InterruptStatus
  ) {
    super()
  }
}

export class ICheckInterrupt<S, R, E, A> extends Base<S, R, E, A> {
  readonly _tag = "CheckInterrupt"

  constructor(readonly f: (_: Fiber.InterruptStatus) => Effect<S, R, E, A>) {
    super()
  }
}

export class IFail<E> extends Base<never, unknown, E, never> {
  readonly _tag = "Fail"

  constructor(readonly cause: Cause.Cause<E>) {
    super()
  }
}

export class IDescriptor<S, R, E, A> extends Base<S, R, E, A> {
  readonly _tag = "Descriptor"

  constructor(readonly f: (_: Fiber.Descriptor) => Effect<S, R, E, A>) {
    super()
  }
}

export class IYield extends Base<unknown, unknown, never, void> {
  readonly _tag = "Yield"

  constructor() {
    super()
  }
}

export class IRead<R0, S, R, E, A> extends Base<S, R & R0, E, A> {
  readonly _tag = "Read"

  constructor(readonly f: (_: R0) => Effect<S, R, E, A>) {
    super()
  }
}

export class IProvide<S, R, E, A> extends Base<S, unknown, E, A> {
  readonly _tag = "Provide"

  constructor(readonly r: R, readonly next: Effect<S, R, E, A>) {
    super()
  }
}

export class ISuspend<S, R, E, A> extends Base<S, R, E, A> {
  readonly _tag = "Suspend"

  constructor(readonly factory: () => Effect<S, R, E, A>) {
    super()
  }
}

export class ISuspendPartial<S, R, E, A, E2> extends Base<S, R, E | E2, A> {
  readonly _tag = "SuspendPartial"

  constructor(
    readonly factory: () => Effect<S, R, E, A>,
    readonly onThrow: (u: unknown) => E2
  ) {
    super()
  }
}

export class IFiberRefNew<A> extends Base<never, unknown, never, FiberRef<A>> {
  readonly _tag = "FiberRefNew"

  constructor(
    readonly initial: A,
    readonly onFork: (a: A) => A,
    readonly onJoin: (a: A, a2: A) => A
  ) {
    super()
  }
}

export class IFiberRefModify<A, B> extends Base<never, unknown, never, B> {
  readonly _tag = "FiberRefModify"

  constructor(readonly fiberRef: FiberRef<A>, readonly f: (a: A) => [B, A]) {
    super()
  }
}

export class IRaceWith<
  S,
  R,
  E,
  A,
  S1,
  R1,
  E1,
  A1,
  S2,
  R2,
  E2,
  A2,
  S3,
  R3,
  E3,
  A3
> extends Base<unknown, R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  readonly _tag = "RaceWith"

  constructor(
    readonly left: Effect<S, R, E, A>,
    readonly right: Effect<S1, R1, E1, A1>,
    readonly leftWins: (
      exit: Exit.Exit<E, A>,
      fiber: Fiber.Fiber<E1, A1>
    ) => Effect<S2, R2, E2, A2>,
    readonly rightWins: (
      exit: Exit.Exit<E1, A1>,
      fiber: Fiber.Fiber<E, A>
    ) => Effect<S3, R3, E3, A3>,
    readonly scope: O.Option<Scope<Exit.Exit<any, any>>>
  ) {
    super()
  }
}

export class ISupervise<S, R, E, A> extends Base<unknown, R, E, A> {
  readonly _tag = "Supervise"

  constructor(
    readonly effect: Effect<S, R, E, A>,
    readonly supervisor: Supervisor<any>
  ) {
    super()
  }
}

export class IGetForkScope<S, R, E, A> extends Base<unknown, R, E, A> {
  readonly _tag = "GetForkScope"

  constructor(readonly f: (_: Scope<Exit.Exit<any, any>>) => Effect<S, R, E, A>) {
    super()
  }
}

export class IOverrideForkScope<S, R, E, A> extends Base<S, R, E, A> {
  readonly _tag = "OverrideForkScope"

  constructor(
    readonly effect: Effect<S, R, E, A>,
    readonly forkScope: O.Option<Scope<Exit.Exit<any, any>>>
  ) {
    super()
  }
}
