import type { ErasedChannel, ErasedExecutor } from "@effect/core/stream/Channel/ChannelExecutor"
import type { ChildExecutorDecision } from "@effect/core/stream/Channel/ChildExecutorDecision"
import type { UpstreamPullRequest } from "@effect/core/stream/Channel/UpstreamPullRequest"
import type { UpstreamPullStrategy } from "@effect/core/stream/Channel/UpstreamPullStrategy"

export const SubexecutorSym = Symbol.for("@effect/core/stream/Channel/Subexecutor")
export type SubexecutorSym = typeof SubexecutorSym

/**
 * @tsplus type ets/Channel/Subexecutor
 */
export interface Subexecutor<R> {
  readonly [SubexecutorSym]: SubexecutorSym
  readonly close: (
    exit: Exit<unknown, unknown>,
    __tsplusTrace?: string
  ) => Effect<R, never, unknown> | undefined
  readonly enqueuePullFromChild: (child: PullFromChild<R>) => Subexecutor<R>
}

/**
 * @tsplus type ets/Channel/Subexecutor/Ops
 */
export interface SubexecutorOps {}
export const Subexecutor: SubexecutorOps = {}

/**
 * Execute upstreamExecutor and for each emitted element, spawn a child
 * channel and continue with processing it by `PullFromChild`.
 */
export class PullFromUpstream<R> implements Subexecutor<R> {
  readonly _tag = "PullFromUpstream"

  readonly [SubexecutorSym]: SubexecutorSym = SubexecutorSym

  constructor(
    readonly upstreamExecutor: ErasedExecutor<R>,
    readonly createChild: (_: unknown) => ErasedChannel<R>,
    readonly lastDone: unknown,
    readonly activeChildExecutors: ImmutableQueue<PullFromChild<R> | undefined>,
    readonly combineChildResults: (x: unknown, y: unknown) => unknown,
    readonly combineWithChildResult: (x: unknown, y: unknown) => unknown,
    readonly onPull: (_: UpstreamPullRequest<unknown>) => UpstreamPullStrategy<unknown>,
    readonly onEmit: (_: unknown) => ChildExecutorDecision
  ) {}

  close(
    exit: Exit<unknown, unknown>,
    __tsplusTrace?: string
  ): Effect<R, never, unknown> | undefined {
    const fin1 = this.upstreamExecutor.close(exit)
    const fins = this.activeChildExecutors
      .map((child) => (child != null ? child.childExecutor.close(exit) : undefined))
      .append(fin1)
    const result = fins.reduce(
      undefined as Effect<R, never, Exit<unknown, unknown>> | undefined,
      (acc, next) => {
        if (acc != null && next != null) {
          return acc.zipWith(next.exit(), (a, b) => a > b)
        } else if (acc != null) {
          return acc
        } else if (next != null) {
          return next.exit()
        } else {
          return undefined
        }
      }
    )
    return result == null ? result : result.flatMap((exit) => Effect.done(exit)) as Effect<R, never, unknown>
  }

  enqueuePullFromChild(child: PullFromChild<R>): Subexecutor<R> {
    return new PullFromUpstream(
      this.upstreamExecutor,
      this.createChild,
      this.lastDone,
      this.activeChildExecutors.append(child),
      this.combineChildResults,
      this.combineWithChildResult,
      this.onPull,
      this.onEmit
    )
  }
}

/**
 * Execute the childExecutor and on each emitted value, decide what to do by
 * `onEmit`.
 */
export class PullFromChild<R> implements Subexecutor<R> {
  readonly _tag = "PullFromChild"

  readonly [SubexecutorSym]: SubexecutorSym = SubexecutorSym

  constructor(
    readonly childExecutor: ErasedExecutor<R>,
    readonly parentSubexecutor: Subexecutor<R>,
    readonly onEmit: (_: unknown) => ChildExecutorDecision
  ) {}

  close(
    exit: Exit<unknown, unknown>,
    __tsplusTrace?: string
  ): Effect<R, never, unknown> | undefined {
    const fin1 = this.childExecutor.close(exit)
    const fin2 = this.parentSubexecutor.close(exit)

    if (fin1 != null && fin2 != null) {
      return fin1
        .exit()
        .zipWith(fin2.exit(), (a, b) => a > b)
        .flatMap((exit) => Effect.done(exit))
    } else if (fin1 != null) {
      return fin1
    } else if (fin2 != null) {
      return fin2
    } else {
      return undefined
    }
  }

  enqueuePullFromChild(_: PullFromChild<R>): Subexecutor<R> {
    return this
  }
}

export class DrainChildExecutors<R> implements Subexecutor<R> {
  readonly _tag = "DrainChildExecutors"

  readonly [SubexecutorSym]: SubexecutorSym = SubexecutorSym

  constructor(
    readonly upstreamExecutor: ErasedExecutor<R>,
    readonly lastDone: unknown,
    readonly activeChildExecutors: ImmutableQueue<PullFromChild<R> | undefined>,
    readonly upstreamDone: Exit<unknown, unknown>,
    readonly combineChildResults: (x: unknown, y: unknown) => unknown,
    readonly combineWithChildResult: (x: unknown, y: unknown) => unknown,
    readonly onPull: (_: UpstreamPullRequest<unknown>) => UpstreamPullStrategy<unknown>
  ) {}

  close(
    exit: Exit<unknown, unknown>,
    __tsplusTrace?: string
  ): Effect<R, never, unknown> | undefined {
    const fin1 = this.upstreamExecutor.close(exit)
    const fins = this.activeChildExecutors
      .map((child) => (child != null ? child.childExecutor.close(exit) : undefined))
      .append(fin1)

    return fins.reduce(
      undefined as Effect<R, never, Exit<unknown, unknown>> | undefined,
      (acc, next) => {
        if (acc != null && next != null) {
          return acc.zipWith(next.exit(), (a, b) => a > b)
        } else if (acc != null) {
          return acc
        } else if (next != null) {
          return next.exit()
        } else {
          return undefined
        }
      }
    )
  }

  enqueuePullFromChild(child: PullFromChild<R>): Subexecutor<R> {
    return new DrainChildExecutors(
      this.upstreamExecutor,
      this.lastDone,
      this.activeChildExecutors.append(child),
      this.upstreamDone,
      this.combineChildResults,
      this.combineWithChildResult,
      this.onPull
    )
  }
}

export class Emit<R> implements Subexecutor<R> {
  readonly _tag = "Emit"

  readonly [SubexecutorSym]: SubexecutorSym = SubexecutorSym

  constructor(readonly value: unknown, readonly next: Subexecutor<R>) {}

  close(
    exit: Exit<unknown, unknown>,
    __tsplusTrace?: string
  ): Effect<R, never, unknown> | undefined {
    return this.next.close(exit)
  }

  enqueuePullFromChild(_child: PullFromChild<R>): Subexecutor<R> {
    return this
  }
}

/**
 * @tsplus macro remove
 */
export function concreteSubexecutor<R>(
  _: Subexecutor<R>
): asserts _ is
  | PullFromUpstream<R>
  | PullFromChild<R>
  | DrainChildExecutors<R>
  | Emit<R>
{
  //
}

/**
 * @tsplus static ets/Channel/Subexecutor/Ops PullFromUpstream
 */
export function pullFromUpstream<R>(
  upstreamExecutor: ErasedExecutor<R>,
  createChild: (_: unknown) => ErasedChannel<R>,
  lastDone: unknown,
  activeChildExecutors: ImmutableQueue<PullFromChild<R> | undefined>,
  combineChildResults: (x: unknown, y: unknown) => unknown,
  combineWithChildResult: (x: unknown, y: unknown) => unknown,
  onPull: (_: UpstreamPullRequest<unknown>) => UpstreamPullStrategy<unknown>,
  onEmit: (_: unknown) => ChildExecutorDecision
): Subexecutor<R> {
  return new PullFromUpstream(
    upstreamExecutor,
    createChild,
    lastDone,
    activeChildExecutors,
    combineChildResults,
    combineWithChildResult,
    onPull,
    onEmit
  )
}

/**
 * @tsplus static ets/Channel/Subexecutor/Ops PullFromChild
 */
export function pullFromChild<R>(
  childExecutor: ErasedExecutor<R>,
  parentSubexecutor: Subexecutor<R>,
  onEmit: (_: unknown) => ChildExecutorDecision
): Subexecutor<R> {
  return new PullFromChild(childExecutor, parentSubexecutor, onEmit)
}

/**
 * @tsplus static ets/Channel/Subexecutor/Ops DrainChildExecutors
 */
export function drainChildExecutors<R>(
  upstreamExecutor: ErasedExecutor<R>,
  lastDone: unknown,
  activeChildExecutors: ImmutableQueue<PullFromChild<R> | undefined>,
  upstreamDone: Exit<unknown, unknown>,
  combineChildResults: (x: unknown, y: unknown) => unknown,
  combineWithChildResult: (x: unknown, y: unknown) => unknown,
  onPull: (_: UpstreamPullRequest<unknown>) => UpstreamPullStrategy<unknown>
): Subexecutor<R> {
  return new DrainChildExecutors(
    upstreamExecutor,
    lastDone,
    activeChildExecutors,
    upstreamDone,
    combineChildResults,
    combineWithChildResult,
    onPull
  )
}

/**
 * @tsplus static ets/Channel/Subexecutor/Ops Emit
 */
export function emit<R>(value: unknown, next: Subexecutor<R>): Subexecutor<R> {
  return new Emit(value, next)
}
