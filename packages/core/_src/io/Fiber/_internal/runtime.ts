import { DeferredState } from "@effect/core/io/Deferred/_internal/DeferredState"
import { DeferredSym } from "@effect/core/io/Deferred/definition"
import type {
  ErasedEffect,
  IOnFailure,
  IOnSuccess,
  IOnSuccessAndFailure,
  IWhileLoop
} from "@effect/core/io/Effect/definition/primitives"
import {
  IAsync,
  IUpdateRuntimeFlagsInterruptible,
  IUpdateRuntimeFlagsUninterruptible,
  IYieldNow
} from "@effect/core/io/Effect/definition/primitives"
import type { FiberMessage } from "@effect/core/io/Fiber/_internal/message"
import * as message from "@effect/core/io/Fiber/_internal/message"
import { _A, _E, FiberSym } from "@effect/core/io/Fiber/definition"
import { Done, Running, Suspended } from "@effect/core/io/Fiber/status"
import { _Patch, _Value, FiberRef, FiberRefSym } from "@effect/core/io/FiberRef/definition"
import { defaultLogger } from "@effect/core/io/Logger/operations/default"
import type { Scheduler } from "@effect/core/support/Scheduler"
import { defaultScheduler } from "@effect/core/support/Scheduler"

export type EvaluationSignal = "Continue" | "Done" | "YieldNow"

export const currentFiber = new AtomicReference<FiberRuntime<any, any> | null>(null)

export type Continuation =
  | IOnSuccess<any, any, any, any, any, any>
  | IOnSuccessAndFailure<any, any, any, any, any, any, any, any, any>
  | IOnFailure<any, any, any, any, any, any>
  | IWhileLoop<any, any, any>
  | RevertFlags

export class RevertFlags {
  readonly _tag = "RevertFlags"
  constructor(readonly patch: RuntimeFlags.Patch) {}
}

function absurd(_: never): never {
  throw new Error(`Bug: ${_}`)
}

const fibersStarted = Metric.counter("effect_fiber_started")
const fiberSuccesses = Metric.counter("effect_fiber_successes")
const fiberFailures = Metric.counter("effect_fiber_failures")

const fiberLifetimes = Metric.histogram(
  "effect_fiber_lifetimes",
  Metric.Histogram.Boundaries.exponential(1, 2, 100)
)

export class FiberRuntime<E, A> implements Fiber.Runtime<E, A> {
  readonly [FiberSym]!: FiberSym
  readonly [_E]!: () => E
  readonly [_A]!: () => A
  readonly _tag = "RuntimeFiber"
  private _fiberRefs: FiberRefs
  private _fiberId: FiberId.Runtime
  private _runtimeFlags: RuntimeFlags
  constructor(
    fiberId: FiberId.Runtime,
    fiberRefs0: FiberRefs,
    runtimeFlags0: RuntimeFlags
  ) {
    this._runtimeFlags = runtimeFlags0
    this._fiberId = fiberId
    this._fiberRefs = fiberRefs0
    if (runtimeFlags0.isEnabled(RuntimeFlags.RuntimeMetrics)) {
      fibersStarted.unsafeUpdate(1, HashSet.empty())
    }
  }
  private _queue = MutableQueue.unbounded<FiberMessage>()
  private _children: Set<FiberRuntime<any, any>> | null = null
  private _observers = List.empty<(exit: Exit<E, A>) => void>()
  private _running = false
  private _stack: Stack<Continuation> | undefined = void 0
  private _asyncInterruptor: ((effect: Effect<any, any, any>) => any) | null = null
  private _asyncBlockingOn: FiberId | null = null
  private _exitValue: Exit<E, A> | null = null

  /**
   * Returns an effect that will contain information computed from the fiber
   * state and status while running on the fiber.
   *
   * This allows the outside world to interact safely with mutable fiber state
   * without locks or immutable data.
   */
  ask<Z>(
    f: (fiber: FiberRuntime<E, A>, status: Fiber.Status) => Z
  ): Effect<never, never, Z> {
    return Effect.suspendSucceed(() => {
      const promise = Deferred.unsafeMake<never, Z>(this._fiberId)
      this.tell(
        new message.Stateful((fiber, status) => {
          promise.unsafeDone(Effect.succeed(f(fiber, status)))
        })
      )
      return promise.await
    })
  }

  /**
   * Awaits the fiber, which suspends the awaiting fiber until the result of the
   * fiber has been determined.
   */
  get await() {
    return Effect.asyncInterruptBlockingOn<never, never, Exit<E, A>>((resume) => {
      const cb = (exit: Exit<E, A>) => resume(Exit.succeed(exit))
      this.tell(
        new message.Stateful((fiber, _) => {
          if (fiber._exitValue !== null) {
            cb(this._exitValue!)
          } else {
            fiber.addObserver(cb)
          }
        })
      )
      return Either.left(Effect.sync(this.tell(
        new message.Stateful((fiber, _) => {
          fiber.removeObserver(cb)
        })
      )))
    }, this.id)
  }

  tell(message: FiberMessage) {
    this._queue.offer(message)
    if (!this._running) {
      this._running = true
      this.drainQueueLaterOnExecutor()
    }
  }

  /**
   * Retrieves the immediate children of the fiber.
   */
  get children() {
    return this.ask((fiber) => Chunk.from(fiber.getChildren))
  }

  /**
   * Retrieves the whole set of fiber refs.
   */
  get fiberRefs() {
    return this.ask((fiber) => fiber.getFiberRefs)
  }

  /**
   * The identity of the fiber.
   */
  get id() {
    return this._fiberId
  }

  /**
   * Inherits values from all [[FiberRef]] instances into current fiber. This
   * will resume immediately.
   */
  get inheritAll() {
    return Effect.withFiberRuntime<never, never, void>((parentFiber, parentStatus) => {
      const parentFiberId = parentFiber.id
      const parentFiberRefs = parentFiber.getFiberRefs
      const parentRuntimeFlags = parentStatus.runtimeFlags
      const childFiberRefs = this.getFiberRefs

      const updatedFiberRefs = parentFiberRefs.joinAs(parentFiberId, childFiberRefs)

      parentFiber.setFiberRefs(updatedFiberRefs)

      return this.runtimeFlags.flatMap((childRuntimeFlags) =>
        Effect.updateRuntimeFlags(
          parentRuntimeFlags
            .diff(childRuntimeFlags)
            .exclude(RuntimeFlags.WindDown)
            .exclude(RuntimeFlags.Interruption)
        )
      )
    })
  }

  /**
   * In the background, interrupts the fiber as if interrupted from the
   * specified fiber. If the fiber has already exited, the returned effect will
   * resume immediately. Otherwise, the effect will resume when the fiber exits.
   */
  interruptAsFork(fiberId: FiberId) {
    return Effect.sync(
      this.tell(new message.InterruptSignal(Cause.interrupt(fiberId)))
    )
  }

  /**
   * Tentatively observes the fiber, but returns immediately if it is not
   * already done.
   */
  get poll() {
    return Effect.sync(
      this._exitValue !== null ? Maybe.some(this._exitValue!) : Maybe.none
    )
  }

  /**
   * Tentatively observes the fiber, but returns immediately if it is not
   * already done.
   */
  get unsafePoll() {
    return this._exitValue
  }

  private run = () => {
    this.drainQueueOnCurrentThread()
  }

  /**
   * Gets the fiber runtime flags.
   */
  get runtimeFlags() {
    return this.ask((state, status) => {
      if (status._tag === "Done") {
        return state._runtimeFlags
      }
      return status.runtimeFlags
    })
  }

  /**
   * Gets a fiber scope
   */
  get scope() {
    return FiberScope.make(this)
  }

  /**
   * The status of the fiber.
   */
  get status() {
    return this.ask((_, status) => status)
  }

  /**
   * Adds a reference to the specified fiber inside the children set.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  addChild(child: FiberRuntime<any, any>) {
    this.getChildren.add(child)
  }

  /**
   * Removes a reference to the specified fiber inside the children set.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  removeChild(child: FiberRuntime<any, any>) {
    this.getChildren.delete(child)
  }

  /**
   * Adds an interruptor to the set of interruptors that are interrupting this
   * fiber.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  addInterruptedCause(cause: Cause<never>) {
    const oldSC = this.getFiberRef(FiberRef.interruptedCause)
    this.setFiberRef(FiberRef.interruptedCause, Cause.then(oldSC, cause))
  }

  /**
   * Adds an observer to the list of observers.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  addObserver(observer: (exit: Exit<E, A>) => void) {
    if (this._exitValue !== null) {
      observer(this._exitValue!)
    } else {
      this._observers = List.cons(observer, this._observers)
    }
  }

  /**
   * Deletes the specified fiber ref.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  deleteFiberRef<A>(fiberRef: FiberRef<A>) {
    this._fiberRefs = this._fiberRefs.delete(fiberRef)
  }

  /**
   * On the current thread, executes all messages in the fiber's inbox. This
   * method may return before all work is done, in the event the fiber executes
   * an asynchronous operation.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  drainQueueOnCurrentThread() {
    let recurse = true
    while (recurse) {
      let evaluationSignal: EvaluationSignal = "Continue"
      if (this._runtimeFlags.isEnabled(RuntimeFlags.CurrentFiber)) {
        currentFiber.set(this)
      }
      try {
        while (evaluationSignal === "Continue") {
          evaluationSignal = this._queue.isEmpty ?
            "Done" :
            this.evaluateMessageWhileSuspended(this._queue.poll(null)!)
        }
      } finally {
        this._running = false
        if (this._runtimeFlags.isEnabled(RuntimeFlags.CurrentFiber)) {
          currentFiber.set(null)
        }
      }
      // Maybe someone added something to the queue between us checking, and us
      // giving up the drain. If so, we need to restart the draining, but only
      // if we beat everyone else to the restart:
      if (!this._queue.isEmpty && !this._running) {
        this._running = true
        if (evaluationSignal === "YieldNow") {
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
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  drainQueueLaterOnExecutor() {
    this.getFiberRef(FiberRef.currentScheduler).scheduleTask(this.run)
  }

  /**
   * Drains the fiber's message queue while the fiber is actively running,
   * returning the next effect to execute, which may be the input effect if no
   * additional effect needs to be executed.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  drainQueueWhileRunning(
    runtimeFlags: RuntimeFlags,
    cur0: Effect<any, any, any>
  ) {
    let cur = cur0
    while (!this._queue.isEmpty) {
      const message = this._queue.poll(void 0)!
      switch (message._tag) {
        case "InterruptSignal": {
          this.processNewInterruptSignal(message.cause)
          cur = runtimeFlags.interruptible ? Exit.failCause(message.cause) : cur
          break
        }
        case "Resume": {
          throw new Error("It is illegal to have multiple concurrent run loops in a single fiber")
        }
        case "Stateful": {
          message.onFiber(this, new Running(runtimeFlags))
          break
        }
        case "YieldNow": {
          const oldCur = cur
          cur = Effect.yieldNow.flatMap(() => oldCur)
          break
        }
        default: {
          absurd(message)
        }
      }
    }
    return cur
  }

  /**
   * Processes a new incoming interrupt signal.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  processNewInterruptSignal(cause: Cause<never>) {
    this.addInterruptedCause(cause)
    this.sendInterruptSignalToAllChildren()
  }

  /**
   * Interrupts all children of the current fiber, returning an effect that will
   * await the exit of the children. This method will return null if the fiber
   * has no children.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  sendInterruptSignalToAllChildren() {
    if (this._children === null || this._children.size === 0) {
      return false
    }
    let told = false
    this._children.forEach((next) => {
      next.tell(new message.InterruptSignal(Cause.interrupt(this.id)))
      told = true
    })
    return told
  }

  /**
   * Retrieves the state of the fiber ref, or else its initial value.
   *
   * '''NOTE''': This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  getFiberRef<A>(fiberRef: FiberRef<A>) {
    return this._fiberRefs.getOrDefault(fiberRef)
  }

  /**
   * Gets the fiber's children set
   */
  get getChildren() {
    if (this._children === null) {
      this._children = new Set()
    }
    return this._children!
  }

  /**
   * Wholesale gets all fiber refs of this fiber.
   */
  get getFiberRefs() {
    return this._fiberRefs
  }

  /**
   * Evaluates a single message on the current thread, while the fiber is
   * suspended. This method should only be called while evaluation of the
   * fiber's effect is suspended due to an asynchronous operation.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  evaluateMessageWhileSuspended(message: FiberMessage): EvaluationSignal {
    switch (message._tag) {
      case "YieldNow": {
        return "YieldNow"
      }
      case "InterruptSignal": {
        this.processNewInterruptSignal(message.cause)
        if (this._asyncInterruptor) {
          this._asyncInterruptor(Exit.failCause(message.cause))
          this._asyncInterruptor = null
        }
        return "Continue"
      }
      case "Resume": {
        this._asyncInterruptor = null
        this._asyncBlockingOn = null
        this.evaluateEffect(message.effect)
        return "Continue"
      }
      case "Stateful": {
        message.onFiber(
          this,
          this._exitValue !== null ?
            new Done() :
            new Suspended(this._runtimeFlags, this._asyncBlockingOn!)
        )
        return "Continue"
      }
      default: {
        absurd(message)
      }
    }
  }

  /**
   * Determines if the fiber is interrupted.
   *
   * '''NOTE''': This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  get isInterrupted() {
    return !this.getFiberRef(FiberRef.interruptedCause).isEmpty
  }

  /**
   * Evaluates an effect until completion, potentially asynchronously.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  evaluateEffect(effect0: Effect<any, any, any>) {
    this.getSupervisor.onResume(this)
    try {
      let effect: Effect<any, any, any> | null =
        this._runtimeFlags.interruptible && this.isInterrupted ?
          Exit.failCause(this.getInterruptedCause) :
          effect0
      while (effect !== null) {
        try {
          const exit = this.runLoop(effect)
          this._runtimeFlags = this._runtimeFlags.enable(RuntimeFlags.WindDown)
          const interruption = this.interruptAllChildren()
          if (interruption !== null) {
            effect = interruption.flatMap(() => exit)
          } else {
            if (this._queue.isEmpty) {
              // No more messages to process, so we will allow the fiber to end life:
              this.setExitValue(exit)
            } else {
              // There are messages, possibly added by the final op executed by
              // the fiber. To be safe, we should execute those now before we
              // allow the fiber to end life:
              this.tell(new message.Resume(exit))
            }
            effect = null
          }
        } catch (e) {
          if (e instanceof IYieldNow) {
            if (this._runtimeFlags.cooperativeYielding) {
              this.tell(new message.YieldNow())
              this.tell(new message.Resume(Effect.unit))
              effect = null
            } else {
              effect = Effect.unit
            }
          } else if (e instanceof IAsync) {
            // Terminate this evaluation, async resumption will continue evaluation:
            effect = null
          } else {
            throw e
          }
        }
      }
    } finally {
      this.getSupervisor.onSuspend(this)
    }
  }

  reportExitValue(v: Exit<E, A>) {
    switch (v._tag) {
      case "Success": {
        if (this._runtimeFlags.isEnabled(RuntimeFlags.RuntimeMetrics)) {
          fiberSuccesses.unsafeUpdate(1, HashSet.empty())
        }
        break
      }
      case "Failure": {
        if (this._runtimeFlags.isEnabled(RuntimeFlags.RuntimeMetrics)) {
          fiberFailures.unsafeUpdate(1, HashSet.empty())
        }
        break
      }
    }
  }

  setExitValue(exit: Exit<E, A>) {
    this._exitValue = exit

    if (this._runtimeFlags.isEnabled(RuntimeFlags.RuntimeMetrics)) {
      const startTimeMillis = this.id.startTimeMillis
      const endTimeMillis = new Date().getTime()
      fiberLifetimes.unsafeUpdate((endTimeMillis - startTimeMillis) / 1000.0, HashSet.empty())
    }

    this.reportExitValue(exit)

    this._observers.forEach((observer) => {
      observer(exit)
    })
  }

  /**
   * Sets the fiber ref to the specified value.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  setFiberRef<A>(fiberRef: FiberRef<A>, value: A) {
    this._fiberRefs = this._fiberRefs.updateAs(this.id, fiberRef, value)
  }

  /**
   * Wholesale replaces all fiber refs of this fiber.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  setFiberRefs(fiberRefs: FiberRefs) {
    this._fiberRefs = fiberRefs
  }

  /**
   * Removes the specified observer from the list of observers that will be
   * notified when the fiber exits.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  removeObserver(observer: (exit: Exit<E, A>) => void) {
    this._observers = this._observers.filter((o) => o !== observer)
  }

  /**
   * Retrieves the current supervisor the fiber uses for supervising effects.
   *
   * '''NOTE''': This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  get getSupervisor() {
    return this.getFiberRef(FiberRef.currentSupervisor)
  }

  getNextSuccessCont() {
    while (this._stack) {
      const frame = this._stack.value
      this._stack = this._stack.previous
      if (frame._tag !== "OnFailure") {
        return frame
      }
    }
  }

  getNextFailCont() {
    while (this._stack) {
      const frame = this._stack.value
      this._stack = this._stack.previous
      if (frame._tag !== "OnSuccess" && frame._tag !== "WhileLoop") {
        return frame
      }
    }
  }

  /**
   * The main run-loop for evaluating effects.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  runLoop(effect0: Effect<any, any, any>): Exit<any, any> {
    let cur = effect0
    let ops = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this._runtimeFlags.opSupervision) {
        this.getSupervisor.onEffect(this, cur)
      }
      cur = this.drainQueueWhileRunning(this._runtimeFlags, cur)
      ops += 1
      if (ops >= 2048) {
        ops = 0
        const oldCur = cur
        cur = Effect.yieldNow.flatMap(() => oldCur)
      }
      try {
        const op = cur as ErasedEffect
        switch (op._tag) {
          case "Sync": {
            const value = op.evaluate()
            const cont = this.getNextSuccessCont()
            if (cont) {
              switch (cont._tag) {
                case "OnSuccess":
                case "OnSuccessAndFailure": {
                  cur = cont.successK(value)
                  break
                }
                case "RevertFlags": {
                  this.patchRuntimeFlags(this._runtimeFlags, cont.patch)
                  if (this._runtimeFlags.interruptible && this.isInterrupted) {
                    cur = Exit.failCause(this.getInterruptedCause)
                  } else {
                    cur = Effect.succeed(value)
                  }
                  break
                }
                case "WhileLoop": {
                  cont.process(value)
                  if (cont.check()) {
                    this._stack = new Stack(cont, this._stack)
                    cur = cont.body()
                  } else {
                    cur = Effect.unit
                  }
                  break
                }
                default: {
                  absurd(cont)
                }
              }
            } else {
              return Exit.succeed(value)
            }
            break
          }
          case "Success": {
            const oldCur = op
            const cont = this.getNextSuccessCont()
            if (cont) {
              switch (cont._tag) {
                case "OnSuccess":
                case "OnSuccessAndFailure": {
                  cur = cont.successK(oldCur.value)
                  break
                }
                case "RevertFlags": {
                  this.patchRuntimeFlags(this._runtimeFlags, cont.patch)
                  if (this._runtimeFlags.interruptible && this.isInterrupted) {
                    cur = Exit.failCause(this.getInterruptedCause)
                  }
                  break
                }
                case "WhileLoop": {
                  cont.process(oldCur.value)
                  if (cont.check()) {
                    this._stack = new Stack(cont, this._stack)
                    cur = cont.body()
                  } else {
                    cur = Effect.unit
                  }
                  break
                }
                default: {
                  absurd(cont)
                }
              }
            } else {
              return oldCur
            }
            break
          }
          case "Failure": {
            const oldCur = op
            const cont = this.getNextFailCont()
            if (cont) {
              switch (cont._tag) {
                case "OnFailure":
                case "OnSuccessAndFailure": {
                  if (!(this._runtimeFlags.interruptible && this.isInterrupted)) {
                    cur = cont.failK(oldCur.cause)
                  } else {
                    cur = Effect.failCause(oldCur.cause.stripFailures)
                  }
                  break
                }
                case "RevertFlags": {
                  this.patchRuntimeFlags(this._runtimeFlags, cont.patch)
                  if (this._runtimeFlags.interruptible && this.isInterrupted) {
                    cur = Exit.failCause(Cause.then(oldCur.cause, this.getInterruptedCause))
                  }
                  break
                }
                default: {
                  absurd(cont)
                }
              }
            } else {
              return oldCur
            }
            break
          }
          case "Stateful": {
            cur = op.onState(this, new Running(this._runtimeFlags))
            break
          }
          case "UpdateRuntimeFlags": {
            this.patchRuntimeFlags(this._runtimeFlags, op.update)
            cur = Effect.unit
            break
          }
          case "OnSuccess":
          case "OnFailure":
          case "OnSuccessAndFailure": {
            this._stack = new Stack(op, this._stack)
            cur = op.first
            break
          }
          case "Async": {
            this._asyncBlockingOn = op.blockingOn
            this.initiateAsync(this._runtimeFlags, op.register)
            throw op
          }
          case "YieldNow": {
            throw op
          }
          case "UpdateRuntimeFlagsWithin": {
            const updateFlags = op.update
            const oldRuntimeFlags = this._runtimeFlags
            const newRuntimeFlags = oldRuntimeFlags.patch(updateFlags)
            if (newRuntimeFlags === oldRuntimeFlags) {
              cur = op.scope(oldRuntimeFlags)
            } else {
              if (newRuntimeFlags.interruptible && this.isInterrupted) {
                cur = Exit.failCause(this.getInterruptedCause)
              } else {
                this.patchRuntimeFlags(this._runtimeFlags, updateFlags)
                const revertFlags = newRuntimeFlags.diff(oldRuntimeFlags)
                this._stack = new Stack(new RevertFlags(revertFlags), this._stack)
                cur = op.scope(oldRuntimeFlags)
              }
            }
            break
          }
          case "WhileLoop": {
            const check = op.check
            const body = op.body
            if (check()) {
              cur = body()
              this._stack = new Stack(op, this._stack)
            } else {
              cur = Effect.unit
            }
            break
          }
          default: {
            absurd(op)
          }
        }
      } catch (e) {
        if (e instanceof IYieldNow || e instanceof IAsync) {
          throw e
        } else {
          if (e instanceof Effect.Error) {
            cur = Effect.failCause(e.cause)
          } else {
            cur = Effect.failCause(Cause.die(e))
          }
        }
      }
    }
  }

  /**
   * Takes the current runtime flags, patches them to return the new runtime
   * flags, and then makes any changes necessary to fiber state based on the
   * specified patch.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  patchRuntimeFlags(oldRuntimeFlags: RuntimeFlags, patch: RuntimeFlags.Patch) {
    const newRuntimeFlags = oldRuntimeFlags.patch(patch)
    if (patch.isEnabled(RuntimeFlags.CurrentFiber)) {
      currentFiber.set(this)
    } else if (patch.isDisabled(RuntimeFlags.CurrentFiber)) {
      currentFiber.set(null)
    }
    this._runtimeFlags = newRuntimeFlags
    return newRuntimeFlags
  }

  /**
   * Initiates an asynchronous operation, by building a callback that will
   * resume execution, and then feeding that callback to the registration
   * function, handling error cases and repeated resumptions appropriately.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  initiateAsync(
    runtimeFlags: RuntimeFlags,
    asyncRegister: (resume: (effect: Effect<any, any, any>) => void) => void
  ) {
    let alreadyCalled = false
    const callback = (effect: Effect<any, any, any>) => {
      if (!alreadyCalled) {
        alreadyCalled = true
        this.tell(new message.Resume(effect))
      }
    }
    if (runtimeFlags.interruptible) {
      this._asyncInterruptor = callback
    }
    try {
      asyncRegister(callback)
    } catch (e) {
      callback(Effect.failCause(Cause.die(e)))
    }
  }

  /**
   * Interrupts all children of the current fiber, returning an effect that will
   * await the exit of the children. This method will return null if the fiber
   * has no children.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  interruptAllChildren() {
    if (this.sendInterruptSignalToAllChildren()) {
      const it = this._children!.values()
      this._children = null
      let isDone = false
      const body = () => {
        const next = it.next()
        if (!next.done) {
          return next.value.await
        } else {
          return Effect.sync(() => {
            isDone = true
          })
        }
      }
      return Effect.whileLoop(
        !isDone,
        body(),
        () => {
          //
        }
      )
    }
    return null
  }

  /**
   * Retrieves the interrupted cause of the fiber, which will be `Cause.empty`
   * if the fiber has not been interrupted.
   *
   * '''NOTE''': This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  get getInterruptedCause() {
    return this.getFiberRef(FiberRef.interruptedCause)
  }

  /**
   * Begins execution of the effect associated with this fiber on the current
   * thread. This can be called to "kick off" execution of a fiber after it has
   * been created, in hopes that the effect can be executed synchronously.
   *
   * This is not the normal way of starting a fiber, but it is useful when the
   * express goal of executing the fiber is to synchronously produce its exit.
   */
  start<R>(effect: Effect<R, E, A>) {
    if (!this._running) {
      try {
        this._running = true
        this.evaluateEffect(effect)
      } finally {
        this._running = false
        // Because we're special casing `start`, we have to be responsible
        // for spinning up the fiber if there were new messages added to
        // the queue between the completion of the effect and the transition
        // to the not running state.
        if (!this._queue.isEmpty) {
          this.drainQueueLaterOnExecutor()
        }
      }
    } else {
      this.tell(new message.Resume(effect))
    }
  }

  /**
   * Begins execution of the effect associated with this fiber on in the
   * background, and on the correct thread pool. This can be called to "kick
   * off" execution of a fiber after it has been created, in hopes that the
   * effect can be executed synchronously.
   */
  startFork<R>(effect: Effect<R, E, A>) {
    this.tell(new message.Resume(effect))
  }

  /**
   * Updates a fiber ref belonging to this fiber by using the provided update
   * function.
   *
   * '''NOTE''': This method must be invoked by the fiber itself.
   */
  updateFiberRef<A>(fiberRef: FiberRef<A>, f: (a: A) => A) {
    return this.setFiberRef(fiberRef, f(this.getFiberRef(fiberRef)))
  }

  get getLoggers() {
    return this.getFiberRef(FiberRef.currentLoggers)
  }

  /**
   * Logs using the current set of loggers.
   *
   * '''NOTE''': This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  log(
    message: string,
    cause: Cause<any>,
    overrideLogLevel: Maybe<LogLevel>
  ) {
    const logLevel = overrideLogLevel.isSome() ?
      overrideLogLevel.value :
      this.getFiberRef(FiberRef.currentLogLevel)
    const spans = this.getFiberRef(FiberRef.currentLogSpan)
    const annotations = this.getFiberRef(FiberRef.currentLogAnnotations)
    const loggers = this.getLoggers
    const contextMap = this.getFiberRefs
    loggers.forEach((logger) => {
      logger.apply(this.id, logLevel, message, cause, contextMap, spans, annotations)
    })
  }
}

// circular

/**
 * Unsafely makes a new `Deferred`.
 *
 * @tsplus static effect/core/io/Deferred.Ops unsafeMake
 */
export function unsafeMakeDeferred<E, A>(fiberId: FiberId): Deferred<E, A> {
  return new DeferredInternal(new AtomicReference(DeferredState.pending([])), fiberId)
}

function interruptJoiner<E, A>(
  self: Deferred<E, A>,
  joiner: (a: Effect<never, E, A>) => void
): Effect<never, never, void> {
  return Effect.sync(() => {
    const state = self.state.get
    if (state._tag === "Pending") {
      self.state.set(DeferredState.pending(state.joiners.filter((j) => j !== joiner)))
    }
  })
}

export class DeferredInternal<E, A> {
  readonly [DeferredSym]: DeferredSym = DeferredSym
  readonly [_E]!: () => E
  readonly [_A]!: () => A

  constructor(
    readonly state: AtomicReference<DeferredState<E, A>>,
    readonly blockingOn: FiberId
  ) {}

  /**
   * Retrieves the value of the promise, suspending the fiber running the action
   * until the result is available.
   */
  get await(): Effect<never, E, A> {
    return Effect.asyncInterruptBlockingOn((k) => {
      const state = this.state.get

      switch (state._tag) {
        case "Done": {
          return Either.right(state.value)
        }
        case "Pending": {
          this.state.set(DeferredState.pending([k, ...state.joiners]))
          return Either.left(interruptJoiner(this, k))
        }
      }
    }, this.blockingOn)
  }

  /**
   * Completes the deferred with the result of the specified effect. If the
   * deferred has already been completed, the method will produce false.
   *
   * Note that `Deferred.completeWith` will be much faster, so consider using
   * that if you do not need to memoize the result of the specified effect.
   */
  complete<E, A>(this: Deferred<E, A>, effect: Effect<never, E, A>): Effect<never, never, boolean> {
    return effect.intoDeferred(this)
  }

  /**
   * Completes the deferred with the result of the specified effect. If the
   * deferred has already been completed, the method will produce false.
   *
   * Note that `Deferred.completeWith` will be much faster, so consider using
   * that if you do not need to memoize the result of the specified effect.
   */
  completeWith<E, A>(
    this: Deferred<E, A>,
    effect: Effect<never, E, A>
  ): Effect<never, never, boolean> {
    return Effect.sync(() => {
      const state = this.state.get
      switch (state._tag) {
        case "Done": {
          return false
        }
        case "Pending": {
          this.state.set(DeferredState.done(effect))
          state.joiners.forEach((f) => {
            f(effect)
          })
          return true
        }
      }
    })
  }

  /**
   * Kills the promise with the specified error, which will be propagated to all
   * fibers waiting on the value of the promise.
   */
  die<E, A>(this: Deferred<E, A>, defect: unknown): Effect<never, never, boolean> {
    return this.completeWith(Effect.die(defect))
  }

  /**
   * Kills the promise with the specified error, which will be propagated to all
   * fibers waiting on the value of the promise.
   */
  dieSync<E, A>(this: Deferred<E, A>, defect: LazyArg<unknown>): Effect<never, never, boolean> {
    return this.completeWith(Effect.dieSync(defect))
  }

  /**
   * Exits the deferred with the specified exit, which will be propagated to all
   * fibers waiting on the value of the deferred.
   */
  done<E, A>(this: Deferred<E, A>, exit: Exit<E, A>): Effect<never, never, boolean> {
    return this.completeWith(Effect.done(exit))
  }

  /**
   * Fails the deferred with the specified error, which will be propagated to all
   * fibers waiting on the value of the deferred.
   */
  fail<E, A>(this: Deferred<E, A>, e: E): Effect<never, never, boolean> {
    return this.completeWith(Effect.fail(e))
  }

  /**
   * Fails the deferred with the specified error, which will be propagated to all
   * fibers waiting on the value of the deferred.
   */
  failSync<E, A>(this: Deferred<E, A>, e: LazyArg<E>): Effect<never, never, boolean> {
    return this.completeWith(Effect.failSync(e))
  }

  /**
   * Fails the deferred with the specified cause, which will be propagated to all
   * fibers waiting on the value of the deferred.
   */
  failCause<E, A>(this: Deferred<E, A>, cause: LazyArg<Cause<E>>): Effect<never, never, boolean> {
    return this.completeWith(Effect.failCauseSync(cause))
  }

  /**
   * Fails the deferred with the specified cause, which will be propagated to all
   * fibers waiting on the value of the deferred.
   */
  failCauseSync<E, A>(this: Deferred<E, A>, cause: Cause<E>): Effect<never, never, boolean> {
    return this.completeWith(Effect.failCause(cause))
  }

  /**
   * Completes the deferred with interruption. This will interrupt all fibers
   * waiting on the value of the deferred as by the fiber calling this method.
   */
  get interrupt(): Effect<never, never, boolean> {
    return Effect.fiberId.flatMap((id) => this.completeWith(Effect.interruptAs(id)))
  }

  /**
   * Completes the deferred with interruption. This will interrupt all fibers
   * waiting on the value of the deferred as by the fiber calling this method.
   */
  interruptAs<E, A>(this: Deferred<E, A>, fiberId: FiberId): Effect<never, never, boolean> {
    return this.completeWith(Effect.interruptAs(fiberId))
  }

  /**
   * Checks for completion of this `Promise`. Produces true if this promise has
   * already been completed with a value or an error and false otherwise.
   */
  get isDone(): Effect<never, never, boolean> {
    return Effect.sync(this.state.get._tag === "Done")
  }

  /**
   * Checks for completion of this `Deferred`. Returns the result effect if this
   * deferred has already been completed or a `None` otherwise.
   */
  get poll(): Effect<never, never, Maybe<Effect<never, E, A>>> {
    return Effect.sync(() => {
      const state = this.state.get
      switch (state._tag) {
        case "Pending": {
          return Maybe.none
        }
        case "Done": {
          return Maybe.some(state.value)
        }
      }
    })
  }

  /**
   * Completes the deferred with the specified value.
   */
  succeed<E, A>(this: Deferred<E, A>, value: A): Effect<never, never, boolean> {
    return this.completeWith(Effect.sync(value))
  }

  /**
   * Completes the deferred with the specified value.
   */
  sync<E, A>(this: Deferred<E, A>, value: LazyArg<A>): Effect<never, never, boolean> {
    return this.completeWith(Effect.sync(value))
  }

  /**
   * Unsafe version of `done`.
   */
  unsafeDone<E, A>(this: Deferred<E, A>, effect: Effect<never, E, A>): void {
    const state = this.state.get
    if (state._tag === "Pending") {
      this.state.set(DeferredState.done(effect))
      Array.from(state.joiners)
        .reverse()
        .forEach((f) => {
          f(effect)
        })
    }
  }
}

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 *
 * @tsplus getter effect/core/io/Effect forkDaemon
 */
export function forkDaemon<R, E, A>(self: Effect<R, E, A>): Effect<R, never, Fiber.Runtime<E, A>> {
  return self.fork.daemonChildren
}

/**
 * Returns a new workflow that will not supervise any fibers forked by this
 * workflow.
 *
 * @tsplus getter effect/core/io/Effect daemonChildren
 */
export function daemonChildren<R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> {
  return self.apply(FiberRef.forkScopeOverride.locally(Maybe.some(FiberScope.global)))
}

/**
 * Returns an effect that forks this effect into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin executing
 * the effect.
 *
 * You can use the `fork` method whenever you want to execute an effect in a
 * new fiber, concurrently and without "blocking" the fiber executing other
 * effects. Using fibers can be tricky, so instead of using this method
 * directly, consider other higher-level methods, such as `raceWith`,
 * `zipPar`, and so forth.
 *
 * The fiber returned by this method has methods to interrupt the fiber and to
 * wait for it to finish executing the effect. See `Fiber` for more
 * information.
 *
 * Whenever you use this method to launch a new fiber, the new fiber is
 * attached to the parent fiber's scope. This means when the parent fiber
 * terminates, the child fiber will be terminated as well, ensuring that no
 * fibers leak. This behavior is called "auto supervision", and if this
 * behavior is not desired, you may use the `forkDaemon` or `forkIn` methods.
 *
 * @tsplus getter effect/core/io/Effect fork
 */
export function fork<R, E, A>(self: Effect<R, E, A>): Effect<R, never, Fiber.Runtime<E, A>> {
  return Effect.withFiberRuntime<R, never, Fiber.Runtime<E, A>>((state, status) =>
    Effect.succeed(unsafeFork(self, state, status.runtimeFlags))
  )
}

export function unsafeFork<R, E, A, E2, B>(
  effect: Effect<R, E, A>,
  parentFiber: FiberRuntime<E2, B>,
  parentRuntimeFlags: RuntimeFlags
): FiberRuntime<E, A> {
  const childFiber = unsafeForkUnstarted(effect, parentFiber, parentRuntimeFlags)
  childFiber.start(effect)
  return childFiber
}

export function unsafeForkUnstarted<R, E, A, E2, B>(
  effect: Effect<R, E, A>,
  parentFiber: FiberRuntime<E2, B>,
  parentRuntimeFlags: RuntimeFlags
): FiberRuntime<E, A> {
  const childId = FiberId.unsafeMake()
  const parentFiberRefs = parentFiber.getFiberRefs
  const childFiberRefs = parentFiberRefs.forkAs(childId)
  const childFiber = new FiberRuntime<E, A>(childId, childFiberRefs, parentRuntimeFlags)
  const childEnvironment = childFiberRefs.getOrDefault(FiberRef.currentEnvironment)
  const supervisor = childFiber.getSupervisor

  supervisor.onStart(
    childEnvironment,
    effect,
    Maybe.some(parentFiber),
    childFiber
  )

  childFiber.addObserver(exit => supervisor.onEnd(exit, childFiber))

  const parentScope = parentFiber.getFiberRef(FiberRef.forkScopeOverride).getOrElse(
    parentFiber.scope
  )

  parentScope.add(parentRuntimeFlags, childFiber)

  return childFiber
}

/**
 * Used to restore the inherited interruptibility
 */
export interface InterruptStatusRestore {
  readonly restore: <R, E, A>(
    effect: Effect<R, E, A>
  ) => Effect<R, E, A>
}

export class InterruptStatusRestoreImpl implements InterruptStatusRestore {
  constructor(readonly flag: InterruptStatus) {}

  restore = <R, E, A>(
    effect: Effect<R, E, A>
  ): Effect<R, E, A> => {
    return effect.interruptStatus(this.flag)
  }
}

// -----------------------------------------------------------------------------
// Operations
// -----------------------------------------------------------------------------

/**
 * Returns an effect that is interrupted by the current fiber
 *
 * @tsplus static effect/core/io/Effect.Ops interrupt
 */
export const interrupt = Effect.fiberId.flatMap((fiberId) => Effect.interruptAs(fiberId))

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects interruptStatus
 * @tsplus pipeable effect/core/io/Effect interruptStatus
 */
export function interruptStatus(flag: LazyArg<InterruptStatus>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.suspendSucceed(() => {
      if (flag().isInterruptible) {
        return self.interruptible
      }
      return self.uninterruptible
    })
}

/**
 * Returns a new effect that performs the same operations as this effect, but
 * interruptibly, even if composed inside of an uninterruptible region.
 *
 * Note that effects are interruptible by default, so this function only has
 * meaning if used within an uninterruptible region.
 *
 * **WARNING**: This operator "punches holes" into effects, allowing them to be
 * interrupted in unexpected places. Do not use this operator unless you know
 * exactly what you are doing. Instead, you should use `uninterruptibleMask`.
 *
 * @tsplus getter effect/core/io/Effect interruptible
 */
export function interruptible<R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> {
  return new IUpdateRuntimeFlagsInterruptible(self)
}

/**
 * Performs this effect uninterruptibly. This will prevent the effect from
 * being terminated externally, but the effect may fail for internal reasons
 * (e.g. an uncaught error) or terminate due to defect.
 *
 * Uninterruptible effects may recover from all failure causes (including
 * interruption of an inner effect that has been made interruptible).
 *
 * @tsplus getter effect/core/io/Effect uninterruptible
 */
export function uninterruptible<R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> {
  return new IUpdateRuntimeFlagsUninterruptible(self)
}

/**
 * Checks the interrupt status, and produces the effect returned by the
 * specified callback.
 *
 * @tsplus static effect/core/io/Effect.Ops checkInterruptible
 */
export function checkInterruptible<R, E, A>(
  f: (interruptStatus: InterruptStatus) => Effect<R, E, A>
): Effect<R, E, A> {
  return Effect.withFiberRuntime((_, status) =>
    f(InterruptStatus.fromBoolean(status.runtimeFlags.interruption))
  )
}

/**
 * Makes the effect interruptible, but passes it a restore function that can
 * be used to restore the inherited interruptibility from whatever region the
 * effect is composed into.
 *
 * @tsplus static effect/core/io/Effect.Ops interruptibleMask
 */
export function interruptibleMask<R, E, A>(
  f: (statusRestore: InterruptStatusRestore) => Effect<R, E, A>
): Effect<R, E, A> {
  return checkInterruptible((flag) => f(new InterruptStatusRestoreImpl(flag)).interruptible)
}

/**
 * Makes the effect uninterruptible, but passes it a restore function that can
 * be used to restore the inherited interruptibility from whatever region the
 * effect is composed into.
 *
 * @tsplus static effect/core/io/Effect.Ops uninterruptibleMask
 */
export function uninterruptibleMask<R, E, A>(
  f: (statusRestore: InterruptStatusRestore) => Effect<R, E, A>
): Effect<R, E, A> {
  return checkInterruptible((flag) => f(new InterruptStatusRestoreImpl(flag)).uninterruptible)
}

/**
 * Returns an effect whose interruption will be disconnected from the
 * fiber's own interruption, being performed in the background without
 * slowing down the fiber's interruption.
 *
 * This method is useful to create "fast interrupting" effects. For
 * example, if you call this on a bracketed effect, then even if the
 * effect is "stuck" in acquire or release, its interruption will return
 * immediately, while the acquire / release are performed in the
 * background.
 *
 * See timeout and race for other applications.
 *
 * @tsplus getter effect/core/io/Effect disconnect
 */
export function disconnect<R, E, A>(
  self: Effect<R, E, A>
): Effect<R, E, A> {
  return uninterruptibleMask(({ restore }) =>
    Do(($) => {
      const id = $(Effect.fiberId)
      const fiber = $(restore(self).forkDaemon)
      return $(fiber.join.interruptible.onInterrupt(() => fiber.interruptAsFork(id)))
    })
  )
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 *
 * @tsplus static effect/core/io/Effect.Aspects onInterrupt
 * @tsplus pipeable effect/core/io/Effect onInterrupt
 */
export function onInterrupt<R2, X>(
  cleanup: (interruptors: HashSet<FiberId>) => Effect<R2, never, X>
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E, A> =>
    Effect.uninterruptibleMask(({ restore }) =>
      restore(self).foldCauseEffect(
        (cause) =>
          cause.isInterrupted
            ? cleanup(cause.interruptors).zipRight(Effect.failCause(cause))
            : Effect.failCause(cause),
        Effect.succeed
      )
    )
}

// final def onInterrupt[R1 <: R](cleanup: Set[FiberId] => URIO[R1, Any])(implicit trace: Trace): ZIO[R1, E, A] =
// ZIO.uninterruptibleMask { restore =>
//   restore(self).foldCauseZIO(
//     cause =>
//       if (cause.isInterrupted) cleanup(cause.interruptors) *> ZIO.refailCause(cause) else ZIO.refailCause(cause),
//     a => ZIO.succeedNow(a)
//   )
// }

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 *
 * @tsplus static effect/core/io/Effect.Aspects onInterruptPolymorphic
 * @tsplus pipeable effect/core/io/Effect onInterruptPolymorphic
 */
export function onInterruptPolymorphic<R2, E2, X>(
  cleanup: (interruptors: HashSet<FiberId>) => Effect<R2, E2, X>
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> =>
    Effect.uninterruptibleMask(({ restore }) =>
      restore(self).foldCauseEffect(
        (cause) =>
          cause.isInterrupted
            ? cleanup(cause.interruptors).foldCauseEffect(
              Effect.failCause,
              () => Effect.failCause(cause)
            )
            : Effect.failCause(cause),
        Effect.succeed
      )
    )
}

/**
 * Returns an effect that is interrupted as if by the specified fiber.
 *
 * @tsplus static effect/core/io/Effect.Ops interruptAs
 */
export function interruptAs(fiberId: FiberId) {
  return Effect.failCauseSync(Cause.interrupt(fiberId))
}

/**
 * Returns an effect that succeeds or fails a deferred based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified deferred will be interrupted, too.
 *
 * @tsplus static effect/core/io/Effect.Aspects intoDeferred
 * @tsplus pipeable effect/core/io/Effect intoDeferred
 */
export function intoDeferred<E, A>(deferred: Deferred<E, A>) {
  return <R>(self: Effect<R, E, A>): Effect<R, never, boolean> =>
    Effect.uninterruptibleMask(({ restore }) =>
      restore(self)
        .exit
        .flatMap((exit) => deferred.done(exit))
    )
}

export class FiberRefInternal<Value, Patch> implements FiberRef.WithPatch<Value, Patch> {
  readonly [FiberRefSym]: FiberRefSym = FiberRefSym
  readonly [_Value]!: Value
  readonly [_Patch]!: Patch

  constructor(
    readonly initial: Value,
    readonly diff: (oldValue: Value, newValue: Value) => Patch,
    readonly combine: (first: Patch, second: Patch) => Patch,
    readonly patch: (patch: Patch) => (oldValue: Value) => Value,
    readonly fork: Patch,
    readonly join: (oldV: Value, newV: Value) => Value
  ) {}

  /**
   * Atomically modifies the `FiberRef` with the specified function, which
   * computes a return value for the modification. This is a more powerful
   * version of `update`.
   */
  modify<B>(
    f: (a: Value) => Tuple<[B, Value]>
  ): Effect<never, never, B> {
    return Effect.withFiberRuntime((state) => {
      const { tuple: [b, a] } = f(state.getFiberRef(this))
      state.setFiberRef(this, a)
      return Effect.succeed(b)
    })
  }

  get get(): Effect<never, never, Value> {
    return this.modify((a) => Tuple(a, a))
  }

  get delete(): Effect<never, never, void> {
    return Effect.withFiberRuntime((state) => {
      state.deleteFiberRef(this)
      return Effect.unit
    })
  }

  get reset(): Effect<never, never, void> {
    return this.set(this.initial)
  }

  getAndSet(
    this: FiberRef.WithPatch<Value, Patch>,
    value: Value
  ): Effect<never, never, Value> {
    return this.modify((v) => Tuple(v, value))
  }

  getAndUpdate(
    this: FiberRef.WithPatch<Value, Patch>,
    f: (a: Value) => Value
  ): Effect<never, never, Value> {
    return this.modify((v) => Tuple(v, f(v)))
  }

  getAndUpdateSome(
    this: FiberRef.WithPatch<Value, Patch>,
    pf: (a: Value) => Maybe<Value>
  ): Effect<never, never, Value> {
    return this.modify((v) => Tuple(v, pf(v).getOrElse(v)))
  }

  getWith<R, E, B>(
    this: FiberRef.WithPatch<Value, Patch>,
    f: (a: Value) => Effect<R, E, B>
  ): Effect<R, E, B> {
    return this.get.flatMap(f)
  }

  locally(
    this: FiberRef.WithPatch<Value, Patch>,
    value: Value
  ): <R, E, B>(use: Effect<R, E, B>) => Effect<R, E, B> {
    return (use) =>
      Effect.acquireUseRelease(
        this.get < this.set(value),
        (_) => use,
        (v) => this.set(v)
      )
  }

  locallyScoped(
    this: FiberRef.WithPatch<Value, Patch>,
    value: Value
  ): Effect<Scope, never, void> {
    return Effect.acquireRelease(
      this.get.flatMap((old) => this.set(value).as(old)),
      (a) => this.set(a)
    ).unit
  }

  locallyScopedWith(
    this: FiberRef.WithPatch<Value, Patch>,
    f: (a: Value) => Value
  ): Effect<Scope, never, void> {
    return this.getWith((a) => this.locallyScoped(f(a)))
  }

  locallyWith(
    this: FiberRef.WithPatch<Value, Patch>,
    f: (a: Value) => Value
  ): <R, E, B>(effect: Effect<R, E, B>) => Effect<R, E, B> {
    return (effect) => this.getWith((a) => effect.apply(this.locally(f(a))))
  }

  update(
    this: FiberRef.WithPatch<Value, Patch>,
    f: (a: Value) => Value
  ): Effect<never, never, void> {
    return this.modify((v) => Tuple(undefined, f(v)))
  }

  set(
    this: FiberRef.WithPatch<Value, Patch>,
    value: Value
  ): Effect<never, never, void> {
    return this.modify(() => Tuple(undefined, value))
  }

  modifySome<B>(
    this: FiberRef.WithPatch<Value, Patch>,
    def: B,
    f: (a: Value) => Maybe<Tuple<[B, Value]>>
  ): Effect<never, never, B> {
    return this.modify((v) => f(v).getOrElse(Tuple(def, v)))
  }

  updateAndGet(
    this: FiberRef.WithPatch<Value, Patch>,
    f: (a: Value) => Value
  ): Effect<never, never, Value> {
    return this.modify((v) => {
      const result = f(v)
      return Tuple(result, result)
    })
  }

  updateSome(
    this: FiberRef.WithPatch<Value, Patch>,
    pf: (a: Value) => Maybe<Value>
  ): Effect<never, never, void> {
    return this.modify((v) => Tuple(undefined, pf(v).getOrElse(v)))
  }

  /**
   * Atomically modifies the `FiberRef` with the specified partial function.
   * If the function is undefined on the current value it returns the old
   * value without changing it.
   */
  updateSomeAndGet(
    this: FiberRef.WithPatch<Value, Patch>,
    pf: (a: Value) => Maybe<Value>
  ): Effect<never, never, Value> {
    return this.modify((v) => {
      const result = pf(v).getOrElse(v)
      return Tuple(result, result)
    })
  }
}

/**
 * @tsplus static effect/core/io/FiberRef.Ops unsafeMakePatch
 */
export function unsafeMakePatch<Value0, Patch0>(
  initial: Value0,
  differ: Differ<Value0, Patch0>,
  fork0: Patch0,
  join0: (oldV: Value0, newV: Value0) => Value0 = (_, n) => n
): FiberRef.WithPatch<Value0, Patch0> {
  return new FiberRefInternal<Value0, Patch0>(
    initial,
    differ.diff,
    differ.combine,
    (patch) => (old) => differ.patch(patch, old),
    fork0,
    join0
  )
}

/**
 * @tsplus macro remove
 */
export function concreteFiberRef<Value, Patch>(
  _: FiberRef.WithPatch<Value, Patch>
): asserts _ is FiberRefInternal<Value, Patch> {
  //
}

/**
 * Creates a new `FiberRef` with given initial value.
 *
 * @tsplus static effect/core/io/FiberRef.Ops make
 */
export function make<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (left: A, right: A) => A = (_, a) => a
): Effect<Scope, never, FiberRef<A>> {
  return FiberRef.makeWith(
    FiberRef.unsafeMake(initial, fork, join)
  )
}

/**
 * Creates a new `FiberRef` with specified initial value of the environment,
 * using `Service.Env.Patch` to combine updates to the environment in a
 * compositional manner.
 *
 * @tsplus static effect/core/io/FiberRef.Ops makeEnvironment
 */
export function makeEnvironment<A>(
  initial: Service.Env<A>
): Effect<Scope, never, FiberRef.WithPatch<Service.Env<A>, Service.Patch<A, A>>> {
  return FiberRef.makeWith(FiberRef.unsafeMakeEnvironment(initial))
}

/**
 * Creates a new `FiberRef` to hold Set values
 *
 * @tsplus static effect/core/io/FiberRef.Ops unsafeMakeHashSet
 */
export function unsafeMakeHashSet<A>(
  initial: HashSet<A>
) {
  return FiberRef.unsafeMakePatch(
    initial,
    Differ.hashSet(),
    Differ.HashSet.empty()
  )
}

/**
 * Creates a new `FiberRef` with the specified initial value, using the
 * specified patch type to combine updates to the value in a compositional
 * way.
 *
 * @tsplus static effect/core/io/FiberRef.Ops makePatch
 */
export function makePatch<Value0, Patch0>(
  initial: Value0,
  differ: Differ<Value0, Patch0>,
  fork0: Patch0,
  join0: (oldV: Value0, newV: Value0) => Value0 = (_, n) => n
): Effect<Scope, never, FiberRef.WithPatch<Value0, Patch0>> {
  return FiberRef.makeWith(
    FiberRef.unsafeMakePatch(initial, differ, fork0, join0)
  )
}

/**
 * @tsplus static effect/core/io/FiberRef.Ops makeWith
 */
export function makeWith<Value, Patch>(
  ref: FiberRef.WithPatch<Value, Patch>
): Effect<Scope, never, FiberRef.WithPatch<Value, Patch>> {
  return Effect.acquireRelease(
    Effect.sync(ref).tap((ref) => ref.update(identity)),
    (ref) => ref.delete
  )
}

/**
 * @tsplus static effect/core/io/FiberRef.Ops unsafeMake
 */
export function unsafeMake<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (left: A, right: A) => A = (_, a) => a
): FiberRef<A> {
  return FiberRef.unsafeMakePatch(
    initial,
    Differ.update(),
    fork,
    join
  )
}

/**
 * @tsplus static effect/core/io/FiberRef.Ops unsafeMakeEnvironment
 */
export function unsafeMakeEnvironment<A>(
  initial: Service.Env<A>
): FiberRef.WithPatch<Service.Env<A>, Service.Patch<A, A>> {
  return unsafeMakePatch(
    initial,
    Differ.environment(),
    Service.Patch.empty()
  )
}

/**
 * @tsplus static effect/core/io/FiberRef.Ops unsafeMakeSupervisor
 */
export function unsafeMakeSupervisor(
  initial: Supervisor<any>
): FiberRef.WithPatch<Supervisor<any>, Supervisor.Patch> {
  return unsafeMakePatch(
    initial,
    Supervisor.differ,
    Supervisor.emptyPatch
  )
}

//
// Circular with Effect
//

/**
 * A more powerful variant of `addFinalizer` that allows the finalizer to
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus static effect/core/io/Effect.Ops addFinalizerExit
 */
export function addFinalizerExit<R, X>(
  finalizer: (exit: Exit<unknown, unknown>) => Effect<R, never, X>
): Effect<R | Scope, never, void> {
  return Do(($) => {
    const environment = $(Effect.environment<R>())
    const scope = $(Effect.scope)
    return $(scope.addFinalizerExit((exit) => finalizer(exit).provideEnvironment(environment)))
  })
}

/**
 * A more powerful variant of `acquireRelease` that allows the `release`
 * workflow to depend on the `Exit` value specified when the scope is closed.
 *
 * @tsplus static effect/core/io/Effect.Ops acquireReleaseExit
 * @tsplus fluent effect/core/io/Effect acquireReleaseExit
 */
export function acquireReleaseExit<R, E, A, R2, X>(
  acquire: Effect<R, E, A>,
  release: (a: A, exit: Exit<unknown, unknown>) => Effect<R2, never, X>
): Effect<R | R2 | Scope, E, A> {
  return acquire.tap((a) => Effect.addFinalizerExit((exit) => release(a, exit))).uninterruptible
}

/**
 * Constructs a scoped resource from an `acquire` and `release` workflow. If
 * `acquire` successfully completes execution then `release` will be added to
 * the finalizers associated with the scope of this workflow and is guaranteed
 * to be run when the scope is closed.
 *
 * The `acquire` and `release` workflows will be run uninterruptibly.
 *
 * @tsplus static effect/core/io/Effect.Ops acquireRelease
 * @tsplus fluent effect/core/io/Effect acquireRelease
 */
export function acquireRelease<R, E, A, R2, X>(
  acquire: Effect<R, E, A>,
  release: (a: A) => Effect<R2, never, X>
): Effect<R | R2 | Scope, E, A> {
  return Effect.acquireReleaseExit(acquire, (a, _) => release(a))
}

/**
 * Accesses the whole environment of the effect.
 *
 * @tsplus static effect/core/io/Effect.Ops environment
 */
export function environment<R>(): Effect<R, never, Env<R>> {
  return Effect.suspendSucceed(FiberRef.currentEnvironment.get as Effect<never, never, Env<R>>)
}

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentEnvironment
 */
export const currentEnvironment: FiberRef<Env<never>> = FiberRef.unsafeMake(Env.empty)

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentSupervisor
 */
export const currentSupervisor: FiberRef<Supervisor<any>> = FiberRef.unsafeMakeSupervisor(
  Supervisor.none
)

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentScheduler
 */
export const currentScheduler: FiberRef<Scheduler> = FiberRef.unsafeMake(defaultScheduler)

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLogAnnotations
 */
export const currentLogAnnotations: FiberRef<ImmutableMap<string, string>> = FiberRef.unsafeMake(
  ImmutableMap.empty()
)

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLogLevel
 */
export const currentLogLevel: FiberRef<LogLevel> = FiberRef.unsafeMake(LogLevel.Info)

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLogSpan
 */
export const currentLogSpan: FiberRef<List<LogSpan>> = FiberRef.unsafeMake(List.empty<LogSpan>())

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentParallelism
 */
export const currentParallelism: FiberRef<Maybe<number>> = FiberRef.unsafeMake(
  Maybe.empty<number>()
)

/**
 * @tsplus static effect/core/io/FiberRef.Ops forkScopeOverride
 */
export const forkScopeOverride: FiberRef<Maybe<FiberScope>> = FiberRef.unsafeMake(
  Maybe.none,
  () => Maybe.empty<FiberScope>()
)

/**
 * @tsplus static effect/core/io/FiberRef.Ops interruptedCause
 */
export const interruptedCause: FiberRef<Cause<never>> = FiberRef.unsafeMake(
  Cause.empty,
  () => Cause.empty,
  (parent) => parent
)

/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus static effect/core/io/Effect.Aspects provideEnvironment
 * @tsplus pipeable effect/core/io/Effect provideEnvironment
 */
export function provideEnvironment<R>(environment: Env<R>) {
  return <E, A>(self: Effect<R, E, A>): Effect<never, E, A> =>
    (self as Effect<never, E, A>).apply(
      FiberRef.currentEnvironment.locally(environment as Env<never>)
    )
}

/**
 * Returns the current scope.
 *
 * @tsplus static effect/core/io/Effect.Ops scope
 */
export const scope: Effect<Scope, never, Scope> = Effect.service(Scope.Tag)

/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static effect/core/io/Effect.Ops service
 */
export function service<T>(tag: Tag<T>): Effect<T, never, T> {
  return Effect.serviceWithEffect(tag, Effect.succeed)
}

/**
 * Effectfully accesses the specified service in the environment of the
 * effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static effect/core/io/Effect.Ops serviceWithEffect
 */
export function serviceWithEffect<T, R, E, A>(
  tag: Tag<T>,
  f: (a: T) => Effect<R, E, A>
): Effect<R | T, E, A> {
  return Effect.suspendSucceed(
    FiberRef.currentEnvironment.get.flatMap((env) => f(env.unsafeGet(tag)))
  )
}

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLoggers
 */
export const currentLoggers: FiberRef.WithPatch<
  HashSet<Logger<string, any>>,
  Differ.HashSet.Patch<Logger<string, any>>
> = FiberRef.unsafeMakeHashSet(HashSet(defaultLogger))

/**
 * When this effect represents acquisition of a resource (for example, opening
 * a file, launching a thread, etc.), `acquireReleaseWith` can be used to
 * ensure the acquisition is not interrupted and the resource is always
 * released.
 *
 * The function does two things:
 *
 *   1. Ensures this effect, which acquires the resource, will not be
 *      interrupted. Of course, acquisition may fail for internal reasons (an
 *      uncaught exception).
 *   2. Ensures the `release` effect will not be interrupted, and will be
 *      executed so long as this effect successfully
 *      acquires the resource.
 *
 * In between acquisition and release of the resource, the `use` effect is
 * executed.
 *
 * If the `release` effect fails, then the entire effect will fail even if the
 * `use` effect succeeds. If this fail-fast behavior is not desired, errors
 * produced by the `release` effect can be caught and ignored.
 *
 * @tsplus static effect/core/io/Effect.Ops acquireUseRelease
 * @tsplus fluent effect/core/io/Effect acquireUseRelease
 */
export function acquireUseRelease<R, E, A, R2, E2, A2, R3, X>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R2, E2, A2>,
  release: (a: A) => Effect<R3, never, X>
): Effect<R | R2 | R3, E | E2, A2> {
  return Effect.acquireUseReleaseExit(acquire, use, (a, _) => release(a))
}

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` effect
 * succeeds. If `use` fails, then after release, the returned effect will fail
 * with the same error.
 *
 * @tsplus static effect/core/io/Effect.Ops acquireUseReleaseExit
 * @tsplus fluent effect/core/io/Effect acquireUseReleaseExit
 */
export function acquireUseReleaseExit<R, E, A, R2, E2, A2, R3, X>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R2, E2, A2>,
  release: (a: A, exit: Exit<E2, A2>) => Effect<R3, never, X>
): Effect<R | R2 | R3, E | E2, A2> {
  return Effect.uninterruptibleMask(({ restore }) =>
    acquire.flatMap((a) =>
      Effect.suspendSucceed(restore(use(a)))
        .exit
        .flatMap((exit) =>
          Effect.suspendSucceed(release(a, exit)).foldCauseEffect(
            (cause2) =>
              Effect.failCauseSync(
                exit.fold(
                  (cause1) => cause1 + cause2,
                  () => cause2
                )
              ),
            () => exit
          )
        )
    )
  )
}

/**
 * Imports an asynchronous side-effect into an effect. The side-effect has
 * the option of returning the value synchronously, which is useful in cases
 * where it cannot be determined if the effect is synchronous or asynchronous
 * until the side-effect is actually executed. The effect also has the option
 * of returning a canceler, which will be used by the runtime to cancel the
 * asynchronous effect if the fiber executing the effect is interrupted.
 *
 * If the register function returns a value synchronously, then the callback
 * function `Effect<R, E, A> => void` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * @tsplus static effect/core/io/Effect.Ops asyncInterrupt
 */
export function asyncInterrupt<R, E, A>(
  register: (
    callback: (_: Effect<R, E, A>) => void
  ) => Either<Effect<R, never, void>, Effect<R, E, A>>
): Effect<R, E, A> {
  return asyncInterruptBlockingOn(register, FiberId.none)
}

/**
 * Imports an asynchronous side-effect into an effect. The side-effect has
 * the option of returning the value synchronously, which is useful in cases
 * where it cannot be determined if the effect is synchronous or asynchronous
 * until the side-effect is actually executed. The effect also has the option
 * of returning a canceler, which will be used by the runtime to cancel the
 * asynchronous effect if the fiber executing the effect is interrupted.
 *
 * If the register function returns a value synchronously, then the callback
 * function `Effect<R, E, A> => void` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 *
 * @tsplus static effect/core/io/Effect.Ops asyncInterruptBlockingOn
 */
export function asyncInterruptBlockingOn<R, E, A>(
  register: (
    callback: (_: Effect<R, E, A>) => void
  ) => Either<Effect<R, never, void>, Effect<R, E, A>>,
  blockingOn: FiberId
): Effect<R, E, A> {
  return Effect.suspendSucceed(() => {
    let cancelerRef: Effect<R, never, void> = Effect.unit
    return Effect.asyncBlockingOn<R, E, A>(
      (resume) => {
        const result = register(resume)
        if (result.isRight()) {
          resume(result.right)
        } else {
          cancelerRef = result.left
        }
      },
      blockingOn
    ).onInterrupt(() => cancelerRef)
  })
}
