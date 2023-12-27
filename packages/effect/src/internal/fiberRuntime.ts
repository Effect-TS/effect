import * as Boolean from "../Boolean.js"
import type * as Cause from "../Cause.js"
import * as Chunk from "../Chunk.js"
import type * as Clock from "../Clock.js"
import type { ConfigProvider } from "../ConfigProvider.js"
import * as Context from "../Context.js"
import * as Deferred from "../Deferred.js"
import type * as Effect from "../Effect.js"
import { EffectTypeId } from "../Effectable.js"
import type * as Either from "../Either.js"
import * as ExecutionStrategy from "../ExecutionStrategy.js"
import type * as Exit from "../Exit.js"
import type * as Fiber from "../Fiber.js"
import * as FiberId from "../FiberId.js"
import type * as FiberRef from "../FiberRef.js"
import * as FiberRefs from "../FiberRefs.js"
import * as FiberRefsPatch from "../FiberRefsPatch.js"
import * as FiberStatus from "../FiberStatus.js"
import type { LazyArg } from "../Function.js"
import { dual, identity, pipe } from "../Function.js"
import { globalValue } from "../GlobalValue.js"
import * as HashMap from "../HashMap.js"
import * as HashSet from "../HashSet.js"
import type { Logger } from "../Logger.js"
import * as LogLevel from "../LogLevel.js"
import type * as MetricLabel from "../MetricLabel.js"
import * as MRef from "../MutableRef.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import * as Predicate from "../Predicate.js"
import * as RA from "../ReadonlyArray.js"
import * as Ref from "../Ref.js"
import type { Entry, Request } from "../Request.js"
import type * as RequestBlock from "../RequestBlock.js"
import type * as RuntimeFlags from "../RuntimeFlags.js"
import * as RuntimeFlagsPatch from "../RuntimeFlagsPatch.js"
import { currentScheduler, type Scheduler } from "../Scheduler.js"
import type * as Scope from "../Scope.js"
import type * as Supervisor from "../Supervisor.js"
import type * as Tracer from "../Tracer.js"
import type { Concurrency } from "../Types.js"
import * as _RequestBlock from "./blockedRequests.js"
import * as internalCause from "./cause.js"
import * as clock from "./clock.js"
import { currentRequestMap } from "./completedRequestMap.js"
import * as concurrency from "./concurrency.js"
import { configProviderTag } from "./configProvider.js"
import * as internalEffect from "./core-effect.js"
import * as core from "./core.js"
import * as defaultServices from "./defaultServices.js"
import { consoleTag } from "./defaultServices/console.js"
import * as executionStrategy from "./executionStrategy.js"
import * as internalFiber from "./fiber.js"
import * as FiberMessage from "./fiberMessage.js"
import * as fiberRefs from "./fiberRefs.js"
import * as fiberScope from "./fiberScope.js"
import * as internalLogger from "./logger.js"
import * as metric from "./metric.js"
import * as metricBoundaries from "./metric/boundaries.js"
import * as metricLabel from "./metric/label.js"
import * as OpCodes from "./opCodes/effect.js"
import { complete } from "./request.js"
import * as _runtimeFlags from "./runtimeFlags.js"
import { OpSupervision } from "./runtimeFlags.js"
import * as supervisor from "./supervisor.js"
import * as SupervisorPatch from "./supervisor/patch.js"
import * as tracer from "./tracer.js"
import { moduleVersion } from "./version.js"

/** @internal */
export const fiberStarted = metric.counter("effect_fiber_started")
/** @internal */
export const fiberActive = metric.counter("effect_fiber_active")
/** @internal */
export const fiberSuccesses = metric.counter("effect_fiber_successes")
/** @internal */
export const fiberFailures = metric.counter("effect_fiber_failures")
/** @internal */
export const fiberLifetimes = metric.tagged(
  metric.histogram(
    "effect_fiber_lifetimes",
    metricBoundaries.exponential({
      start: 0.5,
      factor: 2,
      count: 35
    })
  ),
  "time_unit",
  "milliseconds"
)

/** @internal */
type EvaluationSignal =
  | EvaluationSignalContinue
  | EvaluationSignalDone
  | EvaluationSignalYieldNow

/** @internal */
const EvaluationSignalContinue = "Continue" as const

/** @internal */
type EvaluationSignalContinue = typeof EvaluationSignalContinue

/** @internal */
const EvaluationSignalDone = "Done" as const

/** @internal */
type EvaluationSignalDone = typeof EvaluationSignalDone

/** @internal */
const EvaluationSignalYieldNow = "Yield" as const

/** @internal */
type EvaluationSignalYieldNow = typeof EvaluationSignalYieldNow

const runtimeFiberVariance = {
  /* c8 ignore next */
  _E: (_: never) => _,
  /* c8 ignore next */
  _A: (_: never) => _
}

const absurd = (_: never): never => {
  throw new Error(
    `BUG: FiberRuntime - ${JSON.stringify(_)} - please report an issue at https://github.com/Effect-TS/effect/issues`
  )
}

const YieldedOp = Symbol.for("effect/internal/fiberRuntime/YieldedOp")
type YieldedOp = typeof YieldedOp
const yieldedOpChannel: {
  currentOp: core.Primitive | null
} = globalValue("effect/internal/fiberRuntime/yieldedOpChannel", () => ({
  currentOp: null
}))

const contOpSuccess = {
  [OpCodes.OP_ON_SUCCESS]: (
    _: FiberRuntime<any, any>,
    cont: core.OnSuccess,
    value: unknown
  ) => {
    return cont.i1(value)
  },
  ["OnStep"]: (
    _: FiberRuntime<any, any>,
    _cont: core.OnStep,
    value: unknown
  ) => {
    return core.exitSucceed(core.exitSucceed(value))
  },
  [OpCodes.OP_ON_SUCCESS_AND_FAILURE]: (
    _: FiberRuntime<any, any>,
    cont: core.OnSuccessAndFailure,
    value: unknown
  ) => {
    return cont.i2(value)
  },
  [OpCodes.OP_REVERT_FLAGS]: (
    self: FiberRuntime<any, any>,
    cont: core.RevertFlags,
    value: unknown
  ) => {
    self.patchRuntimeFlags(self._runtimeFlags, cont.patch)
    if (_runtimeFlags.interruptible(self._runtimeFlags) && self.isInterrupted()) {
      return core.exitFailCause(self.getInterruptedCause())
    } else {
      return core.exitSucceed(value)
    }
  },
  [OpCodes.OP_WHILE]: (
    self: FiberRuntime<any, any>,
    cont: core.While,
    value: unknown
  ) => {
    cont.i2(value)
    if (cont.i0()) {
      self.pushStack(cont)
      return cont.i1()
    } else {
      return core.unit
    }
  }
}

const drainQueueWhileRunningTable = {
  [FiberMessage.OP_INTERRUPT_SIGNAL]: (
    self: FiberRuntime<any, any>,
    runtimeFlags: RuntimeFlags.RuntimeFlags,
    cur: Effect.Effect<any, any, any>,
    message: FiberMessage.FiberMessage & { _tag: FiberMessage.OP_INTERRUPT_SIGNAL }
  ) => {
    self.processNewInterruptSignal(message.cause)
    return _runtimeFlags.interruptible(runtimeFlags) ? core.exitFailCause(message.cause) : cur
  },
  [FiberMessage.OP_RESUME]: (
    _self: FiberRuntime<any, any>,
    _runtimeFlags: RuntimeFlags.RuntimeFlags,
    _cur: Effect.Effect<any, any, any>,
    _message: FiberMessage.FiberMessage
  ) => {
    throw new Error("It is illegal to have multiple concurrent run loops in a single fiber")
  },
  [FiberMessage.OP_STATEFUL]: (
    self: FiberRuntime<any, any>,
    runtimeFlags: RuntimeFlags.RuntimeFlags,
    cur: Effect.Effect<any, any, any>,
    message: FiberMessage.FiberMessage & { _tag: FiberMessage.OP_STATEFUL }
  ) => {
    message.onFiber(self, FiberStatus.running(runtimeFlags))
    return cur
  },
  [FiberMessage.OP_YIELD_NOW]: (
    _self: FiberRuntime<any, any>,
    _runtimeFlags: RuntimeFlags.RuntimeFlags,
    cur: Effect.Effect<any, any, any>,
    _message: FiberMessage.FiberMessage & { _tag: FiberMessage.OP_YIELD_NOW }
  ) => {
    return core.flatMap(core.yieldNow(), () => cur)
  }
}

/**
 * Executes all requests, submitting requests to each data source in parallel.
 */
const runBlockedRequests = (self: RequestBlock.RequestBlock) =>
  core.forEachSequentialDiscard(
    _RequestBlock.flatten(self),
    (requestsByRequestResolver) =>
      forEachConcurrentDiscard(
        _RequestBlock.sequentialCollectionToChunk(requestsByRequestResolver),
        ([dataSource, sequential]) => {
          const map = new Map<Request<any, any>, Entry<any>>()
          for (const block of sequential) {
            for (const entry of block) {
              map.set(entry.request as Request<any, any>, entry)
            }
          }
          return core.fiberRefLocally(
            invokeWithInterrupt(dataSource.runAll(sequential), sequential.flat()),
            currentRequestMap,
            map
          )
        },
        false,
        false
      )
  )

/** @internal */
export interface Snapshot {
  refs: FiberRefs.FiberRefs
  flags: RuntimeFlags.RuntimeFlags
}

/** @internal */
export class FiberRuntime<in out E, in out A> implements Fiber.RuntimeFiber<E, A> {
  readonly [internalFiber.FiberTypeId] = internalFiber.fiberVariance
  readonly [internalFiber.RuntimeFiberTypeId] = runtimeFiberVariance

  pipe() {
    return pipeArguments(this, arguments)
  }

  private _fiberRefs: FiberRefs.FiberRefs
  private _fiberId: FiberId.Runtime
  public _runtimeFlags: RuntimeFlags.RuntimeFlags

  private _queue = new Array<FiberMessage.FiberMessage>()
  private _children: Set<FiberRuntime<any, any>> | null = null
  private _observers = new Array<(exit: Exit.Exit<E, A>) => void>()
  private _running = false
  private _stack: Array<core.Continuation> = []
  private _asyncInterruptor: ((effect: Effect.Effect<any, any, any>) => any) | null = null
  private _asyncBlockingOn: FiberId.FiberId | null = null
  private _exitValue: Exit.Exit<E, A> | null = null
  private _steps: Array<Snapshot> = []
  public _supervisor: Supervisor.Supervisor<any>
  public _scheduler: Scheduler
  private _tracer: Tracer.Tracer
  public currentOpCount: number = 0
  private isYielding = false

  constructor(
    fiberId: FiberId.Runtime,
    fiberRefs0: FiberRefs.FiberRefs,
    runtimeFlags0: RuntimeFlags.RuntimeFlags
  ) {
    this._runtimeFlags = runtimeFlags0
    this._fiberId = fiberId
    this._fiberRefs = fiberRefs0
    this._supervisor = this.getFiberRef(currentSupervisor)
    this._scheduler = this.getFiberRef(currentScheduler)
    if (_runtimeFlags.runtimeMetrics(runtimeFlags0)) {
      const tags = this.getFiberRef(core.currentMetricLabels)
      fiberStarted.unsafeUpdate(1, tags)
      fiberActive.unsafeUpdate(1, tags)
    }
    this._tracer = Context.get(this.getFiberRef(defaultServices.currentServices), tracer.tracerTag)
  }

  /**
   * The identity of the fiber.
   */
  id(): FiberId.Runtime {
    return this._fiberId
  }

  /**
   * Begins execution of the effect associated with this fiber on in the
   * background. This can be called to "kick off" execution of a fiber after
   * it has been created.
   */
  resume<E, A>(effect: Effect.Effect<any, E, A>): void {
    this.tell(FiberMessage.resume(effect))
  }

  /**
   * The status of the fiber.
   */
  get status(): Effect.Effect<never, never, FiberStatus.FiberStatus> {
    return this.ask((_, status) => status)
  }

  /**
   * Gets the fiber runtime flags.
   */
  get runtimeFlags(): Effect.Effect<never, never, RuntimeFlags.RuntimeFlags> {
    return this.ask((state, status) => {
      if (FiberStatus.isDone(status)) {
        return state._runtimeFlags
      }
      return status.runtimeFlags
    })
  }

  /**
   * Returns the current `FiberScope` for the fiber.
   */
  scope(): fiberScope.FiberScope {
    return fiberScope.unsafeMake(this)
  }

  /**
   * Retrieves the immediate children of the fiber.
   */
  get children(): Effect.Effect<never, never, Array<Fiber.RuntimeFiber<any, any>>> {
    return this.ask((fiber) => Array.from(fiber.getChildren()))
  }

  /**
   * Gets the fiber's set of children.
   */
  getChildren(): Set<FiberRuntime<any, any>> {
    if (this._children === null) {
      this._children = new Set()
    }
    return this._children
  }

  /**
   * Retrieves the interrupted cause of the fiber, which will be `Cause.empty`
   * if the fiber has not been interrupted.
   *
   * **NOTE**: This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  getInterruptedCause() {
    return this.getFiberRef(core.currentInterruptedCause)
  }

  /**
   * Retrieves the whole set of fiber refs.
   */
  fiberRefs(): Effect.Effect<never, never, FiberRefs.FiberRefs> {
    return this.ask((fiber) => fiber.getFiberRefs())
  }

  /**
   * Returns an effect that will contain information computed from the fiber
   * state and status while running on the fiber.
   *
   * This allows the outside world to interact safely with mutable fiber state
   * without locks or immutable data.
   */
  ask<Z>(
    f: (runtime: FiberRuntime<any, any>, status: FiberStatus.FiberStatus) => Z
  ): Effect.Effect<never, never, Z> {
    return core.suspend(() => {
      const deferred = core.deferredUnsafeMake<never, Z>(this._fiberId)
      this.tell(
        FiberMessage.stateful((fiber, status) => {
          core.deferredUnsafeDone(deferred, core.sync(() => f(fiber, status)))
        })
      )
      return core.deferredAwait(deferred)
    })
  }

  /**
   * Adds a message to be processed by the fiber on the fiber.
   */
  tell(message: FiberMessage.FiberMessage): void {
    this._queue.push(message)
    if (!this._running) {
      this._running = true
      this.drainQueueLaterOnExecutor()
    }
  }

  get await(): Effect.Effect<never, never, Exit.Exit<E, A>> {
    return core.async<never, never, Exit.Exit<E, A>>((resume) => {
      const cb = (exit: Exit.Exit<E, A>) => resume(core.succeed(exit))
      this.tell(
        FiberMessage.stateful((fiber, _) => {
          if (fiber._exitValue !== null) {
            cb(this._exitValue!)
          } else {
            fiber.addObserver(cb)
          }
        })
      )
      return core.sync(() =>
        this.tell(
          FiberMessage.stateful((fiber, _) => {
            fiber.removeObserver(cb)
          })
        )
      )
    }, this.id())
  }

  get inheritAll(): Effect.Effect<never, never, void> {
    return core.withFiberRuntime<never, never, void>((parentFiber, parentStatus) => {
      const parentFiberId = parentFiber.id()
      const parentFiberRefs = parentFiber.getFiberRefs()
      const parentRuntimeFlags = parentStatus.runtimeFlags
      const childFiberRefs = this.getFiberRefs()
      const updatedFiberRefs = fiberRefs.joinAs(parentFiberRefs, parentFiberId, childFiberRefs)

      parentFiber.setFiberRefs(updatedFiberRefs)

      const updatedRuntimeFlags = parentFiber.getFiberRef(currentRuntimeFlags)

      const patch = pipe(
        _runtimeFlags.diff(parentRuntimeFlags, updatedRuntimeFlags),
        // Do not inherit WindDown or Interruption!
        RuntimeFlagsPatch.exclude(_runtimeFlags.Interruption),
        RuntimeFlagsPatch.exclude(_runtimeFlags.WindDown)
      )

      return core.updateRuntimeFlags(patch)
    })
  }

  /**
   * Tentatively observes the fiber, but returns immediately if it is not
   * already done.
   */
  get poll(): Effect.Effect<never, never, Option.Option<Exit.Exit<E, A>>> {
    return core.sync(() => Option.fromNullable(this._exitValue))
  }

  /**
   * Unsafely observes the fiber, but returns immediately if it is not
   * already done.
   */
  unsafePoll(): Exit.Exit<E, A> | null {
    return this._exitValue
  }

  /**
   * In the background, interrupts the fiber as if interrupted from the specified fiber.
   */
  interruptAsFork(fiberId: FiberId.FiberId): Effect.Effect<never, never, void> {
    return core.sync(() => this.tell(FiberMessage.interruptSignal(internalCause.interrupt(fiberId))))
  }

  /**
   * In the background, interrupts the fiber as if interrupted from the specified fiber.
   */
  unsafeInterruptAsFork(fiberId: FiberId.FiberId) {
    this.tell(FiberMessage.interruptSignal(internalCause.interrupt(fiberId)))
  }

  /**
   * Adds an observer to the list of observers.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  addObserver(observer: (exit: Exit.Exit<E, A>) => void): void {
    if (this._exitValue !== null) {
      observer(this._exitValue!)
    } else {
      this._observers.push(observer)
    }
  }

  /**
   * Removes the specified observer from the list of observers that will be
   * notified when the fiber exits.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  removeObserver(observer: (exit: Exit.Exit<E, A>) => void): void {
    this._observers = this._observers.filter((o) => o !== observer)
  }
  /**
   * Retrieves all fiber refs of the fiber.
   *
   * **NOTE**: This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  getFiberRefs(): FiberRefs.FiberRefs {
    this.setFiberRef(currentRuntimeFlags, this._runtimeFlags)
    return this._fiberRefs
  }

  /**
   * Deletes the specified fiber ref.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  unsafeDeleteFiberRef<X>(fiberRef: FiberRef.FiberRef<X>): void {
    this._fiberRefs = fiberRefs.delete_(this._fiberRefs, fiberRef)
  }

  /**
   * Retrieves the state of the fiber ref, or else its initial value.
   *
   * **NOTE**: This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  getFiberRef<X>(fiberRef: FiberRef.FiberRef<X>): X {
    if (this._fiberRefs.locals.has(fiberRef)) {
      return this._fiberRefs.locals.get(fiberRef)![0][1] as X
    }
    return fiberRef.initial
  }

  /**
   * Sets the fiber ref to the specified value.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  setFiberRef<X>(fiberRef: FiberRef.FiberRef<X>, value: X): void {
    this._fiberRefs = fiberRefs.updateAs(this._fiberRefs, {
      fiberId: this._fiberId,
      fiberRef,
      value
    })
    this.refreshRefCache()
  }

  refreshRefCache() {
    this._tracer = Context.get(this.getFiberRef(defaultServices.currentServices), tracer.tracerTag)
    this._supervisor = this.getFiberRef(currentSupervisor)
    this._scheduler = this.getFiberRef(currentScheduler)
  }

  /**
   * Wholesale replaces all fiber refs of this fiber.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  setFiberRefs(fiberRefs: FiberRefs.FiberRefs): void {
    this._fiberRefs = fiberRefs
    this.refreshRefCache()
  }

  /**
   * Adds a reference to the specified fiber inside the children set.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  addChild(child: FiberRuntime<any, any>) {
    this.getChildren().add(child)
  }

  /**
   * Removes a reference to the specified fiber inside the children set.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  removeChild(child: FiberRuntime<any, any>) {
    this.getChildren().delete(child)
  }

  /**
   * On the current thread, executes all messages in the fiber's inbox. This
   * method may return before all work is done, in the event the fiber executes
   * an asynchronous operation.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  drainQueueOnCurrentThread() {
    let recurse = true
    while (recurse) {
      let evaluationSignal: EvaluationSignal = EvaluationSignalContinue
      const prev = (globalThis as any)[internalFiber.currentFiberURI]
      ;(globalThis as any)[internalFiber.currentFiberURI] = this
      try {
        while (evaluationSignal === EvaluationSignalContinue) {
          evaluationSignal = this._queue.length === 0 ?
            EvaluationSignalDone :
            this.evaluateMessageWhileSuspended(this._queue.splice(0, 1)[0]!)
        }
      } finally {
        this._running = false
        ;(globalThis as any)[internalFiber.currentFiberURI] = prev
      }
      // Maybe someone added something to the queue between us checking, and us
      // giving up the drain. If so, we need to restart the draining, but only
      // if we beat everyone else to the restart:
      if (this._queue.length > 0 && !this._running) {
        this._running = true
        if (evaluationSignal === EvaluationSignalYieldNow) {
          this.drainQueueLaterOnExecutor()
          recurse = false
        } else {
          recurse = true
        }
      } else {
        recurse = false
      }
    }
  }

  /**
   * Schedules the execution of all messages in the fiber's inbox.
   *
   * This method will return immediately after the scheduling
   * operation is completed, but potentially before such messages have been
   * executed.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  drainQueueLaterOnExecutor() {
    this._scheduler.scheduleTask(
      this.run,
      this.getFiberRef(core.currentSchedulingPriority)
    )
  }

  /**
   * Drains the fiber's message queue while the fiber is actively running,
   * returning the next effect to execute, which may be the input effect if no
   * additional effect needs to be executed.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  drainQueueWhileRunning(
    runtimeFlags: RuntimeFlags.RuntimeFlags,
    cur0: Effect.Effect<any, any, any>
  ) {
    let cur = cur0
    while (this._queue.length > 0) {
      const message = this._queue.splice(0, 1)[0]
      // @ts-expect-error
      cur = drainQueueWhileRunningTable[message._tag](this, runtimeFlags, cur, message)
    }
    return cur
  }

  /**
   * Determines if the fiber is interrupted.
   *
   * **NOTE**: This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  isInterrupted(): boolean {
    return !internalCause.isEmpty(this.getFiberRef(core.currentInterruptedCause))
  }

  /**
   * Adds an interruptor to the set of interruptors that are interrupting this
   * fiber.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  addInterruptedCause(cause: Cause.Cause<never>) {
    const oldSC = this.getFiberRef(core.currentInterruptedCause)
    this.setFiberRef(core.currentInterruptedCause, internalCause.sequential(oldSC, cause))
  }

  /**
   * Processes a new incoming interrupt signal.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  processNewInterruptSignal(cause: Cause.Cause<never>): void {
    this.addInterruptedCause(cause)
    this.sendInterruptSignalToAllChildren()
  }

  /**
   * Interrupts all children of the current fiber, returning an effect that will
   * await the exit of the children. This method will return null if the fiber
   * has no children.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  sendInterruptSignalToAllChildren(): boolean {
    if (this._children === null || this._children.size === 0) {
      return false
    }
    let told = false
    for (const child of this._children) {
      child.tell(FiberMessage.interruptSignal(internalCause.interrupt(this.id())))
      told = true
    }
    return told
  }

  /**
   * Interrupts all children of the current fiber, returning an effect that will
   * await the exit of the children. This method will return null if the fiber
   * has no children.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  interruptAllChildren() {
    if (this.sendInterruptSignalToAllChildren()) {
      const it = this._children!.values()
      this._children = null
      let isDone = false
      const body = () => {
        const next = it.next()
        if (!next.done) {
          return core.asUnit(next.value.await)
        } else {
          return core.sync(() => {
            isDone = true
          })
        }
      }
      return core.whileLoop({
        while: () => !isDone,
        body,
        step: () => {
          //
        }
      })
    }
    return null
  }

  reportExitValue(exit: Exit.Exit<E, A>) {
    if (_runtimeFlags.runtimeMetrics(this._runtimeFlags)) {
      const tags = this.getFiberRef(core.currentMetricLabels)
      const startTimeMillis = this.id().startTimeMillis
      const endTimeMillis = Date.now()
      fiberLifetimes.unsafeUpdate(endTimeMillis - startTimeMillis, tags)
      fiberActive.unsafeUpdate(-1, tags)
      switch (exit._tag) {
        case OpCodes.OP_SUCCESS: {
          fiberSuccesses.unsafeUpdate(1, tags)
          break
        }
        case OpCodes.OP_FAILURE: {
          fiberFailures.unsafeUpdate(1, tags)
          break
        }
      }
    }
    if (exit._tag === "Failure") {
      const level = this.getFiberRef(core.currentUnhandledErrorLogLevel)
      if (!internalCause.isInterruptedOnly(exit.cause) && level._tag === "Some") {
        this.log("Fiber terminated with a non handled error", exit.cause, level)
      }
    }
  }

  setExitValue(exit: Exit.Exit<E, A>) {
    this._exitValue = exit
    this.reportExitValue(exit)
    for (let i = this._observers.length - 1; i >= 0; i--) {
      this._observers[i](exit)
    }
  }

  getLoggers() {
    return this.getFiberRef(currentLoggers)
  }

  log(
    message: unknown,
    cause: Cause.Cause<any>,
    overrideLogLevel: Option.Option<LogLevel.LogLevel>
  ): void {
    const logLevel = Option.isSome(overrideLogLevel) ?
      overrideLogLevel.value :
      this.getFiberRef(core.currentLogLevel)
    const minimumLogLevel = this.getFiberRef(currentMinimumLogLevel)
    if (LogLevel.greaterThan(minimumLogLevel, logLevel)) {
      return
    }
    const spans = this.getFiberRef(core.currentLogSpan)
    const annotations = this.getFiberRef(core.currentLogAnnotations)
    const loggers = this.getLoggers()
    const contextMap = this.getFiberRefs()
    if (HashSet.size(loggers) > 0) {
      const clockService = Context.get(this.getFiberRef(defaultServices.currentServices), clock.clockTag)
      const date = new Date(clockService.unsafeCurrentTimeMillis())
      for (const logger of loggers) {
        logger.log({
          fiberId: this.id(),
          logLevel,
          message,
          cause,
          context: contextMap,
          spans,
          annotations,
          date
        })
      }
    }
  }

  /**
   * Evaluates a single message on the current thread, while the fiber is
   * suspended. This method should only be called while evaluation of the
   * fiber's effect is suspended due to an asynchronous operation.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  evaluateMessageWhileSuspended(message: FiberMessage.FiberMessage): EvaluationSignal {
    switch (message._tag) {
      case FiberMessage.OP_YIELD_NOW: {
        return EvaluationSignalYieldNow
      }
      case FiberMessage.OP_INTERRUPT_SIGNAL: {
        this.processNewInterruptSignal(message.cause)
        if (this._asyncInterruptor !== null) {
          this._asyncInterruptor(core.exitFailCause(message.cause))
          this._asyncInterruptor = null
        }
        return EvaluationSignalContinue
      }
      case FiberMessage.OP_RESUME: {
        this._asyncInterruptor = null
        this._asyncBlockingOn = null
        this.evaluateEffect(message.effect)
        return EvaluationSignalContinue
      }
      case FiberMessage.OP_STATEFUL: {
        message.onFiber(
          this,
          this._exitValue !== null ?
            FiberStatus.done :
            FiberStatus.suspended(this._runtimeFlags, this._asyncBlockingOn!)
        )
        return EvaluationSignalContinue
      }
      default: {
        return absurd(message)
      }
    }
  }

  /**
   * Evaluates an effect until completion, potentially asynchronously.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  evaluateEffect(effect0: Effect.Effect<any, any, any>) {
    this._supervisor.onResume(this)
    try {
      let effect: Effect.Effect<any, any, any> | null =
        _runtimeFlags.interruptible(this._runtimeFlags) && this.isInterrupted() ?
          core.exitFailCause(this.getInterruptedCause()) :
          effect0
      while (effect !== null) {
        const eff: Effect.Effect<any, any, any> = effect
        const exit = this.runLoop(eff)
        if (exit === YieldedOp) {
          const op = yieldedOpChannel.currentOp!
          yieldedOpChannel.currentOp = null
          if (op._op === OpCodes.OP_YIELD) {
            if (_runtimeFlags.cooperativeYielding(this._runtimeFlags)) {
              this.tell(FiberMessage.yieldNow())
              this.tell(FiberMessage.resume(core.exitUnit))
              effect = null
            } else {
              effect = core.exitUnit
            }
          } else if (op._op === OpCodes.OP_ASYNC) {
            // Terminate this evaluation, async resumption will continue evaluation:
            effect = null
          }
        } else {
          this._runtimeFlags = pipe(this._runtimeFlags, _runtimeFlags.enable(_runtimeFlags.WindDown))
          const interruption = this.interruptAllChildren()
          if (interruption !== null) {
            effect = core.flatMap(interruption, () => exit)
          } else {
            if (this._queue.length === 0) {
              // No more messages to process, so we will allow the fiber to end life:
              this.setExitValue(exit)
            } else {
              // There are messages, possibly added by the final op executed by
              // the fiber. To be safe, we should execute those now before we
              // allow the fiber to end life:
              this.tell(FiberMessage.resume(exit))
            }
            effect = null
          }
        }
      }
    } finally {
      this._supervisor.onSuspend(this)
    }
  }

  /**
   * Begins execution of the effect associated with this fiber on the current
   * thread. This can be called to "kick off" execution of a fiber after it has
   * been created, in hopes that the effect can be executed synchronously.
   *
   * This is not the normal way of starting a fiber, but it is useful when the
   * express goal of executing the fiber is to synchronously produce its exit.
   */
  start<R>(effect: Effect.Effect<R, E, A>): void {
    if (!this._running) {
      this._running = true
      const prev = (globalThis as any)[internalFiber.currentFiberURI]
      ;(globalThis as any)[internalFiber.currentFiberURI] = this
      try {
        this.evaluateEffect(effect)
      } finally {
        this._running = false
        ;(globalThis as any)[internalFiber.currentFiberURI] = prev
        // Because we're special casing `start`, we have to be responsible
        // for spinning up the fiber if there were new messages added to
        // the queue between the completion of the effect and the transition
        // to the not running state.
        if (this._queue.length > 0) {
          this.drainQueueLaterOnExecutor()
        }
      }
    } else {
      this.tell(FiberMessage.resume(effect))
    }
  }

  /**
   * Begins execution of the effect associated with this fiber on in the
   * background, and on the correct thread pool. This can be called to "kick
   * off" execution of a fiber after it has been created, in hopes that the
   * effect can be executed synchronously.
   */
  startFork<R>(effect: Effect.Effect<R, E, A>): void {
    this.tell(FiberMessage.resume(effect))
  }

  /**
   * Takes the current runtime flags, patches them to return the new runtime
   * flags, and then makes any changes necessary to fiber state based on the
   * specified patch.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  patchRuntimeFlags(oldRuntimeFlags: RuntimeFlags.RuntimeFlags, patch: RuntimeFlagsPatch.RuntimeFlagsPatch) {
    const newRuntimeFlags = _runtimeFlags.patch(oldRuntimeFlags, patch)
    ;(globalThis as any)[internalFiber.currentFiberURI] = this
    this._runtimeFlags = newRuntimeFlags
    return newRuntimeFlags
  }

  /**
   * Initiates an asynchronous operation, by building a callback that will
   * resume execution, and then feeding that callback to the registration
   * function, handling error cases and repeated resumptions appropriately.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  initiateAsync(
    runtimeFlags: RuntimeFlags.RuntimeFlags,
    asyncRegister: (resume: (effect: Effect.Effect<any, any, any>) => void) => void
  ) {
    let alreadyCalled = false
    const callback = (effect: Effect.Effect<any, any, any>) => {
      if (!alreadyCalled) {
        alreadyCalled = true
        this.tell(FiberMessage.resume(effect))
      }
    }
    if (_runtimeFlags.interruptible(runtimeFlags)) {
      this._asyncInterruptor = callback
    }
    try {
      asyncRegister(callback)
    } catch (e) {
      callback(core.failCause(internalCause.die(e)))
    }
  }

  pushStack(cont: core.Continuation) {
    this._stack.push(cont)
    if (cont._op === "OnStep") {
      this._steps.push({ refs: this.getFiberRefs(), flags: this._runtimeFlags })
    }
  }

  popStack() {
    const item = this._stack.pop()
    if (item) {
      if (item._op === "OnStep") {
        this._steps.pop()
      }
      return item
    }
    return
  }

  getNextSuccessCont() {
    let frame = this.popStack()
    while (frame) {
      if (frame._op !== OpCodes.OP_ON_FAILURE) {
        return frame
      }
      frame = this.popStack()
    }
  }

  getNextFailCont() {
    let frame = this.popStack()
    while (frame) {
      if (frame._op !== OpCodes.OP_ON_SUCCESS && frame._op !== OpCodes.OP_WHILE) {
        return frame
      }
      frame = this.popStack()
    }
  }

  [OpCodes.OP_TAG](op: core.Primitive & { _op: OpCodes.OP_SYNC }) {
    return core.map(
      core.fiberRefGet(core.currentContext),
      (context) => Context.unsafeGet(context, op as unknown as Context.Tag<any, any>)
    )
  }

  ["Left"](op: core.Primitive & { _op: "Left" }) {
    return core.fail(op.left)
  }

  ["None"](_: core.Primitive & { _op: "None" }) {
    return core.fail(new core.NoSuchElementException())
  }

  ["Right"](op: core.Primitive & { _op: "Right" }) {
    return core.exitSucceed(op.right)
  }

  ["Some"](op: core.Primitive & { _op: "Some" }) {
    return core.exitSucceed(op.value)
  }

  [OpCodes.OP_SYNC](op: core.Primitive & { _op: OpCodes.OP_SYNC }) {
    const value = op.i0()
    const cont = this.getNextSuccessCont()
    if (cont !== undefined) {
      if (!(cont._op in contOpSuccess)) {
        // @ts-expect-error
        absurd(cont)
      }
      // @ts-expect-error
      return contOpSuccess[cont._op](this, cont, value)
    } else {
      yieldedOpChannel.currentOp = core.exitSucceed(value) as any
      return YieldedOp
    }
  }

  [OpCodes.OP_SUCCESS](op: core.Primitive & { _op: OpCodes.OP_SUCCESS }) {
    const oldCur = op
    const cont = this.getNextSuccessCont()
    if (cont !== undefined) {
      if (!(cont._op in contOpSuccess)) {
        // @ts-expect-error
        absurd(cont)
      }
      // @ts-expect-error
      return contOpSuccess[cont._op](this, cont, oldCur.i0)
    } else {
      yieldedOpChannel.currentOp = oldCur
      return YieldedOp
    }
  }

  [OpCodes.OP_FAILURE](op: core.Primitive & { _op: OpCodes.OP_FAILURE }) {
    const cause = op.i0
    const cont = this.getNextFailCont()
    if (cont !== undefined) {
      switch (cont._op) {
        case OpCodes.OP_ON_FAILURE:
        case OpCodes.OP_ON_SUCCESS_AND_FAILURE: {
          if (!(_runtimeFlags.interruptible(this._runtimeFlags) && this.isInterrupted())) {
            return cont.i1(cause)
          } else {
            return core.exitFailCause(internalCause.stripFailures(cause))
          }
        }
        case "OnStep": {
          if (!(_runtimeFlags.interruptible(this._runtimeFlags) && this.isInterrupted())) {
            return core.exitSucceed(core.exitFailCause(cause))
          } else {
            return core.exitFailCause(internalCause.stripFailures(cause))
          }
        }
        case OpCodes.OP_REVERT_FLAGS: {
          this.patchRuntimeFlags(this._runtimeFlags, cont.patch)
          if (_runtimeFlags.interruptible(this._runtimeFlags) && this.isInterrupted()) {
            return core.exitFailCause(internalCause.sequential(cause, this.getInterruptedCause()))
          } else {
            return core.exitFailCause(cause)
          }
        }
        default: {
          absurd(cont)
        }
      }
    } else {
      yieldedOpChannel.currentOp = core.exitFailCause(cause) as any
      return YieldedOp
    }
  }

  [OpCodes.OP_WITH_RUNTIME](op: core.Primitive & { _op: OpCodes.OP_WITH_RUNTIME }) {
    return op.i0(
      this as FiberRuntime<unknown, unknown>,
      FiberStatus.running(this._runtimeFlags) as FiberStatus.Running
    )
  }

  ["Blocked"](op: core.Primitive & { _op: "Blocked" }) {
    const refs = this.getFiberRefs()
    const flags = this._runtimeFlags
    if (this._steps.length > 0) {
      const frames: Array<core.Continuation> = []
      const snap = this._steps[this._steps.length - 1]
      let frame = this.popStack()
      while (frame && frame._op !== "OnStep") {
        frames.push(frame)
        frame = this.popStack()
      }
      this.setFiberRefs(snap.refs)
      this._runtimeFlags = snap.flags
      const patchRefs = FiberRefsPatch.diff(snap.refs, refs)
      const patchFlags = _runtimeFlags.diff(snap.flags, flags)
      return core.exitSucceed(core.blocked(
        op.i0,
        core.withFiberRuntime((newFiber) => {
          while (frames.length > 0) {
            newFiber.pushStack(frames.pop()!)
          }
          newFiber.setFiberRefs(
            FiberRefsPatch.patch(newFiber.id(), newFiber.getFiberRefs())(patchRefs)
          )
          newFiber._runtimeFlags = _runtimeFlags.patch(patchFlags)(newFiber._runtimeFlags)
          return op.i1
        })
      ))
    }
    return core.uninterruptibleMask((restore) =>
      core.flatMap(
        forkDaemon(core.runRequestBlock(op.i0)),
        () => restore(op.i1)
      )
    )
  }

  ["RunBlocked"](op: core.Primitive & { _op: "RunBlocked" }) {
    return runBlockedRequests(op.i0)
  }

  [OpCodes.OP_UPDATE_RUNTIME_FLAGS](op: core.Primitive & { _op: OpCodes.OP_UPDATE_RUNTIME_FLAGS }) {
    const updateFlags = op.i0
    const oldRuntimeFlags = this._runtimeFlags
    const newRuntimeFlags = _runtimeFlags.patch(oldRuntimeFlags, updateFlags)
    // One more chance to short circuit: if we're immediately going
    // to interrupt. Interruption will cause immediate reversion of
    // the flag, so as long as we "peek ahead", there's no need to
    // set them to begin with.
    if (_runtimeFlags.interruptible(newRuntimeFlags) && this.isInterrupted()) {
      return core.exitFailCause(this.getInterruptedCause())
    } else {
      // Impossible to short circuit, so record the changes
      this.patchRuntimeFlags(this._runtimeFlags, updateFlags)
      if (op.i1) {
        // Since we updated the flags, we need to revert them
        const revertFlags = _runtimeFlags.diff(newRuntimeFlags, oldRuntimeFlags)
        this.pushStack(new core.RevertFlags(revertFlags, op))
        return op.i1(oldRuntimeFlags)
      } else {
        return core.exitUnit
      }
    }
  }

  [OpCodes.OP_ON_SUCCESS](op: core.Primitive & { _op: OpCodes.OP_ON_SUCCESS }) {
    this.pushStack(op)
    return op.i0
  }

  ["OnStep"](op: core.Primitive & { _op: "OnStep" }) {
    this.pushStack(op)
    return op.i0
  }

  [OpCodes.OP_ON_FAILURE](op: core.Primitive & { _op: OpCodes.OP_ON_FAILURE }) {
    this.pushStack(op)
    return op.i0
  }

  [OpCodes.OP_ON_SUCCESS_AND_FAILURE](op: core.Primitive & { _op: OpCodes.OP_ON_SUCCESS_AND_FAILURE }) {
    this.pushStack(op)
    return op.i0
  }

  [OpCodes.OP_ASYNC](op: core.Primitive & { _op: OpCodes.OP_ASYNC }) {
    this._asyncBlockingOn = op.i1
    this.initiateAsync(this._runtimeFlags, op.i0)
    yieldedOpChannel.currentOp = op
    return YieldedOp
  }

  [OpCodes.OP_YIELD](op: core.Primitive & { op: OpCodes.OP_YIELD }) {
    this.isYielding = false
    yieldedOpChannel.currentOp = op
    return YieldedOp
  }

  [OpCodes.OP_WHILE](op: core.Primitive & { _op: OpCodes.OP_WHILE }) {
    const check = op.i0
    const body = op.i1
    if (check()) {
      this.pushStack(op)
      return body()
    } else {
      return core.exitUnit
    }
  }

  [OpCodes.OP_COMMIT](op: core.Primitive & { _op: OpCodes.OP_COMMIT }) {
    return op.commit()
  }

  /**
   * The main run-loop for evaluating effects.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  runLoop(effect0: Effect.Effect<any, any, any>): Exit.Exit<any, any> | YieldedOp {
    let cur: Effect.Effect<any, any, any> | YieldedOp = effect0
    this.currentOpCount = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if ((this._runtimeFlags & OpSupervision) !== 0) {
        this._supervisor.onEffect(this, cur)
      }
      if (this._queue.length > 0) {
        cur = this.drainQueueWhileRunning(this._runtimeFlags, cur)
      }
      if (!this.isYielding) {
        this.currentOpCount += 1
        const shouldYield = this._scheduler.shouldYield(this)
        if (shouldYield !== false) {
          this.isYielding = true
          this.currentOpCount = 0
          const oldCur = cur
          cur = core.flatMap(core.yieldNow({ priority: shouldYield }), () => oldCur)
        }
      }
      try {
        if (!("_op" in cur) || !((cur as core.Primitive)._op in this)) {
          // @ts-expect-error
          absurd(cur)
        }

        // @ts-expect-error
        cur = this._tracer.context(
          () => {
            if (moduleVersion !== (cur as core.Primitive)[EffectTypeId]._V) {
              return core.dieMessage(
                `Cannot execute an Effect versioned ${
                  (cur as core.Primitive)[EffectTypeId]._V
                } with a Runtime of version ${moduleVersion}`
              )
            }
            // @ts-expect-error
            return this[(cur as core.Primitive)._op](cur as core.Primitive)
          },
          this
        )

        if (cur === YieldedOp) {
          const op = yieldedOpChannel.currentOp!
          if (
            op._op === OpCodes.OP_YIELD ||
            op._op === OpCodes.OP_ASYNC
          ) {
            return YieldedOp
          }

          yieldedOpChannel.currentOp = null
          return (
              op._op === OpCodes.OP_SUCCESS ||
              op._op === OpCodes.OP_FAILURE
            ) ?
            op as unknown as Exit.Exit<E, A> :
            core.exitFailCause(internalCause.die(op))
        }
      } catch (e) {
        if (core.isEffectError(e)) {
          cur = core.exitFailCause(e.cause)
        } else if (core.isInterruptedException(e)) {
          cur = core.exitFailCause(
            internalCause.sequential(internalCause.die(e), internalCause.interrupt(FiberId.none))
          )
        } else {
          cur = core.exitFailCause(internalCause.die(e))
        }
      }
    }
  }

  run = () => {
    this.drainQueueOnCurrentThread()
  }
}

// circular with Logger

/** @internal */
export const currentMinimumLogLevel: FiberRef.FiberRef<LogLevel.LogLevel> = globalValue(
  "effect/FiberRef/currentMinimumLogLevel",
  () => core.fiberRefUnsafeMake<LogLevel.LogLevel>(LogLevel.fromLiteral("Info"))
)

/** @internal */
export const getConsole = (refs: FiberRefs.FiberRefs) => {
  const defaultServicesValue = FiberRefs.getOrDefault(refs, defaultServices.currentServices)
  const cnsl = Context.get(defaultServicesValue, consoleTag)
  return cnsl.unsafe
}

/** @internal */
export const defaultLogger: Logger<unknown, void> = globalValue(
  Symbol.for("effect/Logger/defaultLogger"),
  () =>
    internalLogger.makeLogger((options) => {
      const formatted = internalLogger.stringLogger.log(options)
      getConsole(options.context).log(formatted)
    })
)

/** @internal */
export const logFmtLogger: Logger<unknown, void> = globalValue(
  Symbol.for("effect/Logger/logFmtLogger"),
  () =>
    internalLogger.makeLogger((options) => {
      const formatted = internalLogger.logfmtLogger.log(options)
      getConsole(options.context).log(formatted)
    })
)

/** @internal */
export const tracerLogger = globalValue(
  Symbol.for("effect/Logger/tracerLogger"),
  () =>
    internalLogger.makeLogger<unknown, void>(({
      annotations,
      cause,
      context,
      fiberId,
      logLevel,
      message
    }) => {
      const span = Option.flatMap(fiberRefs.get(context, core.currentContext), Context.getOption(tracer.spanTag))
      const clockService = Option.map(
        fiberRefs.get(context, defaultServices.currentServices),
        (_) => Context.get(_, clock.clockTag)
      )
      if (span._tag === "None" || span.value._tag === "ExternalSpan" || clockService._tag === "None") {
        return
      }

      const attributes = Object.fromEntries(HashMap.map(annotations, (value) => internalLogger.serializeUnknown(value)))
      attributes["effect.fiberId"] = FiberId.threadName(fiberId)
      attributes["effect.logLevel"] = logLevel.label

      if (cause !== null && cause._tag !== "Empty") {
        attributes["effect.cause"] = internalCause.pretty(cause)
      }

      span.value.event(
        String(message),
        clockService.value.unsafeCurrentTimeNanos(),
        attributes
      )
    })
)

/** @internal */
export const loggerWithSpanAnnotations = <Message, Output>(self: Logger<Message, Output>): Logger<Message, Output> =>
  internalLogger.mapInputOptions(self, (options: Logger.Options<Message>) => {
    const span = Option.flatMap(fiberRefs.get(options.context, core.currentContext), Context.getOption(tracer.spanTag))
    if (span._tag === "None") {
      return options
    }
    return {
      ...options,
      annotations: pipe(
        options.annotations,
        HashMap.set("effect.traceId", span.value.traceId as unknown),
        HashMap.set("effect.spanId", span.value.spanId as unknown),
        span.value._tag === "Span" ? HashMap.set("effect.spanName", span.value.name as unknown) : identity
      )
    }
  })

/** @internal */
export const currentLoggers: FiberRef.FiberRef<
  HashSet.HashSet<Logger<unknown, any>>
> = globalValue(
  Symbol.for("effect/FiberRef/currentLoggers"),
  () => core.fiberRefUnsafeMakeHashSet(HashSet.make(defaultLogger, tracerLogger))
)

// circular with Effect

/* @internal */
export const acquireRelease: {
  <A, R2, X>(
    release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
  ): <R, E>(acquire: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R | Scope.Scope, E, A>
  <R, E, A, R2, X>(
    acquire: Effect.Effect<R, E, A>,
    release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
  ): Effect.Effect<Scope.Scope | R | R2, E, A>
} = dual<
  {
    <A, R2, X>(
      release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
    ): <R, E>(acquire: Effect.Effect<R, E, A>) => Effect.Effect<R | R2 | Scope.Scope, E, A>
  },
  {
    <R, E, A, R2, X>(
      acquire: Effect.Effect<R, E, A>,
      release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
    ): Effect.Effect<R | R2 | Scope.Scope, E, A>
  }
>((args) => core.isEffect(args[0]), (acquire, release) => {
  return core.uninterruptible(
    core.tap(acquire, (a) => addFinalizer((exit) => release(a, exit)))
  )
})

/* @internal */
export const acquireReleaseInterruptible: {
  <A, R2, X>(
    release: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
  ): <R, E>(acquire: Effect.Effect<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E, A>
  <R, E, A, R2, X>(
    acquire: Effect.Effect<R, E, A>,
    release: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
  ): Effect.Effect<Scope.Scope | R | R2, E, A>
} = dual<
  {
    <A, R2, X>(
      release: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
    ): <R, E>(acquire: Effect.Effect<R, E, A>) => Effect.Effect<R | R2 | Scope.Scope, E, A>
  },
  {
    <R, E, A, R2, X>(
      acquire: Effect.Effect<R, E, A>,
      release: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
    ): Effect.Effect<R | R2 | Scope.Scope, E, A>
  }
>((args) => core.isEffect(args[0]), (acquire, release) => {
  return ensuring(
    acquire,
    addFinalizer((exit) => release(exit))
  )
})

/* @internal */
export const addFinalizer = <R, X>(
  finalizer: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R, never, X>
): Effect.Effect<R | Scope.Scope, never, void> =>
  core.withFiberRuntime(
    (runtime) => {
      const acquireRefs = runtime.getFiberRefs()
      const acquireFlags = runtime._runtimeFlags
      return core.flatMap(scope, (scope) =>
        core.scopeAddFinalizerExit(scope, (exit) =>
          core.withFiberRuntime((runtimeFinalizer) => {
            const preRefs = runtimeFinalizer.getFiberRefs()
            const preFlags = runtimeFinalizer._runtimeFlags
            const patchRefs = FiberRefsPatch.diff(preRefs, acquireRefs)
            const patchFlags = _runtimeFlags.diff(preFlags, acquireFlags)
            const inverseRefs = FiberRefsPatch.diff(acquireRefs, preRefs)
            runtimeFinalizer.setFiberRefs(
              FiberRefsPatch.patch(patchRefs, runtimeFinalizer.id(), acquireRefs)
            )

            return ensuring(
              core.withRuntimeFlags(finalizer(exit) as Effect.Effect<never, never, X>, patchFlags),
              core.sync(() => {
                runtimeFinalizer.setFiberRefs(
                  FiberRefsPatch.patch(inverseRefs, runtimeFinalizer.id(), runtimeFinalizer.getFiberRefs())
                )
              })
            )
          })))
    }
  )

/* @internal */
export const daemonChildren = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const forkScope = core.fiberRefLocally(core.currentForkScopeOverride, Option.some(fiberScope.globalScope))
  return forkScope(self)
}

/** @internal */
const _existsParFound = Symbol.for("effect/Effect/existsPar/found")

/* @internal */
export const exists = dual<
  <R, E, A>(f: (a: A, i: number) => Effect.Effect<R, E, boolean>, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
  }) => (elements: Iterable<A>) => Effect.Effect<R, E, boolean>,
  <R, E, A>(elements: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, boolean>, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
  }) => Effect.Effect<R, E, boolean>
>((args) => Predicate.isIterable(args[0]), (elements, f, options) =>
  concurrency.matchSimple(
    options?.concurrency,
    () => core.suspend(() => existsLoop(elements[Symbol.iterator](), 0, f)),
    () =>
      core.matchEffect(
        forEach(
          elements,
          (a, i) => core.if_(f(a, i), { onTrue: core.fail(_existsParFound), onFalse: core.unit }),
          options
        ),
        {
          onFailure: (e) => e === _existsParFound ? core.succeed(true) : core.fail(e),
          onSuccess: () => core.succeed(false)
        }
      )
  ))

const existsLoop = <R, E, A>(
  iterator: Iterator<A>,
  index: number,
  f: (a: A, i: number) => Effect.Effect<R, E, boolean>
): Effect.Effect<R, E, boolean> => {
  const next = iterator.next()
  if (next.done) {
    return core.succeed(false)
  }
  return pipe(core.flatMap(
    f(next.value, index),
    (b) => b ? core.succeed(b) : existsLoop(iterator, index + 1, f)
  ))
}

/* @internal */
export const filter = dual<
  <A, R, E>(
    f: (a: A, i: number) => Effect.Effect<R, E, boolean>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly negate?: boolean | undefined
    }
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Array<A>>,
  <A, R, E>(elements: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, boolean>, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
    readonly negate?: boolean | undefined
  }) => Effect.Effect<R, E, Array<A>>
>(
  (args) => Predicate.isIterable(args[0]),
  <A, R, E>(elements: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, boolean>, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
    readonly negate?: boolean | undefined
  }) => {
    const predicate = options?.negate ? (a: A, i: number) => core.map(f(a, i), Boolean.not) : f
    return concurrency.matchSimple(
      options?.concurrency,
      () =>
        core.suspend(() =>
          RA.fromIterable(elements).reduceRight(
            (effect, a, i) =>
              core.zipWith(
                effect,
                core.suspend(() => predicate(a, i)),
                (list, b) => b ? [a, ...list] : list
              ),
            core.sync(() => new Array<A>()) as Effect.Effect<R, E, Array<A>>
          )
        ),
      () =>
        core.map(
          forEach(
            elements,
            (a, i) => core.map(predicate(a, i), (b) => (b ? Option.some(a) : Option.none())),
            options
          ),
          RA.getSomes
        )
    )
  }
)

// === all

const allResolveInput = (
  input: Iterable<Effect.Effect<any, any, any>> | Record<string, Effect.Effect<any, any, any>>
): [Iterable<Effect.Effect<any, any, any>>, Option.Option<(as: ReadonlyArray<any>) => any>] => {
  if (Array.isArray(input) || Predicate.isIterable(input)) {
    return [input, Option.none()]
  }
  const keys = Object.keys(input)
  const size = keys.length
  return [
    keys.map((k) => input[k]),
    Option.some((values: ReadonlyArray<any>) => {
      const res = {}
      for (let i = 0; i < size; i++) {
        ;(res as any)[keys[i]] = values[i]
      }
      return res
    })
  ]
}

const allValidate = (
  effects: Iterable<Effect.Effect<any, any, any>>,
  reconcile: Option.Option<(as: ReadonlyArray<any>) => any>,
  options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
    readonly discard?: boolean | undefined
    readonly mode?: "default" | "validate" | "either" | undefined
  }
) => {
  const eitherEffects: Array<Effect.Effect<unknown, never, Either.Either<unknown, unknown>>> = []
  for (const effect of effects) {
    eitherEffects.push(core.either(effect))
  }
  return core.flatMap(
    forEach(eitherEffects, identity, {
      concurrency: options?.concurrency,
      batching: options?.batching
    }),
    (eithers) => {
      const none = Option.none()
      const size = eithers.length
      const errors: Array<unknown> = new Array(size)
      const successes: Array<unknown> = new Array(size)
      let errored = false
      for (let i = 0; i < size; i++) {
        const either = eithers[i] as Either.Either<unknown, unknown>
        if (either._tag === "Left") {
          errors[i] = Option.some(either.left)
          errored = true
        } else {
          successes[i] = either.right
          errors[i] = none
        }
      }
      if (errored) {
        return reconcile._tag === "Some" ?
          core.fail(reconcile.value(errors)) :
          core.fail(errors)
      } else if (options?.discard) {
        return core.unit
      }
      return reconcile._tag === "Some" ?
        core.succeed(reconcile.value(successes)) :
        core.succeed(successes)
    }
  )
}

const allEither = (
  effects: Iterable<Effect.Effect<any, any, any>>,
  reconcile: Option.Option<(as: ReadonlyArray<any>) => any>,
  options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
    readonly discard?: boolean | undefined
    readonly mode?: "default" | "validate" | "either" | undefined
  }
) => {
  const eitherEffects: Array<Effect.Effect<unknown, never, Either.Either<unknown, unknown>>> = []
  for (const effect of effects) {
    eitherEffects.push(core.either(effect))
  }

  if (options?.discard) {
    return forEach(eitherEffects, identity, {
      concurrency: options?.concurrency,
      batching: options?.batching,
      discard: true
    })
  }

  return core.map(
    forEach(eitherEffects, identity, {
      concurrency: options?.concurrency,
      batching: options?.batching
    }),
    (eithers) =>
      reconcile._tag === "Some" ?
        reconcile.value(eithers) :
        eithers
  )
}

/* @internal */
export const all = <
  const Arg extends Iterable<Effect.Effect<any, any, any>> | Record<string, Effect.Effect<any, any, any>>,
  O extends {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
    readonly discard?: boolean | undefined
    readonly mode?: "default" | "validate" | "either" | undefined
  }
>(
  arg: Arg,
  options?: O
): Effect.All.Return<Arg, O> => {
  const [effects, reconcile] = allResolveInput(arg)

  if (options?.mode === "validate") {
    return allValidate(effects, reconcile, options) as any
  } else if (options?.mode === "either") {
    return allEither(effects, reconcile, options) as any
  }

  return reconcile._tag === "Some"
    ? core.map(
      forEach(effects, identity, options as any),
      reconcile.value
    ) as any
    : forEach(effects, identity, options as any) as any
}

/* @internal */
export const allWith = <
  O extends {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
    readonly discard?: boolean | undefined
    readonly mode?: "default" | "validate" | "either" | undefined
  }
>(options?: O) =>
<const Arg extends Iterable<Effect.Effect<any, any, any>> | Record<string, Effect.Effect<any, any, any>>>(
  arg: Arg
): Effect.All.Return<Arg, O> => all(arg, options)

/* @internal */
export const allSuccesses = <R, E, A>(
  elements: Iterable<Effect.Effect<R, E, A>>,
  options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
  }
): Effect.Effect<R, never, Array<A>> =>
  core.map(
    all(RA.fromIterable(elements).map(core.exit), options),
    RA.filterMap((exit) => core.exitIsSuccess(exit) ? Option.some(exit.i0) : Option.none())
  )

/* @internal */
export const replicate = dual<
  (n: number) => <R, E, A>(self: Effect.Effect<R, E, A>) => Array<Effect.Effect<R, E, A>>,
  <R, E, A>(self: Effect.Effect<R, E, A>, n: number) => Array<Effect.Effect<R, E, A>>
>(2, (self, n) => Array.from({ length: n }, () => self))

/* @internal */
export const replicateEffect: {
  (
    n: number,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    }
  ): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, Array<A>>
  (
    n: number,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, void>
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    n: number,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    }
  ): Effect.Effect<R, E, Array<A>>
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    n: number,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): Effect.Effect<R, E, void>
} = dual(
  (args) => core.isEffect(args[0]),
  (self, n, options) => all(replicate(self, n), options)
)

/* @internal */
export const forEach: {
  <A, R, E, B>(
    f: (a: A, i: number) => Effect.Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    }
  ): (self: Iterable<A>) => Effect.Effect<R, E, Array<B>>
  <A, R, E, B>(
    f: (a: A, i: number) => Effect.Effect<R, E, B>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): (self: Iterable<A>) => Effect.Effect<R, E, void>
  <A, R, E, B>(
    self: Iterable<A>,
    f: (a: A, i: number) => Effect.Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    }
  ): Effect.Effect<R, E, Array<B>>
  <A, R, E, B>(
    self: Iterable<A>,
    f: (a: A, i: number) => Effect.Effect<R, E, B>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): Effect.Effect<R, E, void>
} = dual((args) => Predicate.isIterable(args[0]), <A, R, E, B>(
  self: Iterable<A>,
  f: (a: A, i: number) => Effect.Effect<R, E, B>,
  options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
    readonly discard?: boolean | undefined
  }
) =>
  core.withFiberRuntime<R, E, A | void>((r) => {
    const isRequestBatchingEnabled = options?.batching === true ||
      (options?.batching === "inherit" && r.getFiberRef(core.currentRequestBatching))

    if (options?.discard) {
      return concurrency.match(
        options.concurrency,
        () =>
          finalizersMask(ExecutionStrategy.sequential)((restore) =>
            isRequestBatchingEnabled
              ? forEachConcurrentDiscard(self, (a, i) => restore(f(a, i)), true, false, 1)
              : core.forEachSequentialDiscard(self, (a, i) => restore(f(a, i)))
          ),
        () =>
          finalizersMask(ExecutionStrategy.parallel)((restore) =>
            forEachConcurrentDiscard(self, (a, i) => restore(f(a, i)), isRequestBatchingEnabled, false)
          ),
        (n) =>
          finalizersMask(ExecutionStrategy.parallelN(n))((restore) =>
            forEachConcurrentDiscard(self, (a, i) => restore(f(a, i)), isRequestBatchingEnabled, false, n)
          )
      )
    }

    return concurrency.match(
      options?.concurrency,
      () =>
        finalizersMask(ExecutionStrategy.sequential)((restore) =>
          isRequestBatchingEnabled
            ? forEachParN(self, 1, (a, i) => restore(f(a, i)), true)
            : core.forEachSequential(self, (a, i) => restore(f(a, i)))
        ),
      () =>
        finalizersMask(ExecutionStrategy.parallel)((restore) =>
          forEachParUnbounded(self, (a, i) => restore(f(a, i)), isRequestBatchingEnabled)
        ),
      (n) =>
        finalizersMask(ExecutionStrategy.parallelN(n))((restore) =>
          forEachParN(self, n, (a, i) => restore(f(a, i)), isRequestBatchingEnabled)
        )
    )
  }))

/* @internal */
export const forEachParUnbounded = <A, R, E, B>(
  self: Iterable<A>,
  f: (a: A, i: number) => Effect.Effect<R, E, B>,
  batching: boolean
): Effect.Effect<R, E, Array<B>> =>
  core.suspend(() => {
    const as = RA.fromIterable(self)
    const array = new Array<B>(as.length)
    const fn = (a: A, i: number) => core.flatMap(f(a, i), (b) => core.sync(() => array[i] = b))
    return core.zipRight(forEachConcurrentDiscard(as, fn, batching, false), core.succeed(array))
  })

/** @internal */
export const forEachConcurrentDiscard = <R, E, A, _>(
  self: Iterable<A>,
  f: (a: A, i: number) => Effect.Effect<R, E, _>,
  batching: boolean,
  processAll: boolean,
  n?: number
): Effect.Effect<R, E, void> =>
  core.uninterruptibleMask((restore) =>
    core.transplant((graft) =>
      core.withFiberRuntime((parent) => {
        let todos = Array.from(self).reverse()
        let target = todos.length
        if (target === 0) {
          return core.unit
        }
        let counter = 0
        let interrupted = false
        const fibersCount = n ? Math.min(todos.length, n) : todos.length
        const fibers = new Set<FiberRuntime<never, Exit.Exit<E, _> | Effect.Blocked<E, _>>>()
        const results = new Array()
        const interruptAll = () =>
          fibers.forEach((fiber) => {
            fiber._scheduler.scheduleTask(() => {
              fiber.unsafeInterruptAsFork(parent.id())
            }, 0)
          })
        const startOrder = new Array<FiberRuntime<never, Exit.Exit<E, _> | Effect.Blocked<E, _>>>()
        const joinOrder = new Array<FiberRuntime<never, Exit.Exit<E, _> | Effect.Blocked<E, _>>>()
        const residual = new Array<core.Blocked>()
        const collectExits = () => {
          const exits: Array<Exit.Exit<E, any>> = results
            .filter(({ exit }) => exit._tag === "Failure")
            .sort((a, b) => a.index < b.index ? -1 : a.index === b.index ? 0 : 1)
            .map(({ exit }) => exit)
          if (exits.length === 0) {
            exits.push(core.exitUnit)
          }
          return exits
        }
        const runFiber = <R, E, A>(eff: Effect.Effect<R, E, A>) => {
          const runnable = core.uninterruptible(graft(eff))
          const fiber = unsafeForkUnstarted(
            runnable,
            parent,
            parent._runtimeFlags,
            fiberScope.globalScope
          )
          parent._scheduler.scheduleTask(() => {
            fiber.resume(runnable)
          }, 0)
          return fiber
        }
        const onInterruptSignal = () => {
          if (!processAll) {
            target -= todos.length
            todos = []
          }
          interrupted = true
          interruptAll()
        }
        const stepOrExit = batching ? core.step : core.exit
        const processingFiber = runFiber(
          core.async<any, any, any>((resume) => {
            const pushResult = <E, _>(res: Exit.Exit<E, _> | Effect.Blocked<E, _>, index: number) => {
              if (res._op === "Blocked") {
                residual.push(res as core.Blocked)
              } else {
                results.push({ index, exit: res })
                if (res._op === "Failure" && !interrupted) {
                  onInterruptSignal()
                }
              }
            }
            const next = () => {
              if (todos.length > 0) {
                const a = todos.pop()!
                let index = counter++
                const returnNextElement = () => {
                  const a = todos.pop()!
                  index = counter++
                  return core.flatMap(core.yieldNow(), () =>
                    core.flatMap(
                      stepOrExit(restore(f(a, index))),
                      onRes
                    ))
                }
                const onRes = (
                  res: Exit.Exit<E, _> | Effect.Blocked<E, _>
                ): Effect.Effect<R, never, Exit.Exit<E, _> | Effect.Blocked<E, _>> => {
                  if (todos.length > 0) {
                    pushResult(res, index)
                    if (todos.length > 0) {
                      return returnNextElement()
                    }
                  }
                  return core.succeed(res)
                }
                const todo = core.flatMap(
                  stepOrExit(restore(f(a, index))),
                  onRes
                )
                const fiber = runFiber(todo)
                startOrder.push(fiber)
                fibers.add(fiber)
                if (interrupted) {
                  fiber._scheduler.scheduleTask(() => {
                    fiber.unsafeInterruptAsFork(parent.id())
                  }, 0)
                }
                fiber.addObserver((wrapped) => {
                  let exit: Exit.Exit<any, any> | core.Blocked
                  if (wrapped._op === "Failure") {
                    exit = wrapped
                  } else {
                    exit = wrapped.i0 as any
                  }
                  joinOrder.push(fiber)
                  fibers.delete(fiber)
                  pushResult(exit, index)
                  if (results.length === target) {
                    resume(core.succeed(Option.getOrElse(
                      core.exitCollectAll(collectExits(), { parallel: true }),
                      () => core.exitUnit
                    )))
                  } else if (residual.length + results.length === target) {
                    const requests = residual.map((blocked) => blocked.i0).reduce(_RequestBlock.par)
                    resume(core.succeed(core.blocked(
                      requests,
                      forEachConcurrentDiscard(
                        [
                          Option.getOrElse(
                            core.exitCollectAll(collectExits(), { parallel: true }),
                            () => core.exitUnit
                          ),
                          ...residual.map((blocked) => blocked.i1)
                        ],
                        (i) => i,
                        batching,
                        true,
                        n
                      )
                    )))
                  } else {
                    next()
                  }
                })
              }
            }
            for (let i = 0; i < fibersCount; i++) {
              next()
            }
          })
        )
        return core.asUnit(core.tap(
          core.flatten(core.onInterrupt(
            restore(internalFiber.join(processingFiber)),
            () => {
              onInterruptSignal()
              return internalFiber._await(processingFiber)
            }
          )),
          () => core.forEachSequential(joinOrder, (f) => f.inheritAll)
        ))
      })
    )
  )

/* @internal */
export const forEachParN = <A, R, E, B>(
  self: Iterable<A>,
  n: number,
  f: (a: A, i: number) => Effect.Effect<R, E, B>,
  batching: boolean
): Effect.Effect<R, E, Array<B>> =>
  core.suspend(() => {
    const as = RA.fromIterable(self)
    const array = new Array<B>(as.length)
    const fn = (a: A, i: number) => core.map(f(a, i), (b) => array[i] = b)
    return core.zipRight(forEachConcurrentDiscard(as, fn, batching, false, n), core.succeed(array))
  })

/* @internal */
export const fork = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> =>
  core.withFiberRuntime<R, never, Fiber.RuntimeFiber<E, A>>((state, status) =>
    core.succeed(unsafeFork(self, state, status.runtimeFlags))
  )

/* @internal */
export const forkDaemon = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> =>
  forkWithScopeOverride(self, fiberScope.globalScope)

/* @internal */
export const forkWithErrorHandler = dual<
  <E, X>(
    handler: (e: E) => Effect.Effect<never, never, X>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>>,
  <R, E, A, X>(
    self: Effect.Effect<R, E, A>,
    handler: (e: E) => Effect.Effect<never, never, X>
  ) => Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>>
>(2, (self, handler) =>
  fork(core.onError(self, (cause) => {
    const either = internalCause.failureOrCause(cause)
    switch (either._tag) {
      case "Left": {
        return handler(either.left)
      }
      case "Right": {
        return core.failCause(either.right)
      }
    }
  })))

/** @internal */
export const unsafeFork = <R, E, A, E2, B>(
  effect: Effect.Effect<R, E, A>,
  parentFiber: FiberRuntime<E2, B>,
  parentRuntimeFlags: RuntimeFlags.RuntimeFlags,
  overrideScope: fiberScope.FiberScope | null = null
): FiberRuntime<E, A> => {
  const childFiber = unsafeMakeChildFiber(effect, parentFiber, parentRuntimeFlags, overrideScope)
  childFiber.resume(effect)
  return childFiber
}

/** @internal */
export const unsafeForkUnstarted = <R, E, A, E2, B>(
  effect: Effect.Effect<R, E, A>,
  parentFiber: FiberRuntime<E2, B>,
  parentRuntimeFlags: RuntimeFlags.RuntimeFlags,
  overrideScope: fiberScope.FiberScope | null = null
): FiberRuntime<E, A> => {
  const childFiber = unsafeMakeChildFiber(effect, parentFiber, parentRuntimeFlags, overrideScope)
  return childFiber
}

/** @internal */
export const unsafeMakeChildFiber = <R, E, A, E2, B>(
  effect: Effect.Effect<R, E, A>,
  parentFiber: FiberRuntime<E2, B>,
  parentRuntimeFlags: RuntimeFlags.RuntimeFlags,
  overrideScope: fiberScope.FiberScope | null = null
): FiberRuntime<E, A> => {
  const childId = FiberId.unsafeMake()
  const parentFiberRefs = parentFiber.getFiberRefs()
  const childFiberRefs = fiberRefs.forkAs(parentFiberRefs, childId)
  const childFiber = new FiberRuntime<E, A>(childId, childFiberRefs, parentRuntimeFlags)
  const childContext = fiberRefs.getOrDefault(
    childFiberRefs,
    core.currentContext as unknown as FiberRef.FiberRef<Context.Context<R>>
  )
  const supervisor = childFiber._supervisor

  supervisor.onStart(
    childContext,
    effect,
    Option.some(parentFiber),
    childFiber
  )

  childFiber.addObserver((exit) => supervisor.onEnd(exit, childFiber))

  const parentScope = overrideScope !== null ? overrideScope : pipe(
    parentFiber.getFiberRef(core.currentForkScopeOverride),
    Option.getOrElse(() => parentFiber.scope())
  )

  parentScope.add(parentRuntimeFlags, childFiber)

  return childFiber
}

/* @internal */
const forkWithScopeOverride = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  scopeOverride: fiberScope.FiberScope
): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> =>
  core.withFiberRuntime<R, never, Fiber.RuntimeFiber<E, A>>((parentFiber, parentStatus) =>
    core.succeed(unsafeFork(self, parentFiber, parentStatus.runtimeFlags, scopeOverride))
  )

/* @internal */
export const mergeAll = dual<
  <Z, A>(zero: Z, f: (z: Z, a: A, i: number) => Z, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
  }) => <R, E>(elements: Iterable<Effect.Effect<R, E, A>>) => Effect.Effect<R, E, Z>,
  <R, E, A, Z>(elements: Iterable<Effect.Effect<R, E, A>>, zero: Z, f: (z: Z, a: A, i: number) => Z, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
  }) => Effect.Effect<R, E, Z>
>(
  (args) => Predicate.isFunction(args[2]),
  <R, E, A, Z>(elements: Iterable<Effect.Effect<R, E, A>>, zero: Z, f: (z: Z, a: A, i: number) => Z, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
  }) =>
    concurrency.matchSimple(
      options?.concurrency,
      () =>
        RA.fromIterable(elements).reduce(
          (acc, a, i) => core.zipWith(acc, a, (acc, a) => f(acc, a, i)),
          core.succeed(zero) as Effect.Effect<R, E, Z>
        ),
      () =>
        core.flatMap(Ref.make(zero), (acc) =>
          core.flatMap(
            forEach(
              elements,
              (effect, i) => core.flatMap(effect, (a) => Ref.update(acc, (b) => f(b, a, i))),
              options
            ),
            () => Ref.get(acc)
          ))
    )
)

/* @internal */
export const partition = dual<
  <R, E, A, B>(
    f: (a: A, i: number) => Effect.Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => (elements: Iterable<A>) => Effect.Effect<R, never, [excluded: Array<E>, satisfying: Array<B>]>,
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect.Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => Effect.Effect<R, never, [excluded: Array<E>, satisfying: Array<B>]>
>((args) => Predicate.isIterable(args[0]), (elements, f, options) =>
  pipe(
    forEach(elements, (a, i) => core.either(f(a, i)), options),
    core.map((chunk) => core.partitionMap(chunk, identity))
  ))

/* @internal */
export const validateAll = dual<
  {
    <R, E, A, B>(
      f: (a: A, i: number) => Effect.Effect<R, E, B>,
      options?: {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly discard?: false | undefined
      }
    ): (elements: Iterable<A>) => Effect.Effect<R, Array<E>, Array<B>>
    <R, E, A, B>(
      f: (a: A, i: number) => Effect.Effect<R, E, B>,
      options: {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly discard: true
      }
    ): (elements: Iterable<A>) => Effect.Effect<R, Array<E>, void>
  },
  {
    <R, E, A, B>(
      elements: Iterable<A>,
      f: (a: A, i: number) => Effect.Effect<R, E, B>,
      options?: {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly discard?: false | undefined
      }
    ): Effect.Effect<R, Array<E>, Array<B>>
    <R, E, A, B>(
      elements: Iterable<A>,
      f: (a: A, i: number) => Effect.Effect<R, E, B>,
      options: {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly discard: true
      }
    ): Effect.Effect<R, Array<E>, void>
  }
>(
  (args) => Predicate.isIterable(args[0]),
  <R, E, A, B>(elements: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, B>, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
    readonly discard?: boolean | undefined
  }): Effect.Effect<R, Array<E>, any> =>
    core.flatMap(
      partition(elements, f, {
        concurrency: options?.concurrency,
        batching: options?.batching
      }),
      ([es, bs]) =>
        es.length === 0
          ? options?.discard ? core.unit : core.succeed(bs)
          : core.fail(es)
    )
)

/* @internal */
export const raceAll = <R, E, A>(all: Iterable<Effect.Effect<R, E, A>>) => {
  const list = Chunk.fromIterable(all)
  if (!Chunk.isNonEmpty(list)) {
    return core.dieSync(() => new core.IllegalArgumentException(`Received an empty collection of effects`))
  }
  const self = Chunk.headNonEmpty(list)
  const effects = Chunk.tailNonEmpty(list)
  const inheritAll = (res: readonly [A, Fiber.Fiber<E, A>]) =>
    pipe(
      internalFiber.inheritAll(res[1]),
      core.as(res[0])
    )
  return pipe(
    core.deferredMake<E, readonly [A, Fiber.Fiber<E, A>]>(),
    core.flatMap((done) =>
      pipe(
        Ref.make(effects.length),
        core.flatMap((fails) =>
          core.uninterruptibleMask<R, E, A>((restore) =>
            pipe(
              fork(core.interruptible(self)),
              core.flatMap((head) =>
                pipe(
                  effects,
                  core.forEachSequential((effect) => fork(core.interruptible(effect))),
                  core.map(Chunk.unsafeFromArray),
                  core.map((tail) => pipe(tail, Chunk.prepend(head)) as Chunk.Chunk<Fiber.RuntimeFiber<E, A>>),
                  core.tap((fibers) =>
                    pipe(
                      fibers,
                      RA.reduce(core.unit, (effect, fiber) =>
                        pipe(
                          effect,
                          core.zipRight(
                            pipe(
                              internalFiber._await(fiber),
                              core.flatMap(raceAllArbiter(fibers, fiber, done, fails)),
                              fork,
                              core.asUnit
                            )
                          )
                        ))
                    )
                  ),
                  core.flatMap((fibers) =>
                    pipe(
                      restore(pipe(Deferred.await(done), core.flatMap(inheritAll))),
                      core.onInterrupt(() =>
                        pipe(
                          fibers,
                          RA.reduce(
                            core.unit,
                            (effect, fiber) => pipe(effect, core.zipLeft(core.interruptFiber(fiber)))
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
}

/* @internal */
const raceAllArbiter = <E, E1, A, A1>(
  fibers: Iterable<Fiber.Fiber<E | E1, A | A1>>,
  winner: Fiber.Fiber<E | E1, A | A1>,
  deferred: Deferred.Deferred<E | E1, readonly [A | A1, Fiber.Fiber<E | E1, A | A1>]>,
  fails: Ref.Ref<number>
) =>
(exit: Exit.Exit<E | E1, A | A1>): Effect.Effect<never, never, void> =>
  core.exitMatchEffect(exit, {
    onFailure: (cause) =>
      pipe(
        Ref.modify(fails, (fails) =>
          [
            fails === 0 ?
              pipe(core.deferredFailCause(deferred, cause), core.asUnit) :
              core.unit,
            fails - 1
          ] as const),
        core.flatten
      ),
    onSuccess: (value): Effect.Effect<never, never, void> =>
      pipe(
        core.deferredSucceed(deferred, [value, winner] as const),
        core.flatMap((set) =>
          set ?
            pipe(
              Chunk.fromIterable(fibers),
              RA.reduce(
                core.unit,
                (effect, fiber) =>
                  fiber === winner ?
                    effect :
                    pipe(effect, core.zipLeft(core.interruptFiber(fiber)))
              )
            ) :
            core.unit
        )
      )
  })

/* @internal */
export const reduceEffect = dual<
  <R, E, A>(
    zero: Effect.Effect<R, E, A>,
    f: (acc: A, a: A, i: number) => A,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => (elements: Iterable<Effect.Effect<R, E, A>>) => Effect.Effect<R, E, A>,
  <R, E, A>(
    elements: Iterable<Effect.Effect<R, E, A>>,
    zero: Effect.Effect<R, E, A>,
    f: (acc: A, a: A, i: number) => A,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => Effect.Effect<R, E, A>
>((args) => Predicate.isIterable(args[0]), <R, E, A>(
  elements: Iterable<Effect.Effect<R, E, A>>,
  zero: Effect.Effect<R, E, A>,
  f: (acc: A, a: A, i: number) => A,
  options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
  }
) =>
  concurrency.matchSimple(
    options?.concurrency,
    () => RA.fromIterable(elements).reduce((acc, a, i) => core.zipWith(acc, a, (acc, a) => f(acc, a, i)), zero),
    () =>
      core.suspend(() =>
        pipe(
          mergeAll(
            [zero, ...elements],
            Option.none() as Option.Option<A>,
            (acc, elem, i) => {
              switch (acc._tag) {
                case "None": {
                  return Option.some(elem)
                }
                case "Some": {
                  return Option.some(f(acc.value, elem, i))
                }
              }
            },
            options
          ),
          core.map((option) => {
            switch (option._tag) {
              case "None": {
                throw new Error(
                  "BUG: Effect.reduceEffect - please report an issue at https://github.com/Effect-TS/effect/issues"
                )
              }
              case "Some": {
                return option.value
              }
            }
          })
        )
      )
  ))

/* @internal */
export const parallelFinalizers = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  core.contextWithEffect((context) =>
    Option.match(Context.getOption(context, scopeTag), {
      onNone: () => self,
      onSome: (scope) => {
        switch (scope.strategy._tag) {
          case "Parallel":
            return self
          case "Sequential":
          case "ParallelN":
            return core.flatMap(
              core.scopeFork(scope, ExecutionStrategy.parallel),
              (inner) => scopeExtend(self, inner)
            )
        }
      }
    })
  )

/* @internal */
export const parallelNFinalizers =
  (parallelism: number) => <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
    core.contextWithEffect((context) =>
      Option.match(Context.getOption(context, scopeTag), {
        onNone: () => self,
        onSome: (scope) => {
          if (scope.strategy._tag === "ParallelN" && scope.strategy.parallelism === parallelism) {
            return self
          }
          return core.flatMap(
            core.scopeFork(scope, ExecutionStrategy.parallelN(parallelism)),
            (inner) => scopeExtend(self, inner)
          )
        }
      })
    )

/* @internal */
export const finalizersMask = (strategy: ExecutionStrategy.ExecutionStrategy) =>
<R, E, A>(
  self: (restore: <R1, E1, A1>(self: Effect.Effect<R1, E1, A1>) => Effect.Effect<R1, E1, A1>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  core.contextWithEffect((context) =>
    Option.match(Context.getOption(context, scopeTag), {
      onNone: () => self(identity),
      onSome: (scope) => {
        const patch = strategy._tag === "Parallel"
          ? parallelFinalizers
          : strategy._tag === "Sequential"
          ? sequentialFinalizers
          : parallelNFinalizers(strategy.parallelism)
        switch (scope.strategy._tag) {
          case "Parallel":
            return patch(self(parallelFinalizers))
          case "Sequential":
            return patch(self(sequentialFinalizers))
          case "ParallelN":
            return patch(self(parallelNFinalizers(scope.strategy.parallelism)))
        }
      }
    })
  )

/* @internal */
export const scopeWith = <R, E, A>(
  f: (scope: Scope.Scope) => Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, E, A> => core.flatMap(scopeTag, f)

/* @internal */
export const scopedEffect = <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<Exclude<R, Scope.Scope>, E, A> =>
  core.flatMap(scopeMake(), (scope) => scopeUse(scope)(effect))

/* @internal */
export const sequentialFinalizers = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  core.contextWithEffect((context) =>
    Option.match(Context.getOption(context, scopeTag), {
      onNone: () => self,
      onSome: (scope) => {
        switch (scope.strategy._tag) {
          case "Sequential":
            return self
          case "Parallel":
          case "ParallelN":
            return core.flatMap(
              core.scopeFork(scope, ExecutionStrategy.sequential),
              (inner) => scopeExtend(self, inner)
            )
        }
      }
    })
  )

/* @internal */
export const tagMetricsScoped = (key: string, value: string): Effect.Effect<Scope.Scope, never, void> =>
  labelMetricsScoped([metricLabel.make(key, value)])

/* @internal */
export const labelMetricsScoped = (
  labels: Iterable<MetricLabel.MetricLabel>
): Effect.Effect<Scope.Scope, never, void> =>
  fiberRefLocallyScopedWith(core.currentMetricLabels, (old) => RA.union(old, labels))

/* @internal */
export const using = dual<
  <A, R2, E2, A2>(
    use: (a: A) => Effect.Effect<R2, E2, A2>
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Scope.Scope> | R2, E | E2, A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    use: (a: A) => Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<Exclude<R, Scope.Scope> | R2, E | E2, A2>
>(2, (self, use) =>
  core.acquireUseRelease(
    scopeMake(),
    (scope) => core.flatMap(scopeExtend(self, scope), use),
    (scope, exit) => core.scopeClose(scope, exit)
  ))

/** @internal */
export const validate = dual<
  <R1, E1, B>(
    that: Effect.Effect<R1, E1, B>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E | E1, [A, B]>,
  <R, E, A, R1, E1, B>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R1, E1, B>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => Effect.Effect<R | R1, E | E1, [A, B]>
>(
  (args) => core.isEffect(args[1]),
  (self, that, options) => validateWith(self, that, (a, b) => [a, b], options)
)

/** @internal */
export const validateWith = dual<
  <A, R1, E1, B, C>(
    that: Effect.Effect<R1, E1, B>,
    f: (a: A, b: B) => C,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E | E1, C>,
  <R, E, A, R1, E1, B, C>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R1, E1, B>,
    f: (a: A, b: B) => C,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => Effect.Effect<R | R1, E | E1, C>
>((args) => core.isEffect(args[1]), (self, that, f, options) =>
  core.flatten(zipWithOptions(
    core.exit(self),
    core.exit(that),
    (ea, eb) =>
      core.exitZipWith(ea, eb, {
        onSuccess: f,
        onFailure: (ca, cb) => options?.concurrent ? internalCause.parallel(ca, cb) : internalCause.sequential(ca, cb)
      }),
    options
  )))

/* @internal */
export const validateAllPar = dual<
  <R, E, A, B>(
    f: (a: A) => Effect.Effect<R, E, B>
  ) => (elements: Iterable<A>) => Effect.Effect<R, Array<E>, Array<B>>,
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A) => Effect.Effect<R, E, B>
  ) => Effect.Effect<R, Array<E>, Array<B>>
>(2, (elements, f) =>
  core.flatMap(
    partition(elements, f),
    ([es, bs]) =>
      es.length === 0
        ? core.succeed(bs)
        : core.fail(es)
  ))

/* @internal */
export const validateAllParDiscard = dual<
  <R, E, A, B>(
    f: (a: A) => Effect.Effect<R, E, B>
  ) => (elements: Iterable<A>) => Effect.Effect<R, Array<E>, void>,
  <R, E, A, B>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, E, B>) => Effect.Effect<R, Array<E>, void>
>(2, (elements, f) =>
  core.flatMap(
    partition(elements, f),
    ([es, _]) =>
      es.length === 0
        ? core.unit
        : core.fail(es)
  ))

/* @internal */
export const validateFirst = dual<
  <R, E, A, B>(f: (a: A, i: number) => Effect.Effect<R, E, B>, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
  }) => (elements: Iterable<A>) => Effect.Effect<R, Array<E>, B>,
  <R, E, A, B>(elements: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, B>, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
  }) => Effect.Effect<R, Array<E>, B>
>(
  (args) => Predicate.isIterable(args[0]),
  (elements, f, options) => core.flip(forEach(elements, (a, i) => core.flip(f(a, i)), options))
)

/* @internal */
export const withClockScoped = <A extends Clock.Clock>(value: A) =>
  fiberRefLocallyScopedWith(defaultServices.currentServices, Context.add(clock.clockTag, value))

/* @internal */
export const withConfigProviderScoped = (value: ConfigProvider) =>
  fiberRefLocallyScopedWith(defaultServices.currentServices, Context.add(configProviderTag, value))

/* @internal */
export const withEarlyRelease = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, E, [Effect.Effect<never, never, void>, A]> =>
  scopeWith((parent) =>
    core.flatMap(core.scopeFork(parent, executionStrategy.sequential), (child) =>
      pipe(
        self,
        scopeExtend(child),
        core.map((value) => [
          core.fiberIdWith((fiberId) => core.scopeClose(child, core.exitInterrupt(fiberId))),
          value
        ])
      ))
  )

/** @internal */
export const zipOptions = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, [A, A2]>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => Effect.Effect<R | R2, E | E2, [A, A2]>
>((args) => core.isEffect(args[1]), (
  self,
  that,
  options
) => zipWithOptions(self, that, (a, b) => [a, b], options))

/** @internal */
export const zipLeftOptions = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => Effect.Effect<R | R2, E | E2, A>
>(
  (args) => core.isEffect(args[1]),
  (self, that, options) => zipWithOptions(self, that, (a, _) => a, options)
)

/** @internal */
export const zipRightOptions = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => Effect.Effect<R | R2, E | E2, A2>
>((args) => core.isEffect(args[1]), (self, that, options) => zipWithOptions(self, that, (_, b) => b, options))

/** @internal */
export const zipWithOptions = dual<
  <R2, E2, A2, A, B>(
    that: Effect.Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => <R, E>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, B>,
  <R, E, A, R2, E2, A2, B>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ) => Effect.Effect<R | R2, E | E2, B>
>((args) => core.isEffect(args[1]), <R, E, A, R2, E2, A2, B>(
  self: Effect.Effect<R, E, A>,
  that: Effect.Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B,
  options?: {
    readonly concurrent?: boolean | undefined
    readonly batching?: boolean | "inherit" | undefined
  }
): Effect.Effect<R | R2, E | E2, B> =>
  core.map(
    all([self, that], {
      concurrency: options?.concurrent ? 2 : 1,
      batching: options?.batching
    }),
    ([a, a2]) => f(a, a2)
  ))

/* @internal */
export const withRuntimeFlagsScoped = (
  update: RuntimeFlagsPatch.RuntimeFlagsPatch
): Effect.Effect<Scope.Scope, never, void> => {
  if (update === RuntimeFlagsPatch.empty) {
    return core.unit
  }
  return pipe(
    core.runtimeFlags,
    core.flatMap((runtimeFlags) => {
      const updatedRuntimeFlags = _runtimeFlags.patch(runtimeFlags, update)
      const revertRuntimeFlags = _runtimeFlags.diff(updatedRuntimeFlags, runtimeFlags)
      return pipe(
        core.updateRuntimeFlags(update),
        core.zipRight(addFinalizer(() => core.updateRuntimeFlags(revertRuntimeFlags))),
        core.asUnit
      )
    }),
    core.uninterruptible
  )
}

// circular with ReleaseMap

/* @internal */
export const releaseMapReleaseAll = (
  strategy: ExecutionStrategy.ExecutionStrategy,
  exit: Exit.Exit<unknown, unknown>
) =>
(self: core.ReleaseMap): Effect.Effect<never, never, void> =>
  core.suspend(() => {
    switch (self.state._tag) {
      case "Exited": {
        return core.unit
      }
      case "Running": {
        const finalizersMap = self.state.finalizers
        const update = self.state.update
        const finalizers = Array.from(finalizersMap.keys()).sort((a, b) => b - a).map((key) => finalizersMap.get(key)!)
        self.state = { _tag: "Exited", nextKey: self.state.nextKey, exit, update }
        return executionStrategy.isSequential(strategy) ?
          pipe(
            finalizers,
            core.forEachSequential((fin) => core.exit(update(fin)(exit))),
            core.flatMap((results) =>
              pipe(
                core.exitCollectAll(results),
                Option.map(core.exitAsUnit),
                Option.getOrElse(() => core.exitUnit)
              )
            )
          ) :
          executionStrategy.isParallel(strategy) ?
          pipe(
            forEachParUnbounded(finalizers, (fin) => core.exit(update(fin)(exit)), false),
            core.flatMap((results) =>
              pipe(
                core.exitCollectAll(results, { parallel: true }),
                Option.map(core.exitAsUnit),
                Option.getOrElse(() => core.exitUnit)
              )
            )
          ) :
          pipe(
            forEachParN(finalizers, strategy.parallelism, (fin) => core.exit(update(fin)(exit)), false),
            core.flatMap((results) =>
              pipe(
                core.exitCollectAll(results, { parallel: true }),
                Option.map(core.exitAsUnit),
                Option.getOrElse(() => core.exitUnit)
              )
            )
          )
      }
    }
  })

// circular with Scope

/** @internal */
export const scopeTag = Context.Tag<Scope.Scope>(core.ScopeTypeId)

/* @internal */
export const scope: Effect.Effect<Scope.Scope, never, Scope.Scope> = scopeTag

/* @internal */
export const scopeMake = (
  strategy: ExecutionStrategy.ExecutionStrategy = executionStrategy.sequential
): Effect.Effect<never, never, Scope.Scope.Closeable> =>
  core.map(core.releaseMapMake, (rm): Scope.Scope.Closeable => ({
    [core.ScopeTypeId]: core.ScopeTypeId,
    [core.CloseableScopeTypeId]: core.CloseableScopeTypeId,
    strategy,
    pipe() {
      return pipeArguments(this, arguments)
    },
    fork: (strategy) =>
      core.uninterruptible(
        pipe(
          scopeMake(strategy),
          core.flatMap((scope) =>
            pipe(
              core.releaseMapAdd(rm, (exit) => core.scopeClose(scope, exit)),
              core.tap((fin) => core.scopeAddFinalizerExit(scope, fin)),
              core.as(scope)
            )
          )
        )
      ),
    close: (exit) => core.asUnit(releaseMapReleaseAll(strategy, exit)(rm)),
    addFinalizer: (fin) => core.asUnit(core.releaseMapAdd(fin)(rm))
  }))

/* @internal */
export const scopeExtend = dual<
  (scope: Scope.Scope) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Scope.Scope>, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, scope: Scope.Scope) => Effect.Effect<Exclude<R, Scope.Scope>, E, A>
>(
  2,
  <R, E, A>(effect: Effect.Effect<R, E, A>, scope: Scope.Scope) =>
    core.mapInputContext<Exclude<R, Scope.Scope>, R, E, A>(
      effect,
      // @ts-expect-error
      Context.merge(Context.make(scopeTag, scope))
    )
)

/* @internal */
export const scopeUse = dual<
  (
    scope: Scope.Scope.Closeable
  ) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Scope.Scope>, E, A>,
  <R, E, A>(
    effect: Effect.Effect<R, E, A>,
    scope: Scope.Scope.Closeable
  ) => Effect.Effect<Exclude<R, Scope.Scope>, E, A>
>(2, (effect, scope) =>
  pipe(
    effect,
    scopeExtend(scope),
    core.onExit((exit) => scope.close(exit))
  ))

// circular with Supervisor

/** @internal */
export const fiberRefUnsafeMakeSupervisor = (
  initial: Supervisor.Supervisor<any>
): FiberRef.FiberRef<Supervisor.Supervisor<any>> =>
  core.fiberRefUnsafeMakePatch(initial, {
    differ: SupervisorPatch.differ,
    fork: SupervisorPatch.empty
  })

// circular with FiberRef

/* @internal */
export const fiberRefLocallyScoped = dual<
  <A>(value: A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<Scope.Scope, never, void>,
  <A>(self: FiberRef.FiberRef<A>, value: A) => Effect.Effect<Scope.Scope, never, void>
>(2, (self, value) =>
  core.asUnit(
    acquireRelease(
      core.flatMap(
        core.fiberRefGet(self),
        (oldValue) => core.as(core.fiberRefSet(self, value), oldValue)
      ),
      (oldValue) => core.fiberRefSet(self, oldValue)
    )
  ))

/* @internal */
export const fiberRefLocallyScopedWith = dual<
  <A>(f: (a: A) => A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<Scope.Scope, never, void>,
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A) => Effect.Effect<Scope.Scope, never, void>
>(2, (self, f) => core.fiberRefGetWith(self, (a) => fiberRefLocallyScoped(self, f(a))))

/* @internal */
export const fiberRefMake = <A>(
  initial: A,
  options?: {
    readonly fork?: ((a: A) => A) | undefined
    readonly join?: ((left: A, right: A) => A) | undefined
  }
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<A>> =>
  fiberRefMakeWith(() => core.fiberRefUnsafeMake(initial, options))

/* @internal */
export const fiberRefMakeWith = <Value>(
  ref: LazyArg<FiberRef.FiberRef<Value>>
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<Value>> =>
  acquireRelease(
    core.tap(core.sync(ref), (ref) => core.fiberRefUpdate(ref, identity)),
    (fiberRef) => core.fiberRefDelete(fiberRef)
  )

/* @internal */
export const fiberRefMakeContext = <A>(
  initial: Context.Context<A>
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<Context.Context<A>>> =>
  fiberRefMakeWith(() => core.fiberRefUnsafeMakeContext(initial))

/* @internal */
export const fiberRefMakeRuntimeFlags = (
  initial: RuntimeFlags.RuntimeFlags
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<RuntimeFlags.RuntimeFlags>> =>
  fiberRefMakeWith(() => core.fiberRefUnsafeMakeRuntimeFlags(initial))

/** @internal */
export const currentRuntimeFlags: FiberRef.FiberRef<RuntimeFlags.RuntimeFlags> = core.fiberRefUnsafeMakeRuntimeFlags(
  _runtimeFlags.none
)

/** @internal */
export const currentSupervisor: FiberRef.FiberRef<Supervisor.Supervisor<any>> = fiberRefUnsafeMakeSupervisor(
  supervisor.none
)

// circular with Fiber

/* @internal */
export const fiberAwaitAll = (fibers: Iterable<Fiber.Fiber<any, any>>): Effect.Effect<never, never, void> =>
  core.asUnit(internalFiber._await(fiberAll(fibers)))

/** @internal */
export const fiberAll = <E, A>(fibers: Iterable<Fiber.Fiber<E, A>>): Fiber.Fiber<E, Array<A>> => ({
  [internalFiber.FiberTypeId]: internalFiber.fiberVariance,
  id: () => RA.fromIterable(fibers).reduce((id, fiber) => FiberId.combine(id, fiber.id()), FiberId.none),
  await: core.exit(forEachParUnbounded(fibers, (fiber) => core.flatten(fiber.await), false)),
  children: core.map(forEachParUnbounded(fibers, (fiber) => fiber.children, false), RA.flatten),
  inheritAll: core.forEachSequentialDiscard(fibers, (fiber) => fiber.inheritAll),
  poll: core.map(
    core.forEachSequential(fibers, (fiber) => fiber.poll),
    RA.reduceRight(
      Option.some<Exit.Exit<E, Array<A>>>(core.exitSucceed(new Array())),
      (optionB, optionA) => {
        switch (optionA._tag) {
          case "None": {
            return Option.none()
          }
          case "Some": {
            switch (optionB._tag) {
              case "None": {
                return Option.none()
              }
              case "Some": {
                return Option.some(
                  core.exitZipWith(optionA.value, optionB.value, {
                    onSuccess: (a, chunk) => [a, ...chunk],
                    onFailure: internalCause.parallel
                  })
                )
              }
            }
          }
        }
      }
    )
  ),
  interruptAsFork: (fiberId) => core.forEachSequentialDiscard(fibers, (fiber) => fiber.interruptAsFork(fiberId)),
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/* @internal */
export const fiberInterruptFork = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, void> =>
  core.asUnit(forkDaemon(core.interruptFiber(self)))

/* @internal */
export const fiberJoinAll = <E, A>(fibers: Iterable<Fiber.Fiber<E, A>>): Effect.Effect<never, E, void> =>
  core.asUnit(internalFiber.join(fiberAll(fibers)))

/* @internal */
export const fiberScoped = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<Scope.Scope, never, Fiber.Fiber<E, A>> =>
  acquireRelease(core.succeed(self), core.interruptFiber)

//
// circular race
//

/** @internal */
export const raceWith = dual<
  <E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    other: Effect.Effect<R1, E1, A1>,
    options: {
      readonly onSelfDone: (exit: Exit.Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect.Effect<R2, E2, A2>
      readonly onOtherDone: (exit: Exit.Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect.Effect<R3, E3, A3>
    }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1 | R2 | R3, E2 | E3, A2 | A3>,
  <R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    self: Effect.Effect<R, E, A>,
    other: Effect.Effect<R1, E1, A1>,
    options: {
      readonly onSelfDone: (exit: Exit.Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect.Effect<R2, E2, A2>
      readonly onOtherDone: (exit: Exit.Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect.Effect<R3, E3, A3>
    }
  ) => Effect.Effect<R | R1 | R2 | R3, E2 | E3, A2 | A3>
>(3, <R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  self: Effect.Effect<R, E, A>,
  other: Effect.Effect<R1, E1, A1>,
  options: {
    readonly onSelfDone: (exit: Exit.Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect.Effect<R2, E2, A2>
    readonly onOtherDone: (exit: Exit.Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect.Effect<R3, E3, A3>
  }
) =>
  raceFibersWith(self, other, {
    onSelfWin: (winner, loser) =>
      core.flatMap(winner.await, (exit) => {
        switch (exit._tag) {
          case OpCodes.OP_SUCCESS: {
            return core.flatMap(
              winner.inheritAll,
              () => options.onSelfDone(exit, loser)
            )
          }
          case OpCodes.OP_FAILURE: {
            return options.onSelfDone(exit, loser)
          }
        }
      }),
    onOtherWin: (winner, loser) =>
      core.flatMap(winner.await, (exit) => {
        switch (exit._tag) {
          case OpCodes.OP_SUCCESS: {
            return core.flatMap(
              winner.inheritAll,
              () => options.onOtherDone(exit, loser)
            )
          }
          case OpCodes.OP_FAILURE: {
            return options.onOtherDone(exit, loser)
          }
        }
      })
  }))

/** @internal */
export const disconnect = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  core.uninterruptibleMask((restore) =>
    core.fiberIdWith((fiberId) =>
      core.flatMap(forkDaemon(restore(self)), (fiber) =>
        pipe(
          restore(internalFiber.join(fiber)),
          core.onInterrupt(() => pipe(fiber, internalFiber.interruptAsFork(fiberId)))
        ))
    )
  )

/** @internal */
export const race = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, A | A2>
>(
  2,
  (self, that) =>
    core.fiberIdWith((parentFiberId) =>
      raceWith(self, that, {
        onSelfDone: (exit, right) =>
          core.exitMatchEffect(exit, {
            onFailure: (cause) =>
              pipe(
                internalFiber.join(right),
                internalEffect.mapErrorCause((cause2) => internalCause.parallel(cause, cause2))
              ),
            onSuccess: (value) =>
              pipe(
                right,
                core.interruptAsFiber(parentFiberId),
                core.as(value)
              )
          }),
        onOtherDone: (exit, left) =>
          core.exitMatchEffect(exit, {
            onFailure: (cause) =>
              pipe(
                internalFiber.join(left),
                internalEffect.mapErrorCause((cause2) => internalCause.parallel(cause2, cause))
              ),
            onSuccess: (value) =>
              pipe(
                left,
                core.interruptAsFiber(parentFiberId),
                core.as(value)
              )
          })
      })
    )
)

/** @internal */
export const raceFibersWith = dual<
  <E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    other: Effect.Effect<R1, E1, A1>,
    options: {
      readonly onSelfWin: (
        winner: Fiber.RuntimeFiber<E, A>,
        loser: Fiber.RuntimeFiber<E1, A1>
      ) => Effect.Effect<R2, E2, A2>
      readonly onOtherWin: (
        winner: Fiber.RuntimeFiber<E1, A1>,
        loser: Fiber.RuntimeFiber<E, A>
      ) => Effect.Effect<R3, E3, A3>
      readonly selfScope?: fiberScope.FiberScope | undefined
      readonly otherScope?: fiberScope.FiberScope | undefined
    }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<
    R | R1 | R2 | R3,
    E2 | E3,
    A2 | A3
  >,
  <R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    self: Effect.Effect<R, E, A>,
    other: Effect.Effect<R1, E1, A1>,
    options: {
      readonly onSelfWin: (
        winner: Fiber.RuntimeFiber<E, A>,
        loser: Fiber.RuntimeFiber<E1, A1>
      ) => Effect.Effect<R2, E2, A2>
      readonly onOtherWin: (
        winner: Fiber.RuntimeFiber<E1, A1>,
        loser: Fiber.RuntimeFiber<E, A>
      ) => Effect.Effect<R3, E3, A3>
      readonly selfScope?: fiberScope.FiberScope | undefined
      readonly otherScope?: fiberScope.FiberScope | undefined
    }
  ) => Effect.Effect<
    R | R1 | R2 | R3,
    E2 | E3,
    A2 | A3
  >
>(3, <R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  self: Effect.Effect<R, E, A>,
  other: Effect.Effect<R1, E1, A1>,
  options: {
    readonly onSelfWin: (
      winner: Fiber.RuntimeFiber<E, A>,
      loser: Fiber.RuntimeFiber<E1, A1>
    ) => Effect.Effect<R2, E2, A2>
    readonly onOtherWin: (
      winner: Fiber.RuntimeFiber<E1, A1>,
      loser: Fiber.RuntimeFiber<E, A>
    ) => Effect.Effect<R3, E3, A3>
    readonly selfScope?: fiberScope.FiberScope | undefined
    readonly otherScope?: fiberScope.FiberScope | undefined
  }
) =>
  core.withFiberRuntime<R | R1 | R2 | R3, E2 | E3, A2 | A3>((parentFiber, parentStatus) => {
    const parentRuntimeFlags = parentStatus.runtimeFlags
    const raceIndicator = MRef.make(true)
    const leftFiber: FiberRuntime<E, A> = unsafeMakeChildFiber(
      self,
      parentFiber,
      parentRuntimeFlags,
      options.selfScope
    )
    const rightFiber: FiberRuntime<E1, A1> = unsafeMakeChildFiber(
      other,
      parentFiber,
      parentRuntimeFlags,
      options.otherScope
    )
    return core.async<R | R1 | R2 | R3, E2 | E3, A2 | A3>((cb) => {
      leftFiber.addObserver(() => completeRace(leftFiber, rightFiber, options.onSelfWin, raceIndicator, cb))
      rightFiber.addObserver(() => completeRace(rightFiber, leftFiber, options.onOtherWin, raceIndicator, cb))
      leftFiber.startFork(self)
      rightFiber.startFork(other)
    }, FiberId.combine(leftFiber.id(), rightFiber.id()))
  }))

const completeRace = <R, R1, R2, E2, A2, R3, E3, A3>(
  winner: Fiber.RuntimeFiber<any, any>,
  loser: Fiber.RuntimeFiber<any, any>,
  cont: (winner: Fiber.RuntimeFiber<any, any>, loser: Fiber.RuntimeFiber<any, any>) => Effect.Effect<any, any, any>,
  ab: MRef.MutableRef<boolean>,
  cb: (_: Effect.Effect<R | R1 | R2 | R3, E2 | E3, A2 | A3>) => void
): void => {
  if (MRef.compareAndSet(true, false)(ab)) {
    cb(cont(winner, loser))
  }
}

/** @internal */
export const ensuring = dual<
  <R1, X>(
    finalizer: Effect.Effect<R1, never, X>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R1, E, A>,
  <R, E, A, R1, X>(
    self: Effect.Effect<R, E, A>,
    finalizer: Effect.Effect<R1, never, X>
  ) => Effect.Effect<R | R1, E, A>
>(2, (self, finalizer) =>
  core.uninterruptibleMask((restore) =>
    core.matchCauseEffect(restore(self), {
      onFailure: (cause1) =>
        core.matchCauseEffect(finalizer, {
          onFailure: (cause2) => core.failCause(internalCause.sequential(cause1, cause2)),
          onSuccess: () => core.failCause(cause1)
        }),
      onSuccess: (a) => core.as(finalizer, a)
    })
  ))

/** @internal */
export const invokeWithInterrupt: <R, E, A>(
  self: Effect.Effect<R, E, A>,
  entries: ReadonlyArray<Entry<unknown>>
) => Effect.Effect<R, E, void> = <R, E, A>(dataSource: Effect.Effect<R, E, A>, all: ReadonlyArray<Entry<unknown>>) =>
  core.fiberIdWith((id) =>
    core.flatMap(
      core.flatMap(
        forkDaemon(core.interruptible(dataSource)),
        (processing) =>
          core.async<never, E, void>((cb) => {
            const counts = all.map((_) => _.listeners.count)
            const checkDone = () => {
              if (counts.every((count) => count === 0)) {
                cleanup.forEach((f) => f())
                cb(core.interruptFiber(processing))
              }
            }
            processing.addObserver((exit) => {
              cleanup.forEach((f) => f())
              cb(exit)
            })
            const cleanup = all.map((r, i) => {
              const observer = (count: number) => {
                counts[i] = count
                checkDone()
              }
              r.listeners.addObserver(observer)
              return () => r.listeners.removeObserver(observer)
            })
            checkDone()
            return core.sync(() => {
              cleanup.forEach((f) => f())
            })
          })
      ),
      () =>
        core.suspend(() => {
          const residual = all.flatMap((entry) => {
            if (!entry.state.completed) {
              return [entry]
            }
            return []
          })
          return core.forEachSequentialDiscard(
            residual,
            (entry) => complete(entry.request as any, core.exitInterrupt(id))
          )
        })
    )
  )

/** @internal */
export const interruptWhenPossible = dual<
  (all: Iterable<Request<any, any>>) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R, E, void>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    all: Iterable<Request<any, any>>
  ) => Effect.Effect<R, E, void>
>(2, (self, all) =>
  core.fiberRefGetWith(
    currentRequestMap,
    (map) =>
      core.suspend(() => {
        const entries = RA.fromIterable(all).flatMap((_) => map.has(_) ? [map.get(_)!] : [])
        return invokeWithInterrupt(self, entries)
      })
  ))

// circular Tracer

/** @internal */
export const makeSpanScoped = (
  name: string,
  options?: {
    readonly attributes?: Record<string, unknown> | undefined
    readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
    readonly parent?: Tracer.ParentSpan | undefined
    readonly root?: boolean | undefined
    readonly context?: Context.Context<never> | undefined
  }
): Effect.Effect<Scope.Scope, never, Tracer.Span> =>
  acquireRelease(
    internalEffect.makeSpan(name, options),
    (span, exit) =>
      core.flatMap(
        internalEffect.currentTimeNanosTracing,
        (endTime) => core.sync(() => span.end(endTime, exit))
      )
  )

/* @internal */
export const withTracerScoped = (value: Tracer.Tracer): Effect.Effect<Scope.Scope, never, void> =>
  fiberRefLocallyScopedWith(defaultServices.currentServices, Context.add(tracer.tracerTag, value))

/** @internal */
export const withSpanScoped = dual<
  (name: string, options?: {
    readonly attributes?: Record<string, unknown> | undefined
    readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
    readonly parent?: Tracer.ParentSpan | undefined
    readonly root?: boolean | undefined
    readonly context?: Context.Context<never> | undefined
  }) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Tracer.ParentSpan> | Scope.Scope, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, name: string, options?: {
    readonly attributes?: Record<string, unknown> | undefined
    readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
    readonly parent?: Tracer.ParentSpan | undefined
    readonly root?: boolean | undefined
    readonly context?: Context.Context<never> | undefined
  }) => Effect.Effect<Exclude<R, Tracer.ParentSpan> | Scope.Scope, E, A>
>(
  (args) => typeof args[0] !== "string",
  (self, name, options) =>
    core.flatMap(
      makeSpanScoped(name, options),
      (span) => internalEffect.provideService(self, tracer.spanTag, span)
    )
)
