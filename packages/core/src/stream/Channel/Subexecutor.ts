import type { RIO } from "../../io/Effect"
import { Effect } from "../../io/Effect"
import type { Exit } from "../../io/Exit"
import type { ImmutableQueue } from "../../support/ImmutableQueue"
import type { ErasedChannel, ErasedExecutor } from "./ChannelExecutor"
import type { ChildExecutorDecision } from "./ChildExecutorDecision"
import type { UpstreamPullRequest } from "./UpstreamPullRequest"
import type { UpstreamPullStrategy } from "./UpstreamPullStrategy"

export const SubexecutorSym = Symbol.for("@effect-ts/core/stream/Channel/Subexecutor")
export type SubexecutorSym = typeof SubexecutorSym

/**
 * @tsplus type ets/Channel/Subexecutor
 */
export interface Subexecutor<R> {
  readonly [SubexecutorSym]: SubexecutorSym
  readonly close: (
    exit: Exit<unknown, unknown>,
    __tsplusTrace?: string
  ) => RIO<R, unknown> | undefined
  readonly enqueuePullFromChild: (child: PullFromChild<R>) => Subexecutor<R>
}

/**
 * @tsplus type ets/Channel/SubexecutorOps
 */
export interface SubexecutorOps {}
export const Subexecutor: SubexecutorOps = {}

export const PullFromUpstreamTypeId = Symbol.for(
  "@effect-ts/core/stream/Channel/Subexecutor/PullFromUpstream"
)
export type PullFromUpstreamTypeId = typeof PullFromUpstreamTypeId

/**
 * Execute upstreamExecutor and for each emitted element, spawn a child
 * channel and continue with processing it by `PullFromChild`.
 */
export class PullFromUpstream<R> implements Subexecutor<R> {
  readonly _typeId: PullFromUpstreamTypeId = PullFromUpstreamTypeId;

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
  ): RIO<R, unknown> | undefined {
    const fin1 = this.upstreamExecutor.close(exit)
    const fins = this.activeChildExecutors
      .map((child) => (child != null ? child.childExecutor.close(exit) : undefined))
      .push(fin1)

    return fins.reduce<RIO<R, Exit<never, unknown>> | undefined>(
      undefined,
      (acc, next) => {
        if (acc != null && next != null) {
          return acc.zipWith(next.exit(), (a, b) => a > b)
        } else if (acc != null) {
          return acc.exit()
        } else if (next != null) {
          return next.exit()
        } else {
          return undefined
        }
      }
    )
  }

  enqueuePullFromChild(child: PullFromChild<R>): Subexecutor<R> {
    return new PullFromUpstream(
      this.upstreamExecutor,
      this.createChild,
      this.lastDone,
      this.activeChildExecutors.push(child),
      this.combineChildResults,
      this.combineWithChildResult,
      this.onPull,
      this.onEmit
    )
  }
}

export const PullFromChildTypeId = Symbol.for(
  "@effect-ts/core/stream/Channel/Subexecutor/PullFromChild"
)
export type PullFromChildTypeId = typeof PullFromChildTypeId

/**
 * Execute the childExecutor and on each emitted value, decide what to do by
 * `onEmit`.
 */
export class PullFromChild<R> implements Subexecutor<R> {
  readonly _typeId: PullFromChildTypeId = PullFromChildTypeId;

  readonly [SubexecutorSym]: SubexecutorSym = SubexecutorSym

  constructor(
    readonly childExecutor: ErasedExecutor<R>,
    readonly parentSubexecutor: Subexecutor<R>,
    readonly onEmit: (_: unknown) => ChildExecutorDecision
  ) {}

  close(
    exit: Exit<unknown, unknown>,
    __tsplusTrace?: string
  ): RIO<R, unknown> | undefined {
    const fin1 = this.childExecutor.close(exit)
    const fin2 = this.parentSubexecutor.close(exit)

    if (fin1 == null && fin2 == null) {
      return undefined
    } else if (fin1 != null && fin2 != null) {
      return fin1
        .exit()
        .zipWith(fin2.exit(), (a, b) => a > b)
        .flatMap((exit) => Effect.done(exit))
    } else if (fin1 != null) {
      return fin1
    } else {
      return fin2
    }
  }

  enqueuePullFromChild(_: PullFromChild<R>): Subexecutor<R> {
    return this
  }
}

export const DrainChildExecutorsTypeId = Symbol.for(
  "@effect-ts/core/stream/Channel/Subexecutor/DrainChildExecutors"
)
export type DrainChildExecutorsTypeId = typeof DrainChildExecutorsTypeId

export class DrainChildExecutors<R> implements Subexecutor<R> {
  readonly _typeId: DrainChildExecutorsTypeId = DrainChildExecutorsTypeId;

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
  ): RIO<R, unknown> | undefined {
    const fin1 = this.upstreamExecutor.close(exit)
    const fins = this.activeChildExecutors
      .map((child) => (child != null ? child.childExecutor.close(exit) : undefined))
      .push(fin1)

    return fins.reduce<RIO<R, Exit<unknown, unknown>> | undefined>(
      undefined,
      (acc, next) => {
        if (acc != null && next != null) {
          return acc.zipWith(next.exit(), (a, b) => a > b)
        } else if (acc != null) {
          return acc.exit()
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
      this.activeChildExecutors.push(child),
      this.upstreamDone,
      this.combineChildResults,
      this.combineWithChildResult,
      this.onPull
    )
  }
}

export const SubexecutorEmitTypeId = Symbol.for(
  "@effect-ts/core/stream/Channel/Subexecutor/Emit"
)
export type SubexecutorEmitTypeId = typeof SubexecutorEmitTypeId

export class Emit<R> implements Subexecutor<R> {
  readonly _typeId: SubexecutorEmitTypeId = SubexecutorEmitTypeId;

  readonly [SubexecutorSym]: SubexecutorSym = SubexecutorSym

  constructor(readonly value: unknown, readonly next: Subexecutor<R>) {}

  close(
    exit: Exit<unknown, unknown>,
    __tsplusTrace?: string
  ): RIO<R, unknown> | undefined {
    return this.next.close(exit)
  }

  enqueuePullFromChild(child: PullFromChild<R>): Subexecutor<R> {
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
  | Emit<R> {
  //
}

/**
 * @tsplus static ets/Channel/SubexecutorOps PullFromUpstream
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
 * @tsplus static ets/Channel/SubexecutorOps PullFromChild
 */
export function pullFromChild<R>(
  childExecutor: ErasedExecutor<R>,
  parentSubexecutor: Subexecutor<R>,
  onEmit: (_: unknown) => ChildExecutorDecision
): Subexecutor<R> {
  return new PullFromChild(childExecutor, parentSubexecutor, onEmit)
}

/**
 * @tsplus static ets/Channel/SubexecutorOps DrainChildExecutors
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
 * @tsplus static ets/Channel/SubexecutorOps Emit
 */
export function emit<R>(value: unknown, next: Subexecutor<R>): Subexecutor<R> {
  return new Emit(value, next)
}
