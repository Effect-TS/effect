import { Chunk } from "../../../collection/immutable/Chunk"
import { HashSet } from "../../../collection/immutable/HashSet"
import type { List } from "../../../collection/immutable/List"
import { Either } from "../../../data/Either"
import type { Lazy } from "../../../data/Function"
import { constVoid } from "../../../data/Function"
import { LazyValue } from "../../../data/LazyValue"
import { Option } from "../../../data/Option"
import { Stack } from "../../../data/Stack"
import { Supervisor } from "../../../io/Supervisor"
import type { XPure } from "../../../io-light/XPure"
import { AtomicBoolean } from "../../../support/AtomicBoolean"
import { AtomicReference } from "../../../support/AtomicReference"
import { defaultScheduler } from "../../../support/Scheduler"
import * as StackTraceBuilder from "../../../support/StackTraceBuilder"
import { _A, _E } from "../../../support/Symbols"
import { Cause, InterruptedException } from "../../Cause"
import { Effect } from "../../Effect"
import type {
  IAsync,
  IFold,
  Instruction,
  IRaceWith
} from "../../Effect/definition/primitives"
import { EffectError, instruction } from "../../Effect/definition/primitives"
import { Exit } from "../../Exit"
import { FiberId } from "../../FiberId"
import type { Runtime as RuntimeFiberRef } from "../../FiberRef"
import { FiberRef } from "../../FiberRef"
import { InterruptStatus } from "../../InterruptStatus"
import { LogLevel } from "../../LogLevel"
import { Metric } from "../../Metrics"
import { concreteCounter } from "../../Metrics/Counter/operations/_internal/InternalCounter"
import { Boundaries } from "../../Metrics/Histogram"
import { concreteHistogram } from "../../Metrics/Histogram/operations/_internal/InternalHistogram"
import { concreteSetCount } from "../../Metrics/SetCount/operations/_internal/InternalSetCount"
import { Promise } from "../../Promise"
import { RuntimeConfig } from "../../RuntimeConfig"
import { RuntimeConfigFlag } from "../../RuntimeConfig/Flag"
import { Scope } from "../../Scope"
import { Trace } from "../../Trace"
import { TraceElement } from "../../TraceElement"
import type { Fiber } from "../definition"
import { FiberSym } from "../definition"
import { FiberStatus } from "../status"
import { CancelerState } from "./cancelerState"
import type { Callback } from "./fiberState"
import { FiberState } from "./fiberState"

const fiberFailureCauses = new LazyValue(() => {
  const metric = Metric.occurrences("effect_fiber_failure_causes", "class")
  concreteSetCount(metric)
  return metric.setCount!
})
const fiberForkLocations = new LazyValue(() => {
  const metric = Metric.occurrences("effect_fiber_fork", "location")
  concreteSetCount(metric)
  return metric.setCount!
})

const fibersStarted = new LazyValue(() => {
  const metric = Metric.count("effect_fiber_started")
  concreteCounter(metric)
  return metric.counter!
})
const fiberSuccesses = new LazyValue(() => {
  const metric = Metric.count("effect_fiber_successes")
  concreteCounter(metric)
  return metric.counter!
})
const fiberFailures = new LazyValue(() => {
  const metric = Metric.count("effect_fiber_failures")
  concreteCounter(metric)
  return metric.counter!
})

const fiberLifetimes = new LazyValue(() => {
  const fiberLifetimeBoundaries = Boundaries.exponential(1, 2, 100)
  const metric = Metric.observeHistogram(
    "effect_fiber_lifetimes",
    fiberLifetimeBoundaries
  )
  concreteHistogram(metric)
  return metric.histogram!
})

export class InterruptExit {
  readonly _tag = "InterruptExit"
  constructor(
    readonly apply: (a: any) => Effect<any, any, any>,
    readonly trace?: string
  ) {}
}

export class Finalizer {
  readonly _tag = "Finalizer"
  constructor(
    readonly finalizer: Effect<unknown, never, any>,
    readonly handleInterrupts: () => void,
    readonly trace?: string
  ) {}

  apply<X>(a: X): Effect<any, any, any> {
    this.handleInterrupts()
    return this.finalizer.map(() => a, instruction(this.finalizer).trace)
  }
}

export class ApplyFrame {
  readonly _tag = "ApplyFrame"
  constructor(
    readonly apply: <X>(a: Cause<X>) => Effect<any, any, any>,
    readonly trace?: string
  ) {}
}

export type Frame =
  | InterruptExit
  | Finalizer
  | IFold<any, any, any, any, any, any, any, any, any>
  | ApplyFrame

export type FiberRefLocals = Map<FiberRef.Runtime<any>, any>

export const catastrophicFailure = new AtomicBoolean(false)

export const currentFiber = new AtomicReference<FiberContext<any, any> | null>(null)

export class FiberContext<E, A> implements Fiber.Runtime<E, A> {
  readonly _tag = "RuntimeFiber";

  readonly [FiberSym]: FiberSym = FiberSym;
  readonly [_E]: () => E;
  readonly [_A]: () => A

  readonly state = new AtomicReference(FiberState.initial<E, A>())

  asyncEpoch = 0

  stack: Stack<Frame> | undefined = undefined

  nextEffect: Effect<any, any, any> | undefined = undefined

  runtimeConfig: RuntimeConfig

  interruptStatus?: Stack<boolean> | undefined

  constructor(
    readonly _id: FiberId.Runtime,
    readonly fiberRefLocals: FiberRefLocals,
    readonly childFibers: Set<FiberContext<any, any>>,
    runtimeConfig: RuntimeConfig,
    interruptStatus?: Stack<boolean>
  ) {
    this.runtimeConfig = runtimeConfig
    this.interruptStatus = interruptStatus
    if (this.trackMetrics) {
      fibersStarted.value.unsafeIncrement()
      fiberForkLocations.value.unsafeObserve(this._location.stringify())
    }
  }

  // ---------------------------------------------------------------------------
  // Base Fiber
  // ---------------------------------------------------------------------------

  get fiberId(): FiberId {
    return this._id
  }

  get _await(): Effect<unknown, never, Exit<E, A>> {
    return Effect.asyncInterruptBlockingOn<unknown, never, Exit<E, A>>((k) => {
      const cb: Callback<never, Exit<E, A>> = (x) => k(Effect.done(x))
      const result = this.unsafeAddObserverMaybe(cb)

      return result == null
        ? Either.left(Effect.succeed(this.unsafeRemoveObserver(cb)))
        : Either.right(Effect.succeedNow(result))
    }, this.fiberId)
  }

  get _children(): Effect<unknown, never, Chunk<Fiber.Runtime<any, any>>> {
    return this._evalOnEffect(
      Effect.succeed(() => {
        const chunkBuilder = Chunk.builder<Fiber.Runtime<any, any>>()
        for (const child of this.childFibers) {
          chunkBuilder.append(child)
        }
        return chunkBuilder.build()
      }),
      Effect.succeed(Chunk.empty())
    )
  }

  get _inheritRefs(): Effect<unknown, never, void> {
    return Effect.suspendSucceed(
      this.fiberRefLocals.size === 0
        ? Effect.unit
        : Effect.forEachDiscard(this.fiberRefLocals, ([ref, value]) =>
            ref.update((old) => (ref as RuntimeFiberRef<A>).join(old, value))
          )
    )
  }

  get _poll(): Effect<unknown, never, Option<Exit<E, A>>> {
    return Effect.succeed(this.unsafePoll())
  }

  _getRef<K>(ref: FiberRef.Runtime<K>): Effect<unknown, never, K> {
    return Effect.succeed(this.unsafeGetRef(ref))
  }

  _interruptAs(fiberId: FiberId): Effect<unknown, never, Exit<E, A>> {
    return this.unsafeInterruptAs(fiberId)
  }

  // ---------------------------------------------------------------------------
  // Runtime Fiber
  // ---------------------------------------------------------------------------

  _location: TraceElement = this._id.location

  _scope: Scope = Scope.unsafeMake(this)

  get _status(): Effect<unknown, never, FiberStatus> {
    return Effect.succeed(this.state.get.status)
  }

  get _trace(): Effect<unknown, never, Trace> {
    return Effect.succeed(this.unsafeCaptureTrace([]))
  }

  _evalOn(
    effect: Effect<unknown, never, any>,
    orElse: Effect<unknown, never, any>
  ): Effect<unknown, never, any> {
    return Effect.suspendSucceed(
      this.unsafeEvalOn(effect) ? Effect.unit : orElse.asUnit()
    )
  }

  _evalOnEffect<R, E2, A2>(
    effect: Effect<R, E2, A2>,
    orElse: Effect<R, E2, A2>
  ): Effect<R, E2, A2> {
    return Effect.environment<R>().flatMap((environment) =>
      Promise.make<E2, A2>().flatMap((promise) =>
        this._evalOn(
          effect.provideEnvironment(environment).intoPromise(promise),
          orElse.provideEnvironment(environment).intoPromise(promise)
        ).zipRight(promise.await())
      )
    )
  }

  // ---------------------------------------------------------------------------
  // Descriptor
  // ---------------------------------------------------------------------------

  unsafeGetDescriptor(): Fiber.Descriptor {
    return {
      id: this.fiberId,
      status: this.state.get.status,
      interrupters: this.state.get.interruptors,
      interruptStatus: InterruptStatus.fromBoolean(this.unsafeIsInterruptible),
      scope: this._scope
    }
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  get trackMetrics(): boolean {
    return this.runtimeConfig.value.flags.isEnabled(
      RuntimeConfigFlag.TrackRuntimeMetrics
    )
  }

  observeFailure(failure: string): void {
    if (this.trackMetrics) {
      // fiberFailureCauses.unsafeObserve(failure)
    }
  }

  // ---------------------------------------------------------------------------
  // Logging
  // ---------------------------------------------------------------------------

  unsafeLog(message: () => string, trace?: string): void {
    const logLevel = this.unsafeGetRef(FiberRef.currentLogLevel.value)
    const spans = this.unsafeGetRef(FiberRef.currentLogSpan.value)
    const annotations = this.unsafeGetRef(FiberRef.currentLogAnnotations.value)

    this.runtimeConfig.value.logger.apply(
      TraceElement.parse(trace),
      this.fiberId,
      logLevel,
      message,
      () => Cause.empty,
      this.fiberRefLocals,
      spans,
      annotations
    )
  }

  unsafeLogWith(
    message: Lazy<string>,
    cause: Lazy<Cause<any>>,
    overrideLogLevel: Option<LogLevel>,
    overrideRef1: FiberRef.Runtime<any> | null = null,
    overrideValue1: any = null,
    trace?: string
  ): void {
    const logLevel = overrideLogLevel.getOrElse(
      this.unsafeGetRef(FiberRef.currentLogLevel.value)
    )

    const spans = this.unsafeGetRef(FiberRef.currentLogSpan.value)
    const annotations = this.unsafeGetRef(FiberRef.currentLogAnnotations.value)

    const contextMap = new Map(this.fiberRefLocals.entries())
    if (overrideRef1 != null) {
      if (overrideValue1 == null) {
        contextMap.delete(overrideRef1)
      } else {
        contextMap.set(overrideRef1, overrideValue1)
      }
    }

    this.runtimeConfig.value.logger.apply(
      TraceElement.parse(trace),
      this.fiberId,
      logLevel,
      message,
      cause,
      contextMap,
      spans,
      annotations
    )
  }

  // ---------------------------------------------------------------------------
  // Frame
  // ---------------------------------------------------------------------------

  get isStackEmpty(): boolean {
    return !this.stack
  }

  pushContinuation(k: Frame): void {
    this.stack = new Stack(k, this.stack)
  }

  popContinuation(): Frame | undefined {
    if (this.stack) {
      const current = this.stack.value
      this.stack = this.stack.previous
      return current
    }
    return undefined
  }

  unsafeNextEffect(previousSuccess: any): Instruction | undefined {
    if (!this.isStackEmpty) {
      const frame = this.popContinuation()!
      return instruction(
        frame._tag === "Fold"
          ? frame.success(previousSuccess)
          : frame.apply(previousSuccess)
      )
    }
    return this.unsafeTryDone(Exit.succeed(previousSuccess))
  }

  /**
   * Unwinds the stack, leaving the first error handler on the top of the stack
   * (assuming one is found), and returning whether or not some folds had to be
   * discarded (indicating a change in the error type).
   */
  unsafeUnwindStack(): boolean {
    let unwinding = true
    let discardedFolds = false

    // Unwind the stack, looking for an error handler
    while (unwinding && !this.isStackEmpty) {
      const frame = this.popContinuation()!

      switch (frame._tag) {
        case "InterruptExit": {
          this.popInterruptStatus()
          break
        }

        case "Finalizer": {
          // We found a finalizer, we have to immediately disable interruption
          // so the runloop will continue and not abort due to interruption
          this.unsafeDisableInterrupting()

          this.pushContinuation(
            new ApplyFrame((cause) =>
              frame.finalizer.foldCauseEffect(
                (finalizerCause) => {
                  this.popInterruptStatus()
                  this.unsafeAddSuppressed(finalizerCause)
                  return Effect.failCauseNow(cause)
                },
                () => {
                  this.popInterruptStatus()
                  return Effect.failCauseNow(cause)
                }
              )
            )
          )

          unwinding = false

          break
        }

        case "Fold": {
          if (this.unsafeShouldInterrupt) {
            discardedFolds = true
          } else {
            // Push error handler back onto the stack and halt iteration
            this.pushContinuation(new ApplyFrame(frame.failure, frame.trace))

            unwinding = false
          }
          break
        }
      }
    }

    return discardedFolds
  }

  // ---------------------------------------------------------------------------
  // Interruption
  // ---------------------------------------------------------------------------

  interruptExit: InterruptExit = new InterruptExit((v: any) => {
    if (this.unsafeIsInterruptible) {
      this.popInterruptStatus()
      return instruction(Effect.succeedNow(v))
    } else {
      return instruction(
        Effect.succeed(() => {
          this.popInterruptStatus()
          return v
        })
      )
    }
  })

  pushInterruptStatus(flag: boolean): void {
    this.interruptStatus = new Stack(flag, this.interruptStatus)
  }

  popInterruptStatus(): boolean | undefined {
    if (this.interruptStatus) {
      const current = this.interruptStatus.value
      this.interruptStatus = this.interruptStatus.previous
      return current
    }
    return undefined
  }

  private unsafeInterruptAs(fiberId: FiberId): Effect<unknown, never, Exit<E, A>> {
    const interruptedCause = Cause.interrupt(fiberId)

    return Effect.suspendSucceed(() => {
      const oldState = this.state.get

      if (
        oldState._tag === "Executing" &&
        oldState.status._tag === "Suspended" &&
        oldState.status.interruptible &&
        oldState.asyncCanceler._tag === "Registered"
      ) {
        const newState = FiberState.Executing(
          oldState.status.previous.withInterrupting(true),
          oldState.observers,
          oldState.suppressed,
          oldState.interruptors.add(fiberId),
          CancelerState.Empty,
          oldState.mailbox
        )

        this.state.set(newState)

        const interrupt = Effect.failCause(interruptedCause)
        const asyncCanceler = oldState.asyncCanceler.asyncCanceler
        const effect =
          asyncCanceler === Effect.unit ? interrupt : asyncCanceler.zipRight(interrupt)

        this.unsafeRunLater(instruction(effect))
      } else if (oldState._tag === "Executing") {
        const newCause = oldState.suppressed + interruptedCause
        const newState = FiberState.Executing(
          oldState.status,
          oldState.observers,
          newCause,
          oldState.interruptors.add(fiberId),
          oldState.asyncCanceler,
          oldState.mailbox
        )

        this.state.set(newState)
      }

      return this._await
    })
  }

  private unsafeSetInterrupting(value: boolean): void {
    const oldState = this.state.get

    if (oldState._tag === "Executing") {
      this.state.set(
        FiberState.Executing(
          oldState.status.withInterrupting(value),
          oldState.observers,
          oldState.suppressed,
          oldState.interruptors,
          oldState.asyncCanceler,
          oldState.mailbox
        )
      )
    }
  }

  /**
   * Disables interruption for the fiber.
   */
  private unsafeDisableInterrupting(): void {
    this.interruptStatus = new Stack(false, this.interruptStatus)
  }

  private unsafeRestoreInterrupt(): void {
    this.stack = new Stack(this.interruptExit, this.stack)
  }

  get unsafeIsInterrupted(): boolean {
    return this.state.get.interruptors.size > 0
  }

  get unsafeIsInterruptible(): boolean {
    return this.interruptStatus ? this.interruptStatus.value : true
  }

  get unsafeIsInterrupting(): boolean {
    return this.state.get.isInterrupting()
  }

  get unsafeShouldInterrupt(): boolean {
    return (
      this.unsafeIsInterrupted &&
      this.unsafeIsInterruptible &&
      !this.unsafeIsInterrupting
    )
  }

  // ---------------------------------------------------------------------------
  // FiberRefs
  // ---------------------------------------------------------------------------

  unsafeGetRef<A>(fiberRef: FiberRef.Runtime<A>): A {
    return this.fiberRefLocals.get(fiberRef) || (fiberRef as RuntimeFiberRef<A>).initial
  }

  unsafeSetRef<A>(fiberRef: FiberRef.Runtime<A>, value: A): void {
    this.fiberRefLocals.set(fiberRef, value)
  }

  unsafeDeleteRef<A>(fiberRef: FiberRef.Runtime<A>): void {
    this.fiberRefLocals.delete(fiberRef)
  }

  // ---------------------------------------------------------------------------
  // Observers
  // ---------------------------------------------------------------------------

  unsafeAddObserverMaybe(k: Callback<never, Exit<E, A>>): Exit<E, A> | undefined {
    const oldState = this.state.get
    switch (oldState._tag) {
      case "Executing": {
        const observers = oldState.observers.prepend(k)

        this.state.set(
          FiberState.Executing(
            oldState.status,
            observers,
            oldState.suppressed,
            oldState.interruptors,
            oldState.asyncCanceler,
            oldState.mailbox
          )
        )

        return undefined
      }
      case "Done": {
        return oldState.value
      }
    }
  }

  unsafeRemoveObserver(k: Callback<never, Exit<E, A>>): void {
    const oldState = this.state.get

    if (oldState._tag === "Executing") {
      const observers = oldState.observers.filter((o) => o !== k)

      this.state.set(
        FiberState.Executing(
          oldState.status,
          observers,
          oldState.suppressed,
          oldState.interruptors,
          oldState.asyncCanceler,
          oldState.mailbox
        )
      )
    }
  }

  unsafeNotifyObservers(
    v: Exit<E, A>,
    observers: List<Callback<never, Exit<E, A>>>
  ): void {
    if (observers.length > 0) {
      const result = Exit.succeed(v)
      observers.forEach((k) => k(result))
    }
  }

  unsafeReportUnhandled(exit: Exit<E, A>, trace?: string): void {
    if (exit._tag === "Failure") {
      try {
        this.unsafeLogWith(
          () => `Fiber ${this.fiberId.threadName()} did not handle an error`,
          () => exit.cause,
          Option.some(LogLevel.Debug),
          null,
          null,
          trace
        )
      } catch (error) {
        if (this.runtimeConfig.value.fatal(error)) {
          this.runtimeConfig.value.reportFatal(error)
        } else {
          console.log(`An exception was thrown by a logger:\n${error}`)
        }
      }
    }
  }

  private unsafeAddSuppressed(cause: Cause<never>): void {
    if (!cause.isEmpty()) {
      const oldState = this.state.get

      if (oldState._tag === "Executing") {
        const newState = FiberState.Executing(
          oldState.status,
          oldState.observers,
          oldState.suppressed + cause,
          oldState.interruptors,
          oldState.asyncCanceler,
          oldState.mailbox
        )

        this.state.set(newState)
      }
    }
  }

  private unsafeClearSuppressed(): Cause<never> {
    const oldState = this.state.get

    switch (oldState._tag) {
      case "Executing": {
        const newState = FiberState.Executing(
          oldState.status,
          oldState.observers,
          Cause.empty,
          oldState.interruptors,
          oldState.asyncCanceler,
          oldState.mailbox
        )

        this.state.set(newState)

        const interruptorsCause = oldState.interruptorsCause()

        return oldState.suppressed.contains(interruptorsCause)
          ? oldState.suppressed
          : oldState.suppressed + interruptorsCause
      }
      case "Done": {
        return oldState.interruptorsCause()
      }
    }
  }

  unsafeAddChild(child: FiberContext<any, any>): boolean {
    return this.unsafeEvalOn(Effect.succeed(this.childFibers.add(child)))
  }

  unsafePoll(): Option<Exit<E, A>> {
    const state = this.state.get
    return state._tag === "Done" ? Option.some(state.value) : Option.none
  }

  // ---------------------------------------------------------------------------
  // Tracing
  // ---------------------------------------------------------------------------

  unsafeCaptureTrace(prefix: Array<TraceElement>): Trace {
    const builder = StackTraceBuilder.unsafeMake()

    prefix.forEach((_) => builder.append(_))

    if (this.stack != null) {
      const stack = this.stack
      const frames: Array<Frame> = [stack.value]

      let previous = stack.previous
      while (previous != null) {
        frames.unshift(previous.value)
        previous = previous.previous
      }

      frames.forEach((frame) => builder.append(TraceElement.parse(frame.trace)))
    }

    return new Trace(this.fiberId, builder.build())
  }

  // ---------------------------------------------------------------------------
  // Async
  // ---------------------------------------------------------------------------

  unsafeEnterAsync(epoch: number, blockingOn: FiberId, trace: TraceElement): void {
    const oldState = this.state.get

    if (oldState._tag === "Executing" && oldState.asyncCanceler._tag === "Empty") {
      const newStatus = FiberStatus.Suspended(
        oldState.status,
        this.unsafeIsInterruptible && !this.unsafeIsInterrupting,
        blockingOn,
        epoch,
        trace
      )

      const newState = FiberState.Executing(
        newStatus,
        oldState.observers,
        oldState.suppressed,
        oldState.interruptors,
        CancelerState.Pending,
        oldState.mailbox
      )

      this.state.set(newState)
    }
  }

  unsafeExitAsync(epoch: number): boolean {
    const oldState = this.state.get

    if (
      oldState._tag === "Executing" &&
      oldState.status._tag === "Suspended" &&
      oldState.status.epoch === epoch
    ) {
      const newState = FiberState.Executing(
        oldState.status.previous,
        oldState.observers,
        oldState.suppressed,
        oldState.interruptors,
        CancelerState.Empty,
        oldState.mailbox
      )

      this.state.set(newState)

      return true
    }

    return false
  }

  unsafeCreateAsyncResume(epoch: number): (_: Effect<any, any, any>) => void {
    return (effect) => {
      if (this.unsafeExitAsync(epoch)) {
        this.unsafeRunLater(instruction(effect))
      }
    }
  }

  unsafeSetAsyncCanceler(
    epoch: number,
    asyncCanceler0: Effect<any, any, any> | undefined
  ): void {
    const oldState = this.state.get
    const asyncCanceler = asyncCanceler0 == null ? Effect.unit : asyncCanceler0

    if (
      oldState._tag === "Executing" &&
      oldState.status._tag === "Suspended" &&
      oldState.asyncCanceler._tag === "Pending" &&
      epoch === oldState.status.epoch
    ) {
      this.state.set(
        FiberState.Executing(
          oldState.status,
          oldState.observers,
          oldState.suppressed,
          oldState.interruptors,
          CancelerState.Registered(asyncCanceler),
          oldState.mailbox
        )
      )
    }
    if (
      oldState._tag === "Executing" &&
      oldState.status._tag === "Suspended" &&
      oldState.asyncCanceler._tag === "Registered" &&
      epoch === oldState.status.epoch
    ) {
      throw new Error("Bug, inconsistent state in unsafeSetAsyncCanceler")
    }
  }

  // ---------------------------------------------------------------------------
  // Finalizer
  // ---------------------------------------------------------------------------

  unsafeAddFinalizer(finalizer: Effect<unknown, never, any>): void {
    this.pushContinuation(
      new Finalizer(finalizer, () => {
        this.unsafeDisableInterrupting()
        this.unsafeRestoreInterrupt()
      })
    )
  }

  // ---------------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------------

  unsafeEvalOn(effect: Effect<unknown, never, any>): boolean {
    const oldState = this.state.get

    switch (oldState._tag) {
      case "Executing": {
        const newMailbox =
          oldState.mailbox == null ? effect : oldState.mailbox.zipRight(effect)

        this.state.set(
          FiberState.Executing(
            oldState.status,
            oldState.observers,
            oldState.suppressed,
            oldState.interruptors,
            oldState.asyncCanceler,
            newMailbox
          )
        )

        return true
      }
      case "Done": {
        return false
      }
    }
  }

  unsafeTryDone(exit: Exit<E, A>): Instruction | undefined {
    const oldState = this.state.get

    switch (oldState._tag) {
      case "Executing": {
        if (oldState.mailbox != null) {
          // Not done because the mailbox isn't empty
          const newState = FiberState.Executing(
            oldState.status,
            oldState.observers,
            oldState.suppressed,
            oldState.interruptors,
            oldState.asyncCanceler,
            undefined
          )

          this.state.set(newState)

          this.unsafeSetInterrupting(true)

          return instruction(oldState.mailbox.zipRight(Effect.done(exit)))
        } else if (this.childFibers.size === 0) {
          // The mailbox is empty and the _children are shut down
          const interruptorsCause = oldState.interruptorsCause()

          const newExit =
            interruptorsCause === Cause.empty
              ? exit
              : exit.mapErrorCause((cause) =>
                  cause.contains(interruptorsCause) ? cause : cause + interruptorsCause
                )

          //  We are truly "unsafeTryDone" because the scope has been closed
          this.state.set(FiberState.Done(newExit))

          this.unsafeReportUnhandled(newExit)
          this.unsafeNotifyObservers(newExit, oldState.observers)

          const startTimeSeconds = this._id.startTimeSeconds
          const endTimeSeconds = new Date().getTime() / 1000
          const lifetime = endTimeSeconds - startTimeSeconds

          if (this.trackMetrics) {
            fiberLifetimes.value.unsafeObserve(lifetime)
          }

          newExit.fold(
            (cause) => {
              if (this.trackMetrics) {
                fiberFailures.value.unsafeIncrement()
              }

              return cause.fold<E, void>(
                () => fiberFailureCauses.value.unsafeObserve("<empty>"),
                (failure, _) => {
                  this.observeFailure(
                    typeof failure === "object"
                      ? (failure as any).constructor.name
                      : "<anonymous>"
                  )
                },
                (defect, _) => {
                  this.observeFailure(
                    typeof defect === "object"
                      ? (defect as any).constructor.name
                      : "<anonymous>"
                  )
                },
                () => {
                  this.observeFailure("InterruptedException")
                },
                constVoid,
                constVoid,
                constVoid
              )
            },
            () => {
              if (this.trackMetrics) {
                fiberSuccesses.value.unsafeIncrement()
              }
            }
          )

          return undefined
        } else {
          // Not done because there are _children left to close
          this.unsafeSetInterrupting(true)

          let interruptChildren = Effect.unit
          for (const child of this.childFibers) {
            interruptChildren = interruptChildren.zipRight(child._interruptAs(this._id))
          }

          this.childFibers.clear()

          return instruction(interruptChildren.zipRight(Effect.done(exit)))
        }
      }
      case "Done": {
        // Already unsafeTryDone
        return undefined
      }
    }
  }

  unsafeDrainMailbox(): Effect<unknown, never, any> | undefined {
    const oldState = this.state.get

    switch (oldState._tag) {
      case "Executing": {
        const newState = FiberState.Executing(
          oldState.status,
          oldState.observers,
          oldState.suppressed,
          oldState.interruptors,
          oldState.asyncCanceler,
          undefined
        )

        this.state.set(newState)

        return oldState.mailbox
      }
      case "Done": {
        return undefined
      }
    }
  }

  unsafeOnDone(k: Callback<never, Exit<E, A>>): void {
    const result = this.unsafeAddObserverMaybe(k)
    if (result != null) {
      k(Exit.succeed(result))
    }
  }

  /**
   * Forks an `IO` with the specified failure handler.
   */
  unsafeFork(
    effect: Instruction,
    trace: TraceElement,
    forkScope: Option<Scope> = Option.none
  ): FiberContext<any, any> {
    const childFiberRefLocals: FiberRefLocals = new Map<RuntimeFiberRef<any>, any>()

    for (const [k, v] of this.fiberRefLocals) {
      childFiberRefLocals.set(k, (k as RuntimeFiberRef<A>).fork(v))
    }

    const parentScope: Scope = (
      forkScope._tag === "Some"
        ? forkScope
        : this.unsafeGetRef(FiberRef.forkScopeOverride.value)
    ).getOrElse(this._scope)

    const childId = FiberId.unsafeMake(trace)
    const grandChildren = new Set<FiberContext<any, any>>()

    const childContext = new FiberContext(
      childId,
      childFiberRefLocals,
      grandChildren,
      this.runtimeConfig,
      new Stack(this.interruptStatus ? this.interruptStatus.value : true)
    )

    if (this.runtimeConfig.value.supervisor !== Supervisor.none) {
      this.runtimeConfig.value.supervisor.unsafeOnStart(
        this.unsafeGetRef(FiberRef.currentEnvironment.value),
        effect,
        Option.some(this),
        childContext
      )

      childContext.unsafeOnDone((exit) =>
        this.runtimeConfig.value.supervisor.unsafeOnEnd(exit.flatten(), childContext)
      )
    }

    const childEffect = !parentScope.unsafeAdd(this.runtimeConfig, childContext)
      ? Effect.interruptAs(parentScope.fiberId)
      : effect

    childContext.nextEffect = childEffect

    childContext.runUntil(this.runtimeConfig.value.maxOp)

    return childContext
  }

  complete<R, R1, R2, E2, A2, R3, E3, A3>(
    winner: Fiber<any, any>,
    loser: Fiber<any, any>,
    cont: (exit: Exit<any, any>, fiber: Fiber<any, any>) => Effect<any, any, any>,
    winnerExit: Exit<any, any>,
    ab: AtomicReference<boolean>,
    cb: (_: Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3>) => void
  ): void {
    if (ab.compareAndSet(true, false)) {
      winnerExit.fold(
        () => cb(cont(winnerExit, loser)),
        () => cb(winner.inheritRefs().zipRight(cont(winnerExit, loser)))
      )
    }
  }

  unsafeRace<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    race: IRaceWith<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>,
    trace: TraceElement
  ): Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
    const raceIndicator = new AtomicReference(true)

    const scope = race.scope()
    const left = this.unsafeFork(instruction(race.left()), trace, scope)
    const right = this.unsafeFork(instruction(race.right()), trace, scope)

    return Effect.asyncBlockingOn((cb) => {
      const leftRegister = left.unsafeAddObserverMaybe((exit) =>
        exit.fold(
          () => this.complete(left, right, race.leftWins, exit, raceIndicator, cb),
          (value) => this.complete(left, right, race.leftWins, value, raceIndicator, cb)
        )
      )

      if (leftRegister != null) {
        this.complete(left, right, race.leftWins, leftRegister, raceIndicator, cb)
      } else {
        const rightRegister = right.unsafeAddObserverMaybe((exit) =>
          exit.fold(
            () => this.complete(right, left, race.rightWins, exit, raceIndicator, cb),
            (value) =>
              this.complete(right, left, race.rightWins, value, raceIndicator, cb)
          )
        )

        if (rightRegister != null) {
          this.complete(right, left, race.rightWins, rightRegister, raceIndicator, cb)
        }
      }
    }, FiberId.combineAll(HashSet.from([left.fiberId, right.fiberId])))
  }

  unsafeRunLater(instr: Instruction): void {
    this.nextEffect = instr
    defaultScheduler(() => this.runUntil(this.runtimeConfig.value.maxOp))
  }

  /**
   * The main evaluator loop for the fiber. For purely synchronous effects, this
   * will run either to completion, or for the specified maximum operation
   * count. For effects with asynchronous callbacks, the loop will proceed no
   * further than the first asynchronous boundary.
   */
  runUntil(maxOpCount: number): void {
    try {
      const flags = this.runtimeConfig.value.flags
      const logRuntime = flags.isEnabled(RuntimeConfigFlag.LogRuntime)

      let current: Instruction | undefined = this.nextEffect as Instruction | undefined

      this.nextEffect = undefined

      const superviseOps =
        flags.isEnabled(RuntimeConfigFlag.SuperviseOperations) &&
        this.runtimeConfig.value.supervisor !== Supervisor.none

      if (flags.isEnabled(RuntimeConfigFlag.EnableCurrentFiber)) {
        currentFiber.set(this)
      }
      if (this.runtimeConfig.value.supervisor !== Supervisor.none) {
        this.runtimeConfig.value.supervisor.unsafeOnResume(this)
      }

      while (current != null) {
        try {
          let opCount = 0

          do {
            // Check to see if the fiber should continue executing or not:
            if (!this.unsafeShouldInterrupt) {
              // Fiber does not need to be interrupted, but might need to yield:
              const message = this.unsafeDrainMailbox()

              if (message != null) {
                const oldEffect: Effect<any, any, any> = current
                // TODO: trace
                current = instruction(message.flatMap(() => oldEffect))
              } else if (opCount === maxOpCount) {
                this.unsafeRunLater(instruction(current))
                current = undefined
              } else {
                if (logRuntime) {
                  const effect = current
                  // TODO: implement unsafeLog on Effect primitives
                  this.unsafeLog(() => effect._tag, effect.trace)
                }

                if (superviseOps) {
                  this.runtimeConfig.value.supervisor.unsafeOnEffect(this, current)
                }

                // Fiber is neither being interrupted nor needs to yield. Execute
                // the next instruction in the program:
                switch (current._tag) {
                  case "FlatMap": {
                    this.pushContinuation(new ApplyFrame(current.k, current.trace))
                    current = instruction(current.effect)
                    break
                  }

                  case "SucceedNow": {
                    current = this.unsafeNextEffect(current.value)
                    break
                  }

                  case "Succeed": {
                    current = this.unsafeNextEffect(current.effect())
                    break
                  }

                  case "SucceedWith": {
                    current = this.unsafeNextEffect(
                      current.effect(this.runtimeConfig, this._id)
                    )
                    break
                  }

                  case "Fail": {
                    const cause = current.cause()
                    const tracedCause = cause.isTraced()
                      ? cause
                      : cause.traced(
                          this.unsafeCaptureTrace([TraceElement.parse(current.trace)])
                        )

                    const discardedFolds = this.unsafeUnwindStack()
                    const strippedCause = discardedFolds
                      ? // We threw away some error handlers while unwinding the
                        // stack because we got interrupted during this instruction.
                        // So it's not safe to return typed failures from cause0,
                        // because they might not be typed correctly. Instead, we
                        // strip the typed failures, and return the remainders and
                        // the interruption.
                        tracedCause.stripFailures()
                      : tracedCause
                    const suppressed = this.unsafeClearSuppressed()
                    const fullCause = strippedCause.contains(suppressed)
                      ? strippedCause
                      : strippedCause + suppressed

                    if (this.isStackEmpty) {
                      // Error not caught, stack is empty
                      this.unsafeSetInterrupting(true)

                      current = this.unsafeTryDone(Exit.failCause(fullCause))
                    } else {
                      this.unsafeSetInterrupting(false)

                      // Error caught, next continuation on the stack will deal
                      // with it, so we just have to compute it here:
                      current = this.unsafeNextEffect(fullCause)
                    }
                    break
                  }

                  case "Fold": {
                    const effect = current
                    current = instruction(effect.effect)
                    this.pushContinuation(effect)
                    break
                  }

                  case "Suspend": {
                    current = instruction(current.make())
                    break
                  }

                  case "SuspendWith": {
                    current = instruction(current.make(this.runtimeConfig, this._id))
                    break
                  }

                  case "InterruptStatus": {
                    const boolFlag = current.flag().toBoolean
                    const interruptStatus = this.interruptStatus
                      ? this.interruptStatus.value
                      : true

                    if (interruptStatus !== boolFlag) {
                      this.interruptStatus = new Stack(boolFlag, this.interruptStatus)

                      this.unsafeRestoreInterrupt()
                    }

                    current = instruction(current.effect)

                    break
                  }

                  case "CheckInterrupt": {
                    current = instruction(
                      current.k(InterruptStatus.fromBoolean(this.unsafeIsInterruptible))
                    )
                    break
                  }

                  case "Async": {
                    const effect: IAsync<any, any, any> = current
                    const epoch = this.asyncEpoch
                    this.asyncEpoch = epoch + 1

                    // Enter suspended state
                    this.unsafeEnterAsync(
                      epoch,
                      effect.blockingOn(),
                      TraceElement.parse(effect.trace)
                    )

                    const k = effect.register

                    const either = k(this.unsafeCreateAsyncResume(epoch))

                    switch (either._tag) {
                      case "Left": {
                        const canceler = either.left
                        this.unsafeSetAsyncCanceler(epoch, canceler)
                        if (this.unsafeShouldInterrupt) {
                          if (this.unsafeExitAsync(epoch)) {
                            this.unsafeSetInterrupting(true)
                            current = instruction(
                              canceler.zipRight(
                                Effect.failCause(this.unsafeClearSuppressed())
                              )
                            )
                          } else {
                            current = undefined
                          }
                        } else {
                          current = undefined
                        }
                        break
                      }
                      case "Right": {
                        if (!this.unsafeExitAsync(epoch)) {
                          current = undefined
                        } else {
                          current = instruction(either.right)
                        }
                        break
                      }
                    }
                    break
                  }

                  case "Fork": {
                    current = this.unsafeNextEffect(
                      this.unsafeFork(
                        instruction(current.effect),
                        TraceElement.parse(current.trace),
                        current.scope()
                      )
                    )
                    break
                  }

                  case "Descriptor": {
                    current = instruction(current.f(this.unsafeGetDescriptor()))
                    break
                  }

                  case "Yield": {
                    this.unsafeRunLater(instruction(Effect.unit))
                    current = undefined
                    break
                  }

                  case "Trace": {
                    current = this.unsafeNextEffect(
                      this.unsafeCaptureTrace([TraceElement.parse(current.trace)])
                    )
                    break
                  }

                  case "FiberRefGetAll": {
                    current = instruction(current.make(this.fiberRefLocals))
                    break
                  }

                  case "FiberRefModify": {
                    const {
                      tuple: [result, newValue]
                    } = current.f(this.unsafeGetRef(current.fiberRef))

                    this.unsafeSetRef(current.fiberRef, newValue)

                    current = this.unsafeNextEffect(result)

                    break
                  }

                  case "FiberRefLocally": {
                    const effect = current

                    const fiberRef = effect.fiberRef

                    const oldValue = this.unsafeGetRef(fiberRef)

                    this.unsafeSetRef(fiberRef, effect.localValue)

                    current = instruction(
                      effect.effect.ensuring(
                        Effect.succeed(this.unsafeSetRef(fiberRef, oldValue))
                      )
                    )

                    break
                  }
                  case "FiberRefDelete": {
                    this.unsafeDeleteRef(current.fiberRef)

                    current = this.unsafeNextEffect(undefined)

                    break
                  }

                  case "FiberRefWith": {
                    current = instruction(
                      current.f(this.unsafeGetRef(current.fiberRef))
                    )
                    break
                  }

                  case "RaceWith": {
                    current = instruction(
                      this.unsafeRace(current, TraceElement.parse(current.trace))
                    )
                    break
                  }

                  case "Supervise": {
                    const effect = current
                    const oldSupervisor = this.runtimeConfig.value.supervisor
                    const newSupervisor = effect.supervisor() + oldSupervisor

                    this.runtimeConfig = RuntimeConfig({
                      ...this.runtimeConfig.value,
                      supervisor: newSupervisor
                    })

                    this.unsafeAddFinalizer(
                      Effect.succeed(() => {
                        this.runtimeConfig = RuntimeConfig({
                          ...this.runtimeConfig.value,
                          supervisor: oldSupervisor
                        })
                      })
                    )

                    current = instruction(effect.effect)

                    break
                  }

                  case "GetForkScope": {
                    const effect = current

                    current = instruction(
                      effect.f(
                        this.unsafeGetRef(FiberRef.forkScopeOverride.value).getOrElse(
                          this._scope
                        )
                      )
                    )

                    break
                  }

                  case "OverrideForkScope": {
                    const oldForkScopeOverride = this.unsafeGetRef(
                      FiberRef.forkScopeOverride.value
                    )

                    this.unsafeSetRef(
                      FiberRef.forkScopeOverride.value,
                      current.forkScope()
                    )

                    this.unsafeAddFinalizer(
                      Effect.succeed(
                        this.unsafeSetRef(
                          FiberRef.forkScopeOverride.value,
                          oldForkScopeOverride
                        )
                      )
                    )

                    current = instruction(current.effect())

                    break
                  }

                  case "Ensuring": {
                    this.unsafeAddFinalizer(current.finalizer())
                    current = instruction(current.effect)
                    break
                  }

                  case "Logged": {
                    const effect = current

                    this.unsafeLogWith(
                      effect.message,
                      effect.cause,
                      effect.overrideLogLevel,
                      effect.overrideRef1,
                      effect.overrideValue1,
                      effect.trace
                    )

                    current = this.unsafeNextEffect(undefined)

                    break
                  }

                  case "SetRuntimeConfig": {
                    this.runtimeConfig = current.runtimeConfig()
                    current = instruction(Effect.unit)
                    break
                  }

                  case "XPure": {
                    const effect: XPure<any, any, any, any, any, any> = current
                    const environment = this.unsafeGetRef(
                      FiberRef.currentEnvironment.value
                    )
                    const result = effect
                      .provideEnvironment(() => environment)
                      .runEither()

                    current = instruction(
                      result.fold(
                        (e) => Effect.failCauseNow(Cause.fail(e)),
                        (a) => Effect.succeedNow(a)
                      )
                    )
                  }
                }
              }
            } else {
              // Fiber was interrupted
              const trace = current.trace

              current = instruction(
                Effect.failCause(this.unsafeClearSuppressed(), trace)
              )

              // Prevent interruption of interruption
              this.unsafeSetInterrupting(true)
            }

            opCount = opCount + 1
          } while (current != null)
        } catch (e) {
          if (e instanceof InterruptedException) {
            const trace = current?.trace

            current = instruction(Effect.interruptAs(FiberId.none, trace))

            // Prevent interruption of interruption:
            this.unsafeSetInterrupting(true)
          } else if (e instanceof EffectError) {
            switch (e.exit._tag) {
              case "Success": {
                current = this.unsafeNextEffect(e.exit.value)
                break
              }
              case "Failure": {
                const trace = current ? current.trace : undefined
                current = instruction(Effect.failCause(e.exit.cause, trace))
                break
              }
            }
          } else if (this.runtimeConfig.value.fatal(e)) {
            catastrophicFailure.set(true)
            // Catastrophic error handler. Any error thrown inside the interpreter
            // is either a bug in the interpreter or a bug in the user's code. Let
            // the fiber die but attempt finalization & report errors.
            this.runtimeConfig.value.reportFatal(e)
            current = undefined
          } else {
            this.unsafeSetInterrupting(true)
            current = instruction(Effect.die(e))
          }
        }
      }
    } finally {
      if (
        this.runtimeConfig.value.flags.isEnabled(RuntimeConfigFlag.EnableCurrentFiber)
      ) {
        currentFiber.set(null)
      }
      if (this.runtimeConfig.value.supervisor !== Supervisor.none) {
        this.runtimeConfig.value.supervisor.unsafeOnSuspend(this)
      }
    }
  }

  run(): void {
    return this.runUntil(this.runtimeConfig.value.maxOp)
  }
}
