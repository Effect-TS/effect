// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

// TODO: look into the following
// - ExecutionTracingCutoff
// - IShift
// - IFiberRefNew

export type Canceler<R> = URIO<R, void>

export class EffectError<E, A> extends Error {
  readonly _tag = "EffectError"

  constructor(readonly exit: Exit<E, A>, readonly trace?: string) {
    super()
  }
}

export type Instruction =
  | IFlatMap<any, any, any, any, any, any>
  | IFold<any, any, any, any, any, any, any, any, any>
  | IEnsuring<any, any, any>
  | ISucceedNow<any>
  | IFail<any>
  | ISucceed<any>
  | ISucceedWith<any>
  | ISuspend<any, any, any>
  | ISuspendWith<any, any, any>
  | IAsync<any, any, any>
  | IInterruptStatus<any, any, any>
  | ICheckInterrupt<any, any, any>
  | IFork<any, any, any>
  | IDescriptor<any, any, any>
  // | IShift
  | IYield
  // | IFiberRefNew
  | IFiberRefModify<any, any>
  | ITrace
  | IRaceWith<any, any, any, any, any, any, any, any, any, any, any, any>
  | ISupervise<any, any, any>
  | IGetForkScope<any, any, any>
  | IOverrideForkScope<any, any, any>
  | ILogged<any>
  | IFiberRefGetAll<any, any, any>
  | IFiberRefLocally<any, any, any, any>
  | IFiberRefDelete
  | IFiberRefWith<any, any, any, any>
  | ISetRuntimeConfig

export class IFlatMap<R, E, A, R1, E1, A1> extends Base<R & R1, E | E1, A1> {
  readonly _tag = "FlatMap"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly f: (a: A) => Effect<R1, E1, A1>,
    readonly trace?: string
  ) {
    super()
  }
}

export class ISucceedNow<A> extends Base<unknown, never, A> {
  readonly _tag = "SucceedNow"

  constructor(readonly value: A, readonly trace?: string) {
    super()
  }
}

export class ISucceed<A> extends Base<unknown, never, A> {
  readonly _tag = "Succeed"

  constructor(readonly effect: Lazy<A>, readonly trace?: string) {
    super()
  }
}

export class ISucceedWith<A> extends Base<unknown, never, A> {
  readonly _tag = "SucceedWith"

  constructor(
    readonly effect: (runtimeConfig: RuntimeConfig, id: FiberId) => A,
    readonly trace?: string
  ) {
    super()
  }
}

export class ISuspend<R, E, A> extends Base<R, E, A> {
  readonly _tag = "ISuspend"

  constructor(readonly make: Lazy<Effect<R, E, A>>, readonly trace?: string) {
    super()
  }
}

export class ISuspendWith<R, E, A> extends Base<R, E, A> {
  readonly _tag = "SuspendWith"

  constructor(
    readonly make: (runtimeConfig: RuntimeConfig, id: FiberId) => Effect<R, E, A>,
    trace?: string
  ) {
    super()
  }
}

export class IAsync<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Async"

  constructor(
    readonly register: (
      cb: (_: Effect<R, E, A>) => void
    ) => Either<Canceler<R>, Effect<R, E, A>>,
    readonly blockingOn: Lazy<FiberId>,
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
    readonly effect: Effect<R, E, A>,
    readonly failure: (cause: Cause<E>) => Effect<R2, E2, A2>,
    readonly success: (a: A) => Effect<R3, E3, A3>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IFork<R, E, A> extends Base<R, never, RuntimeFiber<E, A>> {
  readonly _tag = "Fork"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly scope: Option<Scope>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IInterruptStatus<R, E, A> extends Base<R, E, A> {
  readonly _tag = "InterruptStatus"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly flag: InterruptStatus,
    readonly trace?: string
  ) {
    super()
  }
}

export class ICheckInterrupt<R, E, A> extends Base<R, E, A> {
  readonly _tag = "CheckInterrupt"

  constructor(
    readonly k: (_: InterruptStatus) => Effect<R, E, A>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IFail<E> extends Base<unknown, E, never> {
  readonly _tag = "Fail"

  constructor(readonly cause: Lazy<Cause<E>>, readonly trace?: string) {
    super()
  }
}

export class IDescriptor<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Descriptor"

  constructor(
    readonly f: (_: FiberDescriptor) => Effect<R, E, A>,
    readonly trace?: string
  ) {
    super()
  }
}

// export class IShift extends Base<unknown, never, void> {
//   readonly _tag = "Shift"

//   constructor(readonly executor: Lazy<Executor>, readonly trace?: string) {
//     super()
//   }
// }

export class IYield extends Base<unknown, never, void> {
  readonly _tag = "Yield"

  constructor(readonly trace?: string) {
    super()
  }
}

export class IFiberRefGetAll<R, E, A> extends Base<R, E, A> {
  readonly _tag = "FiberRefGetAll"

  constructor(
    readonly make: (refs: Map<FiberRef.Runtime<any>, any>) => Effect<R, E, A>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IFiberRefModify<A, B> extends Base<unknown, never, B> {
  readonly _tag = "FiberRefModify"

  constructor(
    readonly fiberRef: FiberRef.Runtime<A>,
    readonly f: (a: A) => [B, A],
    readonly trace?: string
  ) {
    super()
  }
}

export class IFiberRefLocally<V, R, E, A> extends Base<R, E, A> {
  readonly _tag = "FiberRefLocally"

  constructor(
    readonly localValue: V,
    readonly fiberRef: FiberRef.Runtime<V>,
    readonly effect: Effect<R, E, A>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IFiberRefDelete extends Base<unknown, never, void> {
  readonly _tag = "FiberRefDelete"

  constructor(readonly fiberRef: FiberRef.Runtime<any>, readonly trace?: string) {
    super()
  }
}

export class IFiberRefWith<R, E, A, B> extends Base<R, E, B> {
  readonly _tag = "FiberRefWith"

  constructor(
    readonly fiberRef: FiberRef.Runtime<A>,
    readonly f: (a: A) => Effect<R, E, B>,
    readonly trace?: string
  ) {
    super()
  }
}

export class ITrace extends Base<unknown, never, Trace> {
  readonly _tag = "Trace"

  constructor(readonly trace?: string) {
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
    readonly left: Lazy<Effect<R, E, A>>,
    readonly right: Lazy<Effect<R1, E1, A1>>,
    readonly leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>,
    readonly rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>,
    readonly scope: Lazy<Option<Scope>>,
    readonly trace?: string
  ) {
    super()
  }
}

export class ISupervise<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Supervise"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly supervisor: Lazy<Supervisor<any>>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IGetForkScope<R, E, A> extends Base<R, E, A> {
  readonly _tag = "GetForkScope"

  constructor(readonly f: (_: Scope) => Effect<R, E, A>, readonly trace?: string) {
    super()
  }
}

export class IOverrideForkScope<R, E, A> extends Base<R, E, A> {
  readonly _tag = "OverrideForkScope"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly forkScope: Lazy<Option<Scope>>,
    readonly trace?: string
  ) {
    super()
  }
}

export class IEnsuring<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Ensuring"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly finalizer: Lazy<Effect<R, never, any>>,
    readonly trace?: string
  ) {
    super()
  }
}

export class ILogged<A> extends Base<unknown, never, void> {
  readonly _tag = "Logged"

  constructor(
    readonly typeTag: Instruction["_tag"],
    readonly message: Lazy<A>,
    readonly overrideLogLevel: Option<LogLevel> = O.none,
    readonly overrideRef1: FiberRef.Runtime<any> | null = null,
    readonly overrideValue1: any = null,
    readonly trace?: string
  ) {
    super()
  }
}

export class ISetRuntimeConfig extends Base<unknown, never, void> {
  readonly _tag = "ISetRuntimeConfig"

  constructor(readonly runtimeConfig: Lazy<RuntimeConfig>, readonly trace?: string) {
    super()
  }
}
