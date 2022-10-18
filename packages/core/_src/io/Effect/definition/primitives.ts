import { runtimeDebug } from "@effect/core/io/Debug"
import type { Effect } from "@effect/core/io/Effect/definition/base"
import { EffectURI } from "@effect/core/io/Effect/definition/base"
import type { FiberRuntime } from "@effect/core/io/Fiber/_internal/runtime"
import type { Running } from "@effect/core/io/Fiber/status"
import { SingleShotGen } from "@effect/core/support/SingleShotGen"

export type ErasedEffect =
  | ISync<any>
  | IAsync<any, any, any>
  | IOnSuccessAndFailure<any, any, any, any, any, any, any, any, any>
  | IOnSuccess<any, any, any, any, any, any>
  | IOnFailure<any, any, any, any, any, any>
  | IUpdateRuntimeFlags
  | IUpdateRuntimeFlagsDynamic<any, any, any>
  | IStateful<any, any, any>
  | IWhileLoop<any, any, any>
  | IYieldNow
  | IFailure<any>
  | ISuccess<any>
  | ICommit<any, any, any>

export class ISync<A> implements Effect<never, never, A> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "Sync"
  constructor(readonly evaluate: () => A, readonly trace?: string) {}
  _call(trace: string | undefined): Effect<never, never, A> {
    return new ISync(this.evaluate, trace)
  }

  [Symbol.iterator](): Generator<this, ReturnType<this[EffectURI]["_A"]>, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export interface ICommit<R, E, A> extends Effect<R, E, A> {
  readonly _tag: "ICommit"
  readonly commit: Effect<R, E, A>
}

export class IAsync<R, E, A> implements Effect<R, E, A> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "Async"
  constructor(
    readonly register: (resume: (effect: Effect<R, E, A>) => void) => void,
    readonly blockingOn: FiberId,
    readonly trace?: string
  ) {}
  _call(trace: string | undefined): Effect<R, E, A> {
    return new IAsync(this.register, this.blockingOn, trace)
  }
  [Symbol.iterator](): Generator<this, ReturnType<this[EffectURI]["_A"]>, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class IOnSuccessAndFailure<R, E, A, R1, E1, B, R2, E2, C>
  implements Effect<R | R1 | R2, E1 | E2, B | C>
{
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "OnSuccessAndFailure"
  constructor(
    readonly first: Effect<R, E, A>,
    readonly successK: (a: A) => Effect<R1, E1, B>,
    readonly failK: (e: Cause<E>) => Effect<R2, E2, C>,
    readonly trace?: string
  ) {}
  _call(trace: string | undefined): Effect<R | R1 | R2, E1 | E2, B | C> {
    return new IOnSuccessAndFailure(this.first, this.successK, this.failK, trace)
  }
  [Symbol.iterator](): Generator<this, ReturnType<this[EffectURI]["_A"]>, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class IOnSuccess<R, E, A, R1, E1, B> implements Effect<R | R1, E | E1, B> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "OnSuccess"
  constructor(
    readonly first: Effect<R, E, A>,
    readonly successK: (a: A) => Effect<R1, E1, B>,
    readonly trace?: string
  ) {}
  _call(trace: string | undefined): Effect<R | R1, E | E1, B> {
    return new IOnSuccess(this.first, this.successK, trace)
  }
  [Symbol.iterator](): Generator<this, ReturnType<this[EffectURI]["_A"]>, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class IOnFailure<R, E, A, R1, E1, B> implements Effect<R | R1, E1, A | B> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "OnFailure"
  constructor(
    readonly first: Effect<R, E, A>,
    readonly failK: (a: Cause<E>) => Effect<R1, E1, B>,
    readonly trace?: string
  ) {}
  _call(trace: string | undefined): Effect<R | R1, E1, A | B> {
    return new IOnFailure(this.first, this.failK, trace)
  }
  [Symbol.iterator](): Generator<this, ReturnType<this[EffectURI]["_A"]>, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class IUpdateRuntimeFlags implements Effect<never, never, void> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "UpdateRuntimeFlags"
  constructor(
    readonly update: RuntimeFlags.Patch,
    readonly trace?: string
  ) {}
  _call(trace: string | undefined): Effect<never, never, void> {
    return new IUpdateRuntimeFlags(this.update, trace)
  }
  [Symbol.iterator](): Generator<this, ReturnType<this[EffectURI]["_A"]>, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class IUpdateRuntimeFlagsDynamic<R, E, A> implements Effect<R, E, A> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "UpdateRuntimeFlagsWithin"
  constructor(
    readonly update: RuntimeFlags.Patch,
    readonly scope: (oldRuntimeFlags: RuntimeFlags) => Effect<R, E, A>,
    readonly trace?: string
  ) {}
  _call(trace: string | undefined): Effect<R, E, A> {
    return new IUpdateRuntimeFlagsDynamic(this.update, this.scope, trace)
  }
  [Symbol.iterator](): Generator<this, ReturnType<this[EffectURI]["_A"]>, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class IUpdateRuntimeFlagsInterruptible<R, E, A>
  implements IUpdateRuntimeFlagsDynamic<R, E, A>
{
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "UpdateRuntimeFlagsWithin"
  readonly update: RuntimeFlags.Patch = RuntimeFlags.Patch.enable(RuntimeFlags.Interruption)
  readonly scope: (oldRuntimeFlags: RuntimeFlags) => Effect<R, E, A> = () => this.effect
  constructor(
    readonly effect: Effect<R, E, A>,
    readonly trace?: string
  ) {}
  _call(trace: string | undefined): Effect<R, E, A> {
    return new IUpdateRuntimeFlagsInterruptible(this.effect, trace)
  }
  [Symbol.iterator](): Generator<this, ReturnType<this[EffectURI]["_A"]>, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class IUpdateRuntimeFlagsUninterruptible<R, E, A>
  implements IUpdateRuntimeFlagsDynamic<R, E, A>
{
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "UpdateRuntimeFlagsWithin"
  readonly update: RuntimeFlags.Patch = RuntimeFlags.Patch.disable(RuntimeFlags.Interruption)
  readonly scope: (oldRuntimeFlags: RuntimeFlags) => Effect<R, E, A> = () => this.effect
  constructor(
    readonly effect: Effect<R, E, A>,
    readonly trace?: string
  ) {}
  _call(trace: string | undefined): Effect<R, E, A> {
    return new IUpdateRuntimeFlagsUninterruptible(this.effect, trace)
  }
  [Symbol.iterator](): Generator<this, ReturnType<this[EffectURI]["_A"]>, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class IStateful<R, E, A> implements Effect<R, E, A> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "Stateful"
  constructor(
    readonly onState: (fiber: FiberRuntime<E, A>, status: Running) => Effect<R, E, A>,
    readonly trace?: string
  ) {}
  _call(trace: string | undefined): Effect<R, E, A> {
    return new IStateful(this.onState, trace)
  }
  [Symbol.iterator](): Generator<this, ReturnType<this[EffectURI]["_A"]>, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class IWhileLoop<R, E, A> implements Effect<R, E, void> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "WhileLoop"
  constructor(
    readonly check: () => boolean,
    readonly body: () => Effect<R, E, A>,
    readonly process: (a: A) => void,
    readonly trace?: string
  ) {}
  _call(trace: string | undefined): Effect<R, E, void> {
    return new IWhileLoop(this.check, this.body, this.process, trace)
  }
  [Symbol.iterator](): Generator<Effect<R, E, void>, void, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class IYieldNow implements Effect<never, never, void> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "YieldNow"
  constructor(
    readonly trace?: string
  ) {}
  _call(trace: string | undefined): Effect<never, never, void> {
    return new IYieldNow(trace)
  }
  [Symbol.iterator](): Generator<this, ReturnType<this[EffectURI]["_A"]>, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class IFailure<E> implements Effect<never, E, never> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "Failure"
  constructor(readonly cause: Cause<E>, readonly trace?: string) {}
  [Hash.sym](): number {
    return Hash.unknown(this.cause)
  }
  [Equals.sym](that: unknown): boolean {
    return that instanceof IFailure && Equals.equals(this.cause, that.cause)
  }
  _call(trace: string | undefined): Effect<never, E, never> {
    return new IFailure(this.cause, trace)
  }
  [Symbol.iterator](): Generator<this, never, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class ISuccess<A> implements Effect<never, never, A> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "Success"
  constructor(readonly value: A, readonly trace?: string) {}
  [Hash.sym](): number {
    return Hash.unknown(this.value)
  }
  [Equals.sym](that: unknown): boolean {
    return that instanceof ISuccess && Equals.equals(this.value, that.value)
  }
  _call(trace: string | undefined): Effect<never, never, A> {
    return new ISuccess(this.value, trace)
  }
  [Symbol.iterator](): Generator<this, ReturnType<this[EffectURI]["_A"]>, any> {
    return new SingleShotGen<this, never>(this)
  }
}

//
// Tracing
//

export const callTraceSymbol = Symbol.for("@effect/core/io/Effect/CallTrace")

let handoff: string | undefined = undefined

const cleanup = <A>(x: A) => {
  handoff = undefined
  return x
}

export function withCallTrace(trace: string) {
  if (runtimeDebug.traceEnabled && !runtimeDebug.traceAlwaysViaExtractor) {
    handoff = trace
  }
  return cleanup
}

const orUndefined = (trace: string | undefined) => {
  if (trace && runtimeDebug.traceFilter(trace)) {
    return trace
  }
  return undefined
}

export function getCallTrace() {
  if (!runtimeDebug.traceEnabled) {
    return
  }
  if (runtimeDebug.traceAlwaysViaExtractor) {
    if (runtimeDebug.traceExtractor) {
      return orUndefined(runtimeDebug.traceExtractor(4))
    }
    return
  }
  const trace = handoff
  handoff = undefined
  if (!trace) {
    if (runtimeDebug.traceExtractor) {
      return orUndefined(runtimeDebug.traceExtractor(4))
    }
  }
  return orUndefined(trace)
}
