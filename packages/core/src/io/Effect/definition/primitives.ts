import type { Effect } from "@effect/core/io/Effect/definition/base"
import { EffectURI } from "@effect/core/io/Effect/definition/base"
import type { FiberRuntime } from "@effect/core/io/Fiber/_internal/runtime"
import type { Running } from "@effect/core/io/Fiber/status"
import * as Equal from "@fp-ts/data/Equal"

/**
 * @category model
 * @since 1.0.0
 */
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

/**
 * @category model
 * @since 1.0.0
 */
export class ISync<A> implements Effect<never, never, A> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "Sync"
  constructor(readonly evaluate: () => A) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export interface ICommit<R, E, A> extends Effect<R, E, A> {
  readonly _tag: "ICommit"
  readonly commit: Effect<R, E, A>
}

/**
 * @category model
 * @since 1.0.0
 */
export class IAsync<R, E, A> implements Effect<R, E, A> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "Async"
  constructor(
    readonly register: (resume: (effect: Effect<R, E, A>) => void) => void,
    readonly blockingOn: FiberId
  ) {}
}

/**
 * @category model
 * @since 1.0.0
 */
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
    readonly failK: (e: Cause<E>) => Effect<R2, E2, C>
  ) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class IOnSuccess<R, E, A, R1, E1, B> implements Effect<R | R1, E | E1, B> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "OnSuccess"
  constructor(
    readonly first: Effect<R, E, A>,
    readonly successK: (a: A) => Effect<R1, E1, B>
  ) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class IOnFailure<R, E, A, R1, E1, B> implements Effect<R | R1, E1, A | B> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "OnFailure"
  constructor(
    readonly first: Effect<R, E, A>,
    readonly failK: (a: Cause<E>) => Effect<R1, E1, B>
  ) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class IUpdateRuntimeFlags implements Effect<never, never, void> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "UpdateRuntimeFlags"
  constructor(
    readonly update: RuntimeFlags.Patch
  ) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class IUpdateRuntimeFlagsDynamic<R, E, A> implements Effect<R, E, A> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "UpdateRuntimeFlagsWithin"
  constructor(
    readonly update: RuntimeFlags.Patch,
    readonly scope: (oldRuntimeFlags: RuntimeFlags) => Effect<R, E, A>
  ) {}
}

/**
 * @category model
 * @since 1.0.0
 */
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
    readonly effect: Effect<R, E, A>
  ) {}
}

/**
 * @category model
 * @since 1.0.0
 */
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
    readonly effect: Effect<R, E, A>
  ) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class IStateful<R, E, A> implements Effect<R, E, A> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "Stateful"
  constructor(
    readonly onState: (fiber: FiberRuntime<E, A>, status: Running) => Effect<R, E, A>
  ) {}
}

/**
 * @category model
 * @since 1.0.0
 */
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
    readonly process: (a: A) => void
  ) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class IYieldNow implements Effect<never, never, void> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "YieldNow"
}

/**
 * @category model
 * @since 1.0.0
 */
export class IFailure<E> implements Effect<never, E, never> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "Failure"
  constructor(readonly cause: Cause<E>) {}
  [Equal.symbolHash](): number {
    return Equal.hash(this.cause)
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return that instanceof IFailure && Equal.equals(this.cause, that.cause)
  }
}

/**
 * @category model
 * @since 1.0.0
 */
export class ISuccess<A> implements Effect<never, never, A> {
  readonly [EffectURI] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  readonly _tag = "Success"
  constructor(readonly value: A) {}
  [Equal.symbolHash](): number {
    return Equal.hash(this.value)
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return that instanceof ISuccess && Equal.equals(this.value, that.value)
  }
}
