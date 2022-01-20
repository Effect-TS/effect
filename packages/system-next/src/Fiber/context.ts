import * as Cause from "../Cause"
import { InterruptedException } from "../Cause"
import * as Chunk from "../Collections/Immutable/Chunk"
import * as HS from "../Collections/Immutable/HashSet"
import type { Next } from "../Collections/Immutable/Map"
import { instruction } from "../Effect/definition/primitives"
import * as E from "../Either"
import * as Ex from "../Exit"
import * as FiberId from "../FiberId"
import type { FiberRef, Runtime } from "../FiberRef"
import {
  currentEnvironment,
  currentLogLevel,
  currentLogSpan,
  forkScopeOverride,
  update_
} from "../FiberRef"
import { constVoid, pipe } from "../Function"
import type { Tag } from "../Has"
import * as InterruptStatus from "../InterruptStatus"
import { LazyValue } from "../LazyValue"
import type { Logger } from "../Logger"
import { CauseLogger, StringLogger } from "../Logger/operations"
import * as LogLevel from "../LogLevel"
import * as HistogramBoundaries from "../Metric/Boundaries"
import * as MetricClient from "../Metric/MetricClient"
import type { Option } from "../Option"
import * as O from "../Option"
import * as Promise from "../Promise"
import { RuntimeConfig } from "../RuntimeConfig"
import * as RuntimeConfigFlag from "../RuntimeConfig/Flag"
import * as RuntimeConfigFlags from "../RuntimeConfig/Flags"
import * as Scope from "../Scope"
import { Stack } from "../Stack"
import { equalsSym } from "../Structural"
import * as Supervisor from "../Supervisor"
import { AtomicReference } from "../Support/AtomicReference"
import { defaultScheduler } from "../Support/Scheduler"
import * as StackTraceBuilder from "../Support/StackTraceBuilder"
import { Trace } from "../Trace"
import * as TE from "../TraceElement"
import * as CancelerState from "./cancelerState"
import type * as Fiber from "./definition"
import { Descriptor } from "./descriptor"
import type { Callback } from "./fiberState"
import * as FiberState from "./fiberState"
import * as T from "./operations/_internal/effect"
import { forEachDiscard_ } from "./operations/_internal/effect-api"
import * as FiberStatus from "./status"

const fiberFailureCauses = MetricClient.unsafeMakeSetCount(
  "effect_fiber_failure_causes",
  "class"
)
const fiberForkLocations = MetricClient.unsafeMakeSetCount(
  "effect_fiber_fork",
  "location"
)

const fibersStarted = MetricClient.unsafeMakeCounter("effect_fiber_started")
const fiberSuccesses = MetricClient.unsafeMakeCounter("effect_fiber_successes")
const fiberFailures = MetricClient.unsafeMakeCounter("effect_fiber_failures")

const fiberLifetimeBoundaries = HistogramBoundaries.exponential(1.0, 2.0, 100)
const fiberLifetimes = MetricClient.unsafeMakeHistogram(
  "effect_fiber_lifetimes",
  fiberLifetimeBoundaries
)

export class InterruptExit {
  readonly _tag = "InterruptExit"
  constructor(
    readonly apply: (a: any) => T.Effect<any, any, any>,
    readonly trace?: string
  ) {}
}

export class Finalizer {
  readonly _tag = "Finalizer"
  constructor(
    readonly finalizer: T.UIO<any>,
    readonly handleInterrupts: () => void,
    readonly trace?: string
  ) {}

  apply(a: any): T.Effect<any, any, any> {
    this.handleInterrupts()
    return T.map_(this.finalizer, () => a, instruction(this.finalizer).trace)
  }
}

// export class TracingExit {
//   readonly _tag = "TracingExit"
//   constructor(
//     readonly apply: (a: any) => T.Effect<any, any, any>,
//     readonly trace?: string
//   ) {}
// }

// export class HandlerFrame {
//   readonly _tag = "HandlerFrame"
//   constructor(
//     readonly apply: (a: any) => T.Effect<any, any, any>,
//     readonly trace?: string
//   ) {}
// }

export class ApplyFrame {
  readonly _tag = "ApplyFrame"
  constructor(
    readonly apply: (a: any) => T.Effect<any, any, any>,
    readonly trace?: string
  ) {}
}

export type Frame =
  | InterruptExit
  // | TracingExit
  | Finalizer
  | T.IFold<any, any, any, any, any, any, any, any, any>
  // | HandlerFrame
  | ApplyFrame

export type FiberRefLocals = Map<FiberRef.Runtime<any>, any>

export const currentFiber = new AtomicReference<FiberContext<any, any> | null>(null)

export const _roots = LazyValue.make(() => new Set<FiberContext<any, any>>())

export class FiberContext<E, A> implements Fiber.Runtime<E, A> {
  readonly _tag = "Runtime"

  state = FiberState.initial<E, A>()

  asyncEpoch = 0

  stack: Stack<Frame> | undefined = undefined

  interruptStatus?: Stack<boolean> | undefined = undefined

  scope: Scope.Scope = Scope.unsafeMake(this)

  nextEffect: T.Effect<any, any, any> | undefined = undefined

  _children: Set<FiberContext<any, any>>

  runtimeConfig: RuntimeConfig

  constructor(
    readonly id: FiberId.Runtime,
    readonly fiberRefLocals: FiberRefLocals,
    readonly location: TE.TraceElement,
    _children: Set<FiberContext<any, any>>,
    runtimeConfig: RuntimeConfig,
    interruptStatus0?: Stack<boolean>
  ) {
    this._children = _children
    this.runtimeConfig = runtimeConfig
    if (interruptStatus0) {
      this.interruptStatus = interruptStatus0
    }
    if (this.trackMetrics) {
      fibersStarted.unsafeIncrement()
      fiberForkLocations.unsafeObserve(TE.stringify(location))
    }
  }

  // -----------------------------------------------------------------------------
  // Fiber
  // -----------------------------------------------------------------------------

  get fiberId(): FiberId.FiberId {
    return this.id
  }

  get status(): T.UIO<FiberStatus.Status> {
    return T.succeed(() => this.state.status)
  }

  unsafeGetDescriptor(): Descriptor {
    return new Descriptor(
      this.fiberId,
      this.state.status,
      this.state.interruptors,
      InterruptStatus.fromBoolean(this.unsafeIsInterruptible),
      this.scope
    )
  }

  // -----------------------------------------------------------------------------
  // Metrics
  // -----------------------------------------------------------------------------

  get trackMetrics(): boolean {
    return RuntimeConfigFlags.isEnabled_(
      this.runtimeConfig.value.flags,
      RuntimeConfigFlag.trackRuntimeMetrics
    )
  }

  observeFailure(failure: string): void {
    if (this.trackMetrics) {
      fiberFailureCauses.unsafeObserve(failure)
    }
  }

  // -----------------------------------------------------------------------------
  // Logging
  // -----------------------------------------------------------------------------

  unsafeLog(typeTag: Tag<any>, message: () => any, trace?: string): void {
    const logLevel = this.unsafeGetRef(currentLogLevel.value)
    const spans = this.unsafeGetRef(currentLogSpan.value)

    this.unsafeForEachLogger(typeTag, (logger) =>
      logger(
        TE.parse(trace),
        this.fiberId,
        logLevel,
        message,
        this.fiberRefLocals,
        spans,
        this.location
      )
    )
  }

  unsafeLogWith(
    typeTag: Tag<any>,
    message: () => any,
    overrideLogLevel: O.Option<LogLevel.LogLevel>,
    overrideRef1: FiberRef.Runtime<any> | null = null,
    overrideValue1: any = null,
    trace?: string
  ): void {
    const logLevel = O.getOrElse_(overrideLogLevel, () =>
      this.unsafeGetRef(currentLogLevel.value)
    )

    const spans = this.unsafeGetRef(currentLogSpan.value)

    if (overrideRef1 != null) {
      if (overrideValue1 != null) {
        this.fiberRefLocals.delete(overrideRef1)
      } else {
        this.fiberRefLocals.set(overrideRef1, overrideValue1)
      }
    }

    this.unsafeForEachLogger(typeTag, (logger) =>
      logger(
        TE.parse(trace),
        this.fiberId,
        logLevel,
        message,
        this.fiberRefLocals,
        spans,
        this.location
      )
    )
  }

  //   unsafeForEachLogger(tag) { logger =>
  //     logger(trace, fiberId, logLevel, message, contextMap, spans, location)
  //   }
  // }

  unsafeForEachLogger(typeTag: Tag<any>, f: (logger: Logger<any, any>) => void): void {
    const loggers = this.runtimeConfig.value.loggers.getAll(typeTag)
    loggers.forEach((logger) => f(logger))
  }

  // -----------------------------------------------------------------------------
  // Frame
  // -----------------------------------------------------------------------------

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

  unsafeNextEffect(previousSuccess: any): T.Instruction | undefined {
    const frame = this.popContinuation()
    if (frame) {
      return instruction(
        frame._tag === "Fold"
          ? frame.success(previousSuccess)
          : frame.apply(previousSuccess)
      )
    }
    return this.unsafeTryDone(Ex.succeed(previousSuccess))
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
              T.foldCauseEffect_(
                frame.finalizer,
                (finalizerCause) => {
                  this.popInterruptStatus()
                  this.unsafeAddSuppressed(finalizerCause)
                  return T.failCause(cause)
                },
                () => {
                  this.popInterruptStatus()
                  return T.failCause(cause)
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

  // -----------------------------------------------------------------------------
  // Interruption
  // -----------------------------------------------------------------------------

  interruptExit: InterruptExit = new InterruptExit((v: any) => {
    if (this.unsafeIsInterruptible) {
      this.popInterruptStatus()
      return instruction(T.succeedNow(v))
    } else {
      return instruction(
        T.succeed(() => {
          this.popInterruptStatus()
          return v
        })
      )
    }
  })

  interruptAs(fiberId: FiberId.FiberId): T.UIO<Ex.Exit<E, A>> {
    return this.unsafeInterruptAs(fiberId)
  }

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

  private unsafeInterruptAs(fiberId: FiberId.FiberId): T.UIO<Ex.Exit<E, A>> {
    const interruptedCause = Cause.interrupt(fiberId)

    return T.suspendSucceed(() => {
      const oldState = this.state

      if (
        oldState._tag === "Executing" &&
        oldState.status._tag === "Suspended" &&
        oldState.status.interruptible &&
        oldState.asyncCanceler._tag === "Registered"
      ) {
        const newState = new FiberState.Executing(
          FiberStatus.withInterrupting(true)(oldState.status),
          oldState.observers,
          oldState.suppressed,
          HS.add_(oldState.interruptors, fiberId),
          CancelerState.Empty,
          oldState.mailbox
        )

        this.state = newState

        const interrupt = T.failCause(interruptedCause)
        const asyncCanceler = oldState.asyncCanceler.asyncCanceler
        const effect =
          asyncCanceler === T.unit ? interrupt : T.zipRight_(asyncCanceler, interrupt)

        this.unsafeRunLater(instruction(effect))
      } else if (oldState._tag === "Executing") {
        const newCause = Cause.then(oldState.suppressed, interruptedCause)
        const newState = new FiberState.Executing(
          oldState.status,
          oldState.observers,
          newCause,
          HS.add_(oldState.interruptors, fiberId),
          oldState.asyncCanceler,
          oldState.mailbox
        )

        this.state = newState
      }

      return this.await
    })
  }

  private unsafeSetInterrupting(value: boolean): void {
    const oldState = this.state

    if (oldState._tag === "Executing") {
      this.state = new FiberState.Executing(
        FiberStatus.withInterrupting(value)(oldState.status),
        oldState.observers,
        oldState.suppressed,
        oldState.interruptors,
        oldState.asyncCanceler,
        oldState.mailbox
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
    return HS.size(this.state.interruptors) > 0
  }

  get unsafeIsInterruptible(): boolean {
    return this.interruptStatus ? this.interruptStatus.value : true
  }

  get unsafeIsInterrupting(): boolean {
    return FiberState.isInterrupting(this.state)
  }

  get unsafeShouldInterrupt(): boolean {
    return (
      this.unsafeIsInterrupted &&
      this.unsafeIsInterruptible &&
      !this.unsafeIsInterrupting
    )
  }

  get await(): T.UIO<Ex.Exit<E, A>> {
    return T.asyncInterruptBlockingOn<unknown, never, Ex.Exit<E, A>>((k) => {
      const cb: Callback<never, Ex.Exit<E, A>> = (x) => k(T.done(x))
      const result = this.unsafeAddObserverMaybe(cb)

      if (result) {
        return E.right(T.succeedNow(result))
      } else {
        return E.left(T.succeed(() => this.unsafeRemoveObserver(cb)))
      }
    }, this.id)
  }

  get children(): T.UIO<Chunk.Chunk<Fiber.Runtime<any, any>>> {
    return this.evalOnEffect(
      T.succeed(() => {
        const chunkBuilder = Chunk.builder<Fiber.Runtime<any, any>>()

        const iterator = this._children[Symbol.iterator]()

        let next: Next<Fiber.Runtime<any, any>>
        while (!(next = iterator.next()).done) {
          chunkBuilder.append(next.value)
        }
        return chunkBuilder.build()
      }),
      T.succeed(() => Chunk.empty())
    )
  }

  get poll(): T.UIO<Option<Ex.Exit<E, A>>> {
    return T.succeed(this.unsafePoll)
  }

  // -----------------------------------------------------------------------------
  // FiberRefs
  // -----------------------------------------------------------------------------

  get inheritRefs(): T.UIO<void> {
    return T.suspendSucceed(() => {
      if (this.fiberRefLocals.size === 0) {
        return T.unit
      }
      return forEachDiscard_(this.fiberRefLocals, ([ref, value]) =>
        update_(ref, (old) => (ref as Runtime<A>).join(old, value))
      )
    })
  }

  getRef<K>(ref: FiberRef.Runtime<K>): T.UIO<K> {
    return T.succeed(() => this.unsafeGetRef(ref))
  }

  unsafeGetRef<A>(fiberRef: FiberRef.Runtime<A>): A {
    return this.fiberRefLocals.get(fiberRef) || (fiberRef as Runtime<A>).initial
  }

  unsafeSetRef<A>(fiberRef: FiberRef.Runtime<A>, value: A): void {
    this.fiberRefLocals.set(fiberRef, value)
  }

  unsafeDeleteRef<A>(fiberRef: FiberRef.Runtime<A>): void {
    this.fiberRefLocals.delete(fiberRef)
  }

  // -----------------------------------------------------------------------------
  // Observers
  // -----------------------------------------------------------------------------

  unsafeAddObserverMaybe(k: Callback<never, Ex.Exit<E, A>>): Ex.Exit<E, A> | undefined {
    const oldState = this.state
    switch (oldState._tag) {
      case "Executing": {
        const observers = [k, ...oldState.observers]

        this.state = new FiberState.Executing(
          oldState.status,
          observers,
          oldState.suppressed,
          oldState.interruptors,
          oldState.asyncCanceler,
          oldState.mailbox
        )

        return undefined
      }
      case "Done": {
        return oldState.value
      }
    }
  }

  unsafeRemoveObserver(k: Callback<never, Ex.Exit<E, A>>): void {
    const oldState = this.state

    if (oldState._tag === "Executing") {
      const observers = oldState.observers.filter((o) => o !== k)

      this.state = new FiberState.Executing(
        oldState.status,
        observers,
        oldState.suppressed,
        oldState.interruptors,
        oldState.asyncCanceler,
        oldState.mailbox
      )
    }
  }

  unsafeNotifyObservers(
    v: Ex.Exit<E, A>,
    observers: Array<Callback<never, Ex.Exit<E, A>>>
  ): void {
    if (observers.length > 0) {
      const result = Ex.succeed(v)
      observers.forEach((k) => k(result))
    }
  }

  unsafeReportUnhandled(exit: Ex.Exit<E, A>, trace?: string): void {
    if (exit._tag === "Failure") {
      try {
        this.unsafeLogWith(
          CauseLogger,
          () => exit.cause,
          O.some(LogLevel.Debug),
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

  private unsafeAddSuppressed(cause: Cause.Cause<never>): void {
    if (!Cause.isEmpty(cause)) {
      const oldState = this.state

      if (oldState._tag === "Executing") {
        const newState = new FiberState.Executing(
          oldState.status,
          oldState.observers,
          Cause.then(oldState.suppressed, cause),
          oldState.interruptors,
          oldState.asyncCanceler,
          oldState.mailbox
        )

        this.state = newState
      }
    }
  }

  private unsafeClearSuppressed(): Cause.Cause<never> {
    const oldState = this.state

    switch (oldState._tag) {
      case "Executing": {
        const newState = new FiberState.Executing(
          oldState.status,
          oldState.observers,
          Cause.empty,
          oldState.interruptors,
          oldState.asyncCanceler,
          oldState.mailbox
        )

        this.state = newState

        const interruptorsCause = FiberState.interruptorsCause(oldState)

        if (Cause.contains_(oldState.suppressed, interruptorsCause)) {
          return oldState.suppressed
        } else {
          return Cause.then(oldState.suppressed, interruptorsCause)
        }
      }
      case "Done": {
        return FiberState.interruptorsCause(oldState)
      }
    }
  }

  unsafeAddChild(child: FiberContext<any, any>): boolean {
    return this.unsafeEvalOn(T.succeed(() => this._children.add(child)))
  }

  unsafePoll(): O.Option<Ex.Exit<E, A>> {
    const state = this.state
    return state._tag === "Done" ? O.some(state.value) : O.none
  }

  // -----------------------------------------------------------------------------
  // Tracing
  // -----------------------------------------------------------------------------

  get trace(): T.UIO<Trace> {
    return T.succeed(() => this.unsafeCaptureTrace([]))
  }

  unsafeCaptureTrace(prefix: Array<TE.TraceElement>): Trace {
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

      frames.forEach((frame) => builder.append(TE.parse(frame.trace)))
    }

    return new Trace(this.fiberId, builder.build())
  }

  // -----------------------------------------------------------------------------
  // Async
  // -----------------------------------------------------------------------------

  unsafeEnterAsync(
    epoch: number,
    blockingOn: FiberId.FiberId,
    trace: TE.TraceElement
  ): void {
    const oldState = this.state

    if (oldState._tag === "Executing" && oldState.asyncCanceler._tag === "Empty") {
      const newStatus = new FiberStatus.Suspended(
        oldState.status,
        this.unsafeIsInterruptible && !this.unsafeIsInterrupting,
        blockingOn,
        epoch,
        trace
      )

      const newState = new FiberState.Executing(
        newStatus,
        oldState.observers,
        oldState.suppressed,
        oldState.interruptors,
        CancelerState.Pending,
        oldState.mailbox
      )

      this.state = newState
    }
  }

  unsafeExitAsync(epoch: number): boolean {
    const oldState = this.state

    if (
      oldState._tag === "Executing" &&
      oldState.status._tag === "Suspended" &&
      oldState.status.epoch === epoch
    ) {
      const newState = new FiberState.Executing(
        oldState.status.previous,
        oldState.observers,
        oldState.suppressed,
        oldState.interruptors,
        CancelerState.Empty,
        oldState.mailbox
      )

      this.state = newState

      return true
    }

    return false
  }

  unsafeCreateAsyncResume(epoch: number): (_: T.Effect<any, any, any>) => void {
    return (effect) => {
      if (this.unsafeExitAsync(epoch)) {
        this.unsafeRunLater(instruction(effect))
      }
    }
  }

  unsafeSetAsyncCanceler(
    epoch: number,
    asyncCanceler0: T.Effect<any, any, any> | undefined
  ): void {
    const oldState = this.state
    const asyncCanceler = asyncCanceler0 == null ? T.unit : asyncCanceler0

    if (
      oldState._tag === "Executing" &&
      oldState.status._tag === "Suspended" &&
      oldState.asyncCanceler._tag === "Pending" &&
      epoch === oldState.status.epoch
    ) {
      this.state = new FiberState.Executing(
        oldState.status,
        oldState.observers,
        oldState.suppressed,
        oldState.interruptors,
        new CancelerState.Registered(asyncCanceler),
        oldState.mailbox
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

  // -----------------------------------------------------------------------------
  // Finalizer
  // -----------------------------------------------------------------------------

  unsafeAddFinalizer(finalizer: T.UIO<any>): void {
    this.pushContinuation(
      new Finalizer(finalizer, () => {
        this.unsafeDisableInterrupting()
        this.unsafeRestoreInterrupt()
      })
    )
  }

  // -----------------------------------------------------------------------------
  // Execution
  // -----------------------------------------------------------------------------

  evalOn(effect: T.UIO<any>, orElse: T.UIO<any>): T.UIO<void> {
    return T.suspendSucceed(() => {
      if (this.unsafeEvalOn(effect)) {
        return T.unit
      } else {
        return T.asUnit(orElse)
      }
    })
  }

  evalOnEffect<R, E2, A2>(
    effect: T.Effect<R, E2, A2>,
    orElse: T.Effect<R, E2, A2>
  ): T.Effect<R, E2, A2> {
    return T.chain_(T.environment<R>(), (environment) =>
      T.chain_(Promise.make<E2, A2>(), (promise) =>
        T.chain_(
          this.evalOn(
            T.intoPromise_(T.provideEnvironment_(effect, environment), promise),
            T.intoPromise_(T.provideEnvironment_(orElse, environment), promise)
          ),
          () => Promise.await(promise)
        )
      )
    )
  }

  unsafeEvalOn(effect: T.UIO<any>): boolean {
    const oldState = this.state

    switch (oldState._tag) {
      case "Executing": {
        const newMailbox =
          oldState.mailbox == null ? effect : T.chain_(oldState.mailbox, () => effect)

        this.state = new FiberState.Executing(
          oldState.status,
          oldState.observers,
          oldState.suppressed,
          oldState.interruptors,
          oldState.asyncCanceler,
          newMailbox
        )

        return true
      }
      case "Done": {
        return false
      }
    }
  }

  unsafeTryDone(exit: Ex.Exit<E, A>): T.Instruction | undefined {
    const oldState = this.state

    switch (oldState._tag) {
      case "Executing": {
        if (oldState.mailbox) {
          // Not done because the mailbox isn't empty
          const newState = new FiberState.Executing(
            oldState.status,
            oldState.observers,
            oldState.suppressed,
            oldState.interruptors,
            oldState.asyncCanceler,
            undefined
          )

          this.state = newState

          this.unsafeSetInterrupting(true)

          return instruction(T.zipRight_(oldState.mailbox, T.done(exit)))
        } else if (this._children.size === 0) {
          // The mailbox is empty and the _children are shut down
          const interruptorsCause = FiberState.interruptorsCause(oldState)

          const newExit = interruptorsCause[equalsSym](Cause.empty)
            ? exit
            : Ex.mapErrorCause_(exit, (cause) =>
                Cause.contains_(cause, interruptorsCause)
                  ? cause
                  : Cause.then(cause, interruptorsCause)
              )

          //  We are truly "unsafeTryDone" because the scope has been closed
          this.state = new FiberState.Done(newExit)

          this.unsafeReportUnhandled(newExit)
          this.unsafeNotifyObservers(newExit, oldState.observers)

          const startTimeSeconds = this.id.startTimeSeconds
          const endTimeSeconds = new Date().getTime() / 1000
          const lifetime = endTimeSeconds - startTimeSeconds

          if (this.trackMetrics) {
            fiberLifetimes.unsafeObserve(lifetime)
          }

          Ex.fold_(
            newExit,
            (cause) => {
              if (this.trackMetrics) {
                fiberFailures.unsafeIncrement()
              }

              return Cause.fold_<E, void>(
                cause,
                () => fiberFailureCauses.unsafeObserve("<empty>"),
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
                fiberSuccesses.unsafeIncrement()
              }
            }
          )

          return undefined
        } else {
          // Not done because there are _children left to close
          this.unsafeSetInterrupting(true)

          const iterator = this._children[Symbol.iterator]()

          let interruptChildren = T.unit
          let next: Next<FiberContext<any, any>>
          while (!(next = iterator.next()).done) {
            interruptChildren = T.zipRight_(
              interruptChildren,
              next.value.interruptAs(this.id)
            )
            next = iterator.next()
          }

          this._children = new Set()

          return instruction(T.zipRight_(interruptChildren, T.done(exit)))
        }
      }
      case "Done": {
        // Already unsafeTryDone
        return undefined
      }
    }
  }

  unsafeDrainMailbox(): T.UIO<any> | undefined {
    const oldState = this.state

    switch (oldState._tag) {
      case "Executing": {
        const newState = new FiberState.Executing(
          oldState.status,
          oldState.observers,
          oldState.suppressed,
          oldState.interruptors,
          oldState.asyncCanceler,
          undefined
        )

        this.state = newState

        return oldState.mailbox
      }
      case "Done": {
        return undefined
      }
    }
  }

  unsafeOnDone(k: Callback<never, Ex.Exit<E, A>>): void {
    const result = this.unsafeAddObserverMaybe(k)
    if (result != null) {
      k(Ex.succeed(result))
    }
  }

  /**
   * Forks an `IO` with the specified failure handler.
   */
  unsafeFork(
    effect: T.Instruction,
    trace: TE.TraceElement,
    forkScope: O.Option<Scope.Scope> = O.none
  ): FiberContext<any, any> {
    const childFiberRefLocals: FiberRefLocals = new Map()

    this.fiberRefLocals.forEach((v, k) => {
      childFiberRefLocals.set(k, (k as Runtime<A>).fork(v))
    })

    const parentScope: Scope.Scope = O.getOrElse_(
      forkScope._tag === "Some"
        ? forkScope
        : this.unsafeGetRef(forkScopeOverride.value) || O.none,
      () => this.scope
    )

    const childId = FiberId.unsafeMake()
    // TODO: WeakSet?
    const grandChildren = new Set<FiberContext<any, any>>()

    const childContext = new FiberContext(
      childId,
      childFiberRefLocals,
      trace,
      grandChildren,
      this.runtimeConfig,
      this.interruptStatus || new Stack(true)
    )

    if (this.runtimeConfig.value.supervisor !== Supervisor.none) {
      this.runtimeConfig.value.supervisor.unsafeOnStart(
        this.unsafeGetRef(currentEnvironment.value),
        effect,
        O.some(this),
        childContext
      )

      childContext.unsafeOnDone((exit) =>
        this.runtimeConfig.value.supervisor.unsafeOnEnd(Ex.flatten(exit), childContext)
      )
    }

    const childEffect = parentScope.unsafeAdd(this.runtimeConfig, childContext)
      ? effect
      : T.interruptAs(parentScope.fiberId)

    childContext.nextEffect = childEffect

    childContext.runUntil(this.runtimeConfig.value.maxOp)

    return childContext
  }

  complete<R, R1, R2, E2, A2, R3, E3, A3>(
    winner: Fiber.Fiber<any, any>,
    loser: Fiber.Fiber<any, any>,
    cont: (
      exit: Ex.Exit<any, any>,
      fiber: Fiber.Fiber<any, any>
    ) => T.Effect<any, any, any>,
    winnerExit: Ex.Exit<any, any>,
    ab: AtomicReference<boolean>,
    cb: (_: T.Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3>) => void
  ): void {
    if (ab.compareAndSet(true, false)) {
      switch (winnerExit._tag) {
        case "Failure": {
          cb(cont(winnerExit, loser))
          break
        }
        case "Success": {
          cb(T.chain_(winner.inheritRefs, () => cont(winnerExit, loser)))
          break
        }
      }
    }
  }

  unsafeRace<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    race: T.IRaceWith<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>,
    trace: TE.TraceElement
  ): T.Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
    const raceIndicator = new AtomicReference(true)

    const scope = race.scope
    const left = this.unsafeFork(instruction(race.left), trace, scope)
    const right = this.unsafeFork(instruction(race.right), trace, scope)

    return T.asyncBlockingOn((cb) => {
      const leftRegister = left.unsafeAddObserverMaybe((exit) => {
        switch (exit._tag) {
          case "Failure": {
            this.complete(left, right, race.leftWins, exit, raceIndicator, cb)
            break
          }
          case "Success": {
            this.complete(left, right, race.leftWins, exit.value, raceIndicator, cb)
            break
          }
        }
      })

      if (leftRegister != null) {
        this.complete(left, right, race.leftWins, leftRegister, raceIndicator, cb)
      } else {
        const rightRegister = right.unsafeAddObserverMaybe((exit) => {
          switch (exit._tag) {
            case "Failure": {
              this.complete(right, left, race.rightWins, exit, raceIndicator, cb)
              break
            }
            case "Success": {
              this.complete(right, left, race.rightWins, exit.value, raceIndicator, cb)
              break
            }
          }
        })

        if (rightRegister != null) {
          this.complete(right, left, race.rightWins, rightRegister, raceIndicator, cb)
        }
      }
    }, pipe(HS.make<FiberId.FiberId>(), HS.add(left.fiberId), HS.add(right.fiberId), FiberId.combineAll))
  }

  // TODO - figure out if this is problematic given mutability of `nextEffect`
  unsafeRunLater(instr: T.Instruction): void {
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
      const logRuntime = RuntimeConfigFlags.isEnabled_(
        this.runtimeConfig.value.flags,
        RuntimeConfigFlag.logRuntime
      )

      let current: T.Instruction | undefined = this.nextEffect as
        | T.Instruction
        | undefined

      this.nextEffect = undefined

      const emptyTraceElement: TE.TraceElement = TE.NoLocation

      // Store the trace of the immediate future flatMap during evaluation
      // of a 1-hop left bind, to show a stack trace closer to the point of
      // failure
      let extraTrace: TE.TraceElement = emptyTraceElement

      const flags = this.runtimeConfig.value.flags
      const superviseOps =
        RuntimeConfigFlags.isEnabled_(flags, RuntimeConfigFlag.superviseOperations) &&
        this.runtimeConfig.value.supervisor !== Supervisor.none

      if (RuntimeConfigFlags.isEnabled_(flags, RuntimeConfigFlag.enableCurrentFiber)) {
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
                const oldEffect: T.Effect<any, any, any> = current
                // TODO: trace
                current = instruction(T.chain_(message, () => oldEffect))
              } else if (opCount === maxOpCount) {
                this.unsafeRunLater(instruction(current))
                current = undefined
              } else {
                if (logRuntime) {
                  const effect = current
                  // TODO: implement unsafeLog on Effect primitives
                  this.unsafeLog(StringLogger, () => effect._tag, effect.trace)
                }

                if (superviseOps) {
                  this.runtimeConfig.value.supervisor.unsafeOnEffect(this, current)
                }

                // Fiber is neither being interrupted nor needs to yield. Execute
                // the next instruction in the program:
                switch (current._tag) {
                  case "FlatMap": {
                    const nested: T.Instruction = instruction(current.effect)
                    const k: (a: any) => T.Effect<any, any, any> = current.k

                    // A mini interpreter for the left side of FlatMap that evaluates
                    // anything that is 1-hop away. This eliminates heap usage for the
                    // happy path.
                    switch (nested._tag) {
                      case "SucceedNow": {
                        current = instruction(k(nested.value))
                        break
                      }
                      case "Succeed": {
                        extraTrace = TE.parse(nested.trace)
                        const value = nested.effect()
                        extraTrace = emptyTraceElement
                        current = instruction(k(value))
                        break
                      }
                      case "Yield": {
                        extraTrace = TE.parse(nested.trace)
                        this.unsafeRunLater(instruction(k(undefined)))
                        extraTrace = emptyTraceElement
                        current = undefined
                        break
                      }
                      default: {
                        // Fallback case. We couldn't evaluate the left-hand
                        // side, so we have to use the stack
                        this.pushContinuation(new ApplyFrame(current.k, current.trace))
                        current = nested
                      }
                    }
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
                      current.effect(this.runtimeConfig, this.id)
                    )
                    break
                  }

                  case "Fail": {
                    const fastPathTrace =
                      extraTrace === emptyTraceElement ? [] : [extraTrace]
                    extraTrace = emptyTraceElement

                    const cause = current.cause()
                    const tracedCause = Cause.isTraced(cause)
                      ? cause
                      : Cause.traced_(
                          cause,
                          this.unsafeCaptureTrace([
                            TE.parse(current.trace),
                            ...fastPathTrace
                          ])
                        )

                    const discardedFolds = this.unsafeUnwindStack()
                    // We threw away some error handlers while unwinding the
                    // stack because we got interrupted during this instruction.
                    // So it's not safe to return typed failures from cause0,
                    // because they might not be typed correctly. Instead, we
                    // strip the typed failures, and return the remainders and
                    // the interruption.
                    const strippedCause = discardedFolds
                      ? Cause.stripFailures(tracedCause)
                      : tracedCause
                    const suppressed = this.unsafeClearSuppressed()
                    const fullCause = Cause.contains_(strippedCause, suppressed)
                      ? strippedCause
                      : Cause.then(strippedCause, suppressed)

                    if (this.isStackEmpty) {
                      // Error not caught, stack is empty
                      this.unsafeSetInterrupting(true)

                      current = this.unsafeTryDone(Ex.failCause(fullCause))
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
                    current = instruction(current.make(this.runtimeConfig, this.id))
                    break
                  }

                  case "InterruptStatus": {
                    const boolFlag = current.flag.toBoolean

                    if (
                      this.interruptStatus &&
                      this.interruptStatus.value !== boolFlag
                    ) {
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
                    const effect = current
                    const epoch = this.asyncEpoch
                    this.asyncEpoch = this.asyncEpoch + 1

                    // Enter suspended state
                    this.unsafeEnterAsync(
                      epoch,
                      effect.blockingOn,
                      TE.parse(effect.trace)
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
                              T.zipRight_(
                                canceler,
                                T.failCause(this.unsafeClearSuppressed())
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
                      }
                    }
                    break
                  }

                  case "Fork": {
                    current = this.unsafeNextEffect(
                      this.unsafeFork(
                        instruction(current.effect),
                        TE.parse(current.trace),
                        current.scope
                      )
                    )
                    break
                  }

                  case "Descriptor": {
                    current = instruction(current.f(this.unsafeGetDescriptor()))
                    break
                  }

                  case "Yield": {
                    this.unsafeRunLater(instruction(T.unit))
                    current = undefined
                    break
                  }

                  case "Trace": {
                    current = this.unsafeNextEffect(
                      this.unsafeCaptureTrace([TE.parse(current.trace)])
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
                      T.ensuring_(
                        effect.effect,
                        T.succeed(() => this.unsafeSetRef(fiberRef, oldValue))
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
                      this.unsafeRace(current, TE.parse(current.trace))
                    )
                    break
                  }

                  case "Supervise": {
                    const effect = current
                    const oldSupervisor = this.runtimeConfig.value.supervisor
                    const newSupervisor = Supervisor.and_(
                      effect.supervisor,
                      oldSupervisor
                    )

                    this.runtimeConfig = new RuntimeConfig({
                      ...this.runtimeConfig.value,
                      supervisor: newSupervisor
                    })

                    this.unsafeAddFinalizer(
                      T.succeed(() => {
                        this.runtimeConfig = new RuntimeConfig({
                          ...this.runtimeConfig.value,
                          supervisor: oldSupervisor
                        })
                      })
                    )

                    current = instruction(effect.effect)

                    break
                  }

                  case "GetForkScope": {
                    current = instruction(
                      current.f(
                        O.getOrElse_(
                          this.unsafeGetRef(forkScopeOverride.value),
                          () => this.scope
                        )
                      )
                    )
                    break
                  }

                  case "OverrideForkScope": {
                    const oldforkScopeOverride = this.unsafeGetRef(
                      forkScopeOverride.value
                    )

                    this.unsafeSetRef(forkScopeOverride.value, current.forkScope)

                    this.unsafeAddFinalizer(
                      T.succeed(() =>
                        this.unsafeSetRef(forkScopeOverride.value, oldforkScopeOverride)
                      )
                    )

                    current = instruction(current.effect)

                    break
                  }

                  case "Ensuring": {
                    this.unsafeAddFinalizer(current.finalizer)
                    current = instruction(current.effect)
                    break
                  }

                  case "Logged": {
                    const effect = current

                    this.unsafeLogWith(
                      effect.typeTag,
                      effect.message,
                      effect.overrideLogLevel,
                      effect.overrideRef1,
                      effect.overrideValue1,
                      effect.trace
                    )

                    current = this.unsafeNextEffect(undefined)

                    break
                  }

                  case "SetRuntimeConfig": {
                    this.runtimeConfig = current.runtimeConfig
                    current = instruction(T.unit)
                    break
                  }
                }
              }
            } else {
              // Fiber was interrupted
              const trace = current.trace

              current = instruction(T.failCause(this.unsafeClearSuppressed(), trace))

              // Prevent interruption of interruption
              this.unsafeSetInterrupting(true)
            }

            opCount = opCount + 1
          } while (current != null)
        } catch (e) {
          if (e instanceof InterruptedException) {
            const trace = current?.trace

            current = instruction(T.interruptAs(FiberId.none, trace))

            // Prevent interruption of interruption:
            this.unsafeSetInterrupting(true)
          } else if (e instanceof T.EffectError) {
            Ex.fold_(
              e.exit,
              (cause) => {
                const trace = current?.trace
                current = instruction(T.failCause(cause, trace))
              },
              (value) => {
                current = this.unsafeNextEffect(value)
              }
            )
          } else if (this.runtimeConfig.value.fatal(e)) {
            // Catastrophic error handler. Any error thrown inside the interpreter
            // is either a bug in the interpreter or a bug in the user's code. Let
            // the fiber die but attempt finalization & report errors.
            current = undefined
            // TODO: catastrophicFailure.set(true)
            this.runtimeConfig.value.reportFatal(e)
          } else {
            this.unsafeSetInterrupting(true)
            current = instruction(T.die(e))
          }
        }
      }
    } finally {
      if (
        RuntimeConfigFlags.isEnabled_(
          this.runtimeConfig.value.flags,
          RuntimeConfigFlag.enableCurrentFiber
        )
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
