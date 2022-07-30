import type { Effect } from "@effect/core/io/Effect/definition/base"
import { Base } from "@effect/core/io/Effect/definition/base"

export type Instruction =
  | IFlatMap<any, any, any, any, any, any>
  | IFold<any, any, any, any, any, any, any, any, any>
  | IEnsuring<any, any, any, any>
  | ISucceed<any>
  | IFail<any>
  | ISync<any>
  | ISucceedWith<any>
  | ISuspend<any, any, any>
  | ISuspendWith<any, any, any>
  | IAsync<any, any, any>
  | IInterruptStatus<any, any, any>
  | ICheckInterrupt<any, any, any>
  | IFork<any, any, any>
  | IDescriptor<any, any, any>
  | IYield
  | IFiberRefModify<any, any, any>
  | ITrace
  | IRaceWith<any, any, any, any, any, any, any, any, any, any, any, any>
  | ISupervise<any, any, any>
  | IGetForkScope<any, any, any>
  | IOverrideForkScope<any, any, any>
  | ILogged<any>
  | IFiberRefModifyAll<any>
  | IFiberRefLocally<any, any, any, any, any>
  | IFiberRefDelete<any, any>
  | IFiberRefWith<any, any, any, any, any>
  | ISetRuntimeConfig

export class IFlatMap<R, E, A, R1, E1, A1> extends Base<R | R1, E | E1, A1> {
  readonly _tag = "FlatMap"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly k: (a: A) => Effect<R1, E1, A1>,
    readonly trace?: string
  ) {
    super()
  }

  apply(a: A): Effect<R1, E1, A1> {
    return this.k(a)
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class ISucceed<A> extends Base<never, never, A> {
  readonly _tag = "Succeed"

  constructor(readonly value: A, readonly trace?: string) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class ISync<A> extends Base<never, never, A> {
  readonly _tag = "Sync"

  constructor(readonly effect: Lazy<A>, readonly trace?: string) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class ISucceedWith<A> extends Base<never, never, A> {
  readonly _tag = "SucceedWith"

  constructor(
    readonly effect: (runtimeConfig: RuntimeConfig, id: FiberId) => A,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class ISuspend<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Suspend"

  constructor(readonly make: Lazy<Effect<R, E, A>>, readonly trace?: string) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class ISuspendWith<R, E, A> extends Base<R, E, A> {
  readonly _tag = "SuspendWith"

  constructor(
    readonly make: (runtimeConfig: RuntimeConfig, id: FiberId) => Effect<R, E, A>,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IAsync<R, E, A> extends Base<R, E, A> {
  readonly _tag = "Async"

  constructor(
    readonly register: (
      cb: (_: Effect<R, E, A>) => void
    ) => Either<Effect<R, never, void>, Effect<R, E, A>>,
    readonly blockingOn: Lazy<FiberId>,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IFold<R, E, A, R2, E2, A2, R3, E3, A3> extends Base<
  R | R2 | R3,
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

  apply(a: A): Effect<R3, E3, A3> {
    return this.success(a)
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IFork<R, E, A> extends Base<R, never, Fiber.Runtime<E, A>> {
  readonly _tag = "Fork"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly scope: Lazy<Maybe<FiberScope>>,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IInterruptStatus<R, E, A> extends Base<R, E, A> {
  readonly _tag = "InterruptStatus"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly flag: Lazy<InterruptStatus>,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
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

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IFail<E> extends Base<never, E, never> {
  readonly _tag = "Fail"

  constructor(readonly cause: Lazy<Cause<E>>, readonly trace?: string) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
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

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IYield extends Base<never, never, void> {
  readonly _tag = "Yield"

  constructor(readonly trace?: string) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IFiberRefModifyAll<A> extends Base<never, never, A> {
  readonly _tag = "FiberRefModifyAll"

  constructor(
    readonly f: (fiberId: FiberId.Runtime, fiberRefs: FiberRefs) => Tuple<[A, FiberRefs]>,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IFiberRefModify<A, B, P> extends Base<never, never, B> {
  readonly _tag = "FiberRefModify"

  constructor(
    readonly fiberRef: FiberRef.WithPatch<A, P>,
    readonly f: (a: A) => Tuple<[B, A]>,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IFiberRefLocally<V, R, E, A, P> extends Base<R, E, A> {
  readonly _tag = "FiberRefLocally"

  constructor(
    readonly localValue: V,
    readonly fiberRef: FiberRef.WithPatch<V, P>,
    readonly effect: Effect<R, E, A>,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IFiberRefDelete<A, P> extends Base<never, never, void> {
  readonly _tag = "FiberRefDelete"

  constructor(readonly fiberRef: FiberRef.WithPatch<A, P>, readonly trace?: string) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IFiberRefWith<R, E, A, B, P> extends Base<R, E, B> {
  readonly _tag = "FiberRefWith"

  constructor(
    readonly fiberRef: FiberRef.WithPatch<A, P>,
    readonly f: (a: A) => Effect<R, E, B>,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class ITrace extends Base<never, never, Trace> {
  readonly _tag = "Trace"

  constructor(readonly trace?: string) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IRaceWith<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3> extends Base<
  R | R1 | R2 | R3,
  E2 | E3,
  A2 | A3
> {
  readonly _tag = "RaceWith"

  constructor(
    readonly left: Lazy<Effect<R, E, A>>,
    readonly right: Lazy<Effect<R1, E1, A1>>,
    readonly leftWins: (winner: Fiber<E, A>, loser: Fiber<E1, A1>) => Effect<R2, E2, A2>,
    readonly rightWins: (winner: Fiber<E1, A1>, loser: Fiber<E, A>) => Effect<R3, E3, A3>,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
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

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IGetForkScope<R, E, A> extends Base<R, E, A> {
  readonly _tag = "GetForkScope"

  constructor(readonly f: (_: FiberScope) => Effect<R, E, A>, readonly trace?: string) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IOverrideForkScope<R, E, A> extends Base<R, E, A> {
  readonly _tag = "OverrideForkScope"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly forkScope: Maybe<FiberScope>,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class IEnsuring<R, R1, E, A> extends Base<R, E, A> {
  readonly _tag = "Ensuring"

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly finalizer: Effect<R1, never, unknown>,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class ILogged<A> extends Base<never, never, void> {
  readonly _tag = "Logged"

  constructor(
    readonly message: Lazy<A>,
    readonly cause: Lazy<Cause<unknown>>,
    readonly overrideLogLevel: Maybe<LogLevel> = Maybe.none,
    readonly overrideRef1: FiberRef.WithPatch<unknown, unknown> | null = null,
    readonly overrideValue1: unknown = null,
    readonly trace?: string
  ) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

export class ISetRuntimeConfig extends Base<never, never, void> {
  readonly _tag = "SetRuntimeConfig"

  constructor(readonly runtimeConfig: RuntimeConfig, readonly trace?: string) {
    super()
  }

  unsafeLog() {
    return `${this._tag} at ${this.trace}`
  }
}

/**
 * @tsplus macro identity
 */
export function instruction<R, E, A>(self: Effect<R, E, A>): Instruction {
  // @ts-expect-error
  return self
}
