import * as A from "../Array"
// cause
import * as Cause from "../Cause/core"
// effect
import { RuntimeError } from "../Cause/errors"
import { ISucceed } from "../Effect"
// either
import * as E from "../Either"
// exit
import * as Exit from "../Exit/api"
// fiberRef
import { FiberRef } from "../FiberRef/fiberRef"
import * as update from "../FiberRef/update"
import { constVoid } from "../Function"
import * as L from "../List"
// option
import * as O from "../Option"
// supervisor / scope
import * as Scope from "../Scope"
import * as Sup from "../Supervisor"
// support
import { AtomicReference } from "../Support/AtomicReference"
import { RingBuffer } from "../Support/RingBuffer"
import { defaultScheduler } from "../Support/Scheduler"
// xpure / internal effect
import * as X from "../XPure"
import * as T from "./_internal/effect"
// fiber
import * as Fiber from "./core"
import type { Platform } from "./platform"
import type { Callback } from "./state"
import { FiberStateDone, FiberStateExecuting, initial, interrupting } from "./state"
import * as Status from "./status"
import type { TraceElement } from "./tracing"
import { SourceLocation, Trace, traceLocation, truncatedParentTrace } from "./tracing"

export type FiberRefLocals = Map<FiberRef<any>, any>

export class Stack<A> {
  constructor(readonly value: A, readonly previous?: Stack<A>) {}
}

export class InterruptExit {
  readonly _tag = "InterruptExit"
  constructor(readonly apply: (a: any) => T.Effect<any, any, any>) {}
}

export class TracingExit {
  readonly _tag = "TracingExit"
  constructor(readonly apply: (a: any) => T.Effect<any, any, any>) {}
}

export class HandlerFrame {
  readonly _tag = "HandlerFrame"
  constructor(readonly apply: (a: any) => T.Effect<any, any, any>) {}
}

export class ApplyFrame {
  readonly _tag = "ApplyFrame"
  constructor(readonly apply: (a: any) => T.Effect<any, any, any>) {}
}

export type Frame =
  | InterruptExit
  | TracingExit
  | T.IFold<any, any, any, any, any, any, any, any, any>
  | HandlerFrame
  | ApplyFrame

export class TracingContext {
  readonly running = new Set<FiberContext<any, any>>()
  readonly interval = new AtomicReference<NodeJS.Timeout | undefined>(undefined)

  readonly trace = (fiber: FiberContext<any, any>) => {
    if (!this.running.has(fiber)) {
      if (typeof this.interval.get === "undefined") {
        this.interval.set(
          setInterval(() => {
            // this keeps the process alive if there is something running
          }, 60000)
        )
      }

      this.running.add(fiber)

      fiber.onDone(() => {
        this.running.delete(fiber)

        if (this.running.size === 0) {
          const ci = this.interval.get

          if (ci) {
            clearInterval(ci)
          }
        }
      })
    }
  }
}

export const _tracing = new TracingContext()

export const currentFiber = new AtomicReference<FiberContext<any, any> | null>(null)

export const unsafeCurrentFiber = () => O.fromNullable(currentFiber.get)

const noop = O.some(constVoid)

export class FiberContext<E, A> implements Fiber.Runtime<E, A> {
  readonly _tag = "RuntimeFiber"
  readonly state = new AtomicReference(initial<E, A>())
  readonly scheduler = defaultScheduler

  asyncEpoch = 0 | 0
  stack?: Stack<Frame> = undefined
  environments?: Stack<any> = new Stack(this.startEnv)
  interruptStatus?: Stack<boolean> = new Stack(this.startIStatus.toBoolean)
  supervisors: Stack<Sup.Supervisor<any>> = new Stack(this.supervisor0)
  forkScopeOverride?: Stack<O.Option<Scope.Scope<Exit.Exit<any, any>>>> = undefined
  scopeKey: Scope.Key | undefined = undefined
  executionTraces = new RingBuffer<TraceElement>(this.platform.executionTraceLength)
  stackTraces = new RingBuffer<TraceElement>(this.platform.stackTraceLength)
  traceStatusStack: Stack<boolean> | undefined = new Stack(true)
  traceStatusEnabled = this.platform.traceExecution || this.platform.traceStack

  constructor(
    readonly fiberId: Fiber.FiberID,
    readonly startEnv: any,
    readonly startIStatus: Fiber.InterruptStatus,
    readonly fiberRefLocals: FiberRefLocals,
    readonly supervisor0: Sup.Supervisor<any>,
    readonly openScope: Scope.Open<Exit.Exit<E, A>>,
    readonly maxOp: number,
    readonly reportFailure: (e: Cause.Cause<E>) => void,
    readonly platform: Platform,
    readonly parentTrace: O.Option<Trace>
  ) {
    _tracing.trace(this)
  }

  get poll() {
    return T.effectTotal(() => this.poll0())
  }

  addTrace(f: Function) {
    if (this.inTracingRegion && "$trace" in f) {
      this.executionTraces.push(new SourceLocation(f["$trace"]))
    }
  }

  addTraceValue(trace: string | undefined | TraceElement) {
    if (this.inTracingRegion && trace) {
      this.executionTraces.push(
        typeof trace === "string" ? new SourceLocation(trace) : trace
      )
    }
  }

  getRef<K>(fiberRef: FiberRef<K>): T.UIO<K> {
    return T.effectTotal(() => this.fiberRefLocals.get(fiberRef) || fiberRef.initial)
  }

  poll0() {
    const state = this.state.get

    switch (state._tag) {
      case "Executing": {
        return O.none
      }
      case "Done": {
        return O.some(state.value)
      }
    }
  }

  interruptExit = new InterruptExit((v: any) => {
    if (this.isInterruptible) {
      this.popInterruptStatus()
      return T.succeed(v)[T._I]
    } else {
      return T.effectTotal(() => {
        this.popInterruptStatus()
        return v
      })[T._I]
    }
  })

  popTracingStatus() {
    this.traceStatusStack = this.traceStatusStack?.previous
  }

  pushTracingStatus(flag: boolean) {
    this.traceStatusStack = new Stack(flag, this.traceStatusStack)
  }

  tracingExit = new TracingExit((v: any) => {
    this.popTracingStatus()
    return new ISucceed(v)
  })

  get isInterruptible() {
    return this.interruptStatus ? this.interruptStatus.value : true
  }

  get isInterrupted() {
    return !Cause.isEmpty(this.state.get.interrupted)
  }

  get isInterrupting() {
    return interrupting(this.state.get)
  }

  get shouldInterrupt() {
    return this.isInterrupted && this.isInterruptible && !this.isInterrupting
  }

  get isStackEmpty() {
    return !this.stack
  }

  get id() {
    return this.fiberId
  }

  pushContinuation(k: Frame) {
    if (this.platform.traceStack && this.inTracingRegion) {
      this.stackTraces.push(traceLocation(k.apply))
    }
    this.stack = new Stack(k, this.stack)
  }

  popStackTrace() {
    this.stackTraces.pop()
  }

  popContinuation() {
    const current = this.stack?.value
    this.stack = this.stack?.previous
    return current
  }

  pushEnv(k: any) {
    this.environments = new Stack(k, this.environments)
  }

  popEnv() {
    const current = this.environments?.value
    this.environments = this.environments?.previous
    return current
  }

  pushInterruptStatus(flag: boolean) {
    this.interruptStatus = new Stack(flag, this.interruptStatus)
  }

  popInterruptStatus() {
    const current = this.interruptStatus?.value
    this.interruptStatus = this.interruptStatus?.previous
    return current
  }

  runAsync(k: Callback<E, A>) {
    const v = this.register0((xx) => k(Exit.flatten(xx)))

    if (v) {
      k(v)
    }
  }

  /**
   * Unwinds the stack, looking for the first error handler, and exiting
   * interruptible / uninterruptible regions.
   */
  unwindStack() {
    let unwinding = true
    let discardedFolds = false

    // Unwind the stack, looking for an error handler:
    while (unwinding && !this.isStackEmpty) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const frame = this.popContinuation()!

      switch (frame._tag) {
        case "InterruptExit": {
          this.popInterruptStatus()
          break
        }
        case "TracingExit": {
          this.popTracingStatus()
          break
        }
        case "Fold": {
          if (!this.shouldInterrupt) {
            // Push error handler back onto the stack and halt iteration:
            if (this.platform.traceStack && this.inTracingRegion) {
              this.popStackTrace()
            }
            this.pushContinuation(new HandlerFrame(frame.failure))
            unwinding = false
          } else {
            if (this.platform.traceStack && this.inTracingRegion) {
              this.popStackTrace()
            }
            discardedFolds = true
          }
          break
        }
        default: {
          if (this.platform.traceStack && this.inTracingRegion) {
            this.popStackTrace()
          }
        }
      }
    }

    return discardedFolds
  }

  register0(k: Callback<never, Exit.Exit<E, A>>): Exit.Exit<E, A> | null {
    const oldState = this.state.get

    switch (oldState._tag) {
      case "Done": {
        return oldState.value
      }
      case "Executing": {
        const observers = [k, ...oldState.observers]

        this.state.set(
          new FiberStateExecuting(oldState.status, observers, oldState.interrupted)
        )

        return null
      }
    }
  }

  nextInstr(value: any): T.Instruction | undefined {
    if (!this.isStackEmpty) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const k = this.popContinuation()!

      if (this.inTracingRegion && this.platform.traceExecution) {
        this.addTrace(k.apply)
      }
      if (
        this.platform.traceStack &&
        k._tag !== "InterruptExit" &&
        k._tag !== "TracingExit"
      ) {
        this.popStackTrace()
      }

      return k.apply(value)[T._I]
    } else {
      return this.done(Exit.succeed(value))?.[T._I]
    }
  }

  notifyObservers(v: Exit.Exit<E, A>, observers: Callback<never, Exit.Exit<E, A>>[]) {
    const result = Exit.succeed(v)
    observers.forEach((k) => k(result))
  }

  observe0(k: Callback<never, Exit.Exit<E, A>>): O.Option<T.UIO<Exit.Exit<E, A>>> {
    const x = this.register0(k)

    if (x != null) {
      return O.some(T.succeed(x))
    }

    return O.none
  }

  get await(): T.UIO<Exit.Exit<E, A>> {
    return T.effectMaybeAsyncInterrupt(
      (k): E.Either<T.UIO<void>, T.UIO<Exit.Exit<E, A>>> => {
        const cb: Callback<never, Exit.Exit<E, A>> = (x) => k(T.done(x))
        return O.fold_(
          this.observe0(cb),
          () => E.left(T.effectTotal(() => this.interruptObserver(cb))),
          E.right
        )
      }
    )
  }

  interruptObserver(k: Callback<never, Exit.Exit<E, A>>) {
    const oldState = this.state.get

    if (oldState._tag === "Executing") {
      const observers = oldState.observers.filter((o) => o !== k)

      this.state.set(
        new FiberStateExecuting(oldState.status, observers, oldState.interrupted)
      )
    }
  }

  kill0(fiberId: Fiber.FiberID): T.UIO<Exit.Exit<E, A>> {
    const interruptedCause = Cause.interrupt(fiberId)

    const setInterruptedLoop = (): Cause.Cause<never> => {
      const oldState = this.state.get

      switch (oldState._tag) {
        case "Executing": {
          if (
            oldState.status._tag === "Suspended" &&
            oldState.status.interruptible &&
            !interrupting(oldState)
          ) {
            const newCause = Cause.then(oldState.interrupted, interruptedCause)

            this.state.set(
              new FiberStateExecuting(
                Status.withInterrupting(true)(oldState.status),
                oldState.observers,
                newCause
              )
            )

            this.evaluateLater(T.interruptAs(this.fiberId)[T._I])

            return newCause
          } else {
            const newCause = Cause.then(oldState.interrupted, interruptedCause)

            this.state.set(
              new FiberStateExecuting(oldState.status, oldState.observers, newCause)
            )

            return newCause
          }
        }
        case "Done": {
          return interruptedCause
        }
      }
    }

    return T.suspend(() => {
      setInterruptedLoop()

      return this.await
    })
  }

  interruptAs(fiberId: Fiber.FiberID): T.UIO<Exit.Exit<E, A>> {
    return this.kill0(fiberId)
  }

  done(v: Exit.Exit<E, A>): T.Instruction | undefined {
    const oldState = this.state.get

    switch (oldState._tag) {
      case "Done": {
        // Already done
        return undefined
      }
      case "Executing": {
        if (this.openScope.scope.unsafeClosed) {
          /*
           * We are truly "done" because all the children of this fiber have terminated,
           * and there are no more pending effects that we have to execute on the fiber.
           */
          this.state.set(new FiberStateDone(v))
          this.reportUnhandled(v)
          this.notifyObservers(v, oldState.observers)

          return undefined
        } else {
          /*
           * We are not done yet, because there are children to interrupt, or
           * because there are effects to execute on the fiber.
           */
          this.state.set(
            new FiberStateExecuting(
              Status.toFinishing(oldState.status),
              oldState.observers,
              oldState.interrupted
            )
          )

          this.setInterrupting(true)

          return T.chain_(this.openScope.close(v), () => T.done(v))[T._I]
        }
      }
    }
  }

  reportUnhandled(exit: Exit.Exit<E, A>) {
    if (exit._tag === "Failure") {
      this.reportFailure(exit.cause)
    }
  }

  setInterrupting(value: boolean): void {
    const oldState = this.state.get

    switch (oldState._tag) {
      case "Executing": {
        this.state.set(
          new FiberStateExecuting(
            Status.withInterrupting(value)(oldState.status),
            oldState.observers,
            oldState.interrupted
          )
        )
        return
      }
      case "Done": {
        return
      }
    }
  }

  enterAsync(
    epoch: number,
    blockingOn: readonly Fiber.FiberID[]
  ): T.Instruction | undefined {
    const oldState = this.state.get

    switch (oldState._tag) {
      case "Done": {
        throw new RuntimeError(`Unexpected fiber completion ${this.fiberId}`)
      }
      case "Executing": {
        const newState = new FiberStateExecuting(
          new Status.Suspended(
            oldState.status,
            this.isInterruptible,
            epoch,
            blockingOn
          ),
          oldState.observers,
          oldState.interrupted
        )

        this.state.set(newState)

        if (this.shouldInterrupt) {
          // Fiber interrupted, so go back into running state:
          this.exitAsync(epoch)
          return T.halt(this.state.get.interrupted)[T._I]
        } else {
          return undefined
        }
      }
    }
  }

  exitAsync(epoch: number): boolean {
    const oldState = this.state.get

    switch (oldState._tag) {
      case "Done": {
        return false
      }
      case "Executing": {
        if (oldState.status._tag === "Suspended" && epoch === oldState.status.epoch) {
          this.state.set(
            new FiberStateExecuting(
              oldState.status.previous,
              oldState.observers,
              oldState.interrupted
            )
          )
          return true
        } else {
          return false
        }
      }
    }
  }

  resumeAsync(epoch: number) {
    return (_: T.Effect<any, any, any>) => {
      if (this.exitAsync(epoch)) {
        this.evaluateLater(_[T._I])
      }
    }
  }

  evaluateLater(i0: T.Instruction) {
    this.scheduler.dispatchLater(() => {
      this.evaluateNow(i0)
    })
  }

  get scope(): Scope.Scope<Exit.Exit<E, A>> {
    return this.openScope.scope
  }

  get status(): T.UIO<Status.Status> {
    return T.succeed(this.state.get.status)
  }

  fork(
    i0: T.Instruction,
    forkScope: O.Option<Scope.Scope<Exit.Exit<any, any>>>,
    reportFailure: O.Option<(e: Cause.Cause<E>) => void>
  ): FiberContext<any, any> {
    const childFiberRefLocals: FiberRefLocals = new Map()

    this.fiberRefLocals.forEach((v, k) => {
      childFiberRefLocals.set(k, k.fork(v))
    })

    const parentScope: Scope.Scope<Exit.Exit<any, any>> = O.getOrElse_(
      forkScope._tag === "Some" ? forkScope : this.forkScopeOverride?.value || O.none,
      () => this.scope
    )

    const currentEnv = this.environments?.value || {}
    const currentSup = this.supervisors.value
    const childId = Fiber.newFiberId()
    const childScope = Scope.unsafeMakeScope<Exit.Exit<E, A>>()
    const ancestry =
      this.inTracingRegion && (this.platform.traceExecution || this.platform.traceStack)
        ? O.some(this.cutAncestryTrace(this.captureTrace(undefined)))
        : O.none

    const childContext = new FiberContext(
      childId,
      currentEnv,
      Fiber.interruptStatus(this.isInterruptible),
      childFiberRefLocals,
      currentSup,
      childScope,
      this.maxOp,
      O.getOrElse_(reportFailure, () => this.reportFailure),
      this.platform,
      ancestry
    )

    if (currentSup !== Sup.none) {
      currentSup.unsafeOnStart(currentEnv, i0, O.some(this), childContext)
      childContext.onDone((exit) => {
        currentSup.unsafeOnEnd(Exit.flatten(exit), childContext)
      })
    }

    const toExecute = this.parentScopeOp(parentScope, childContext, i0)

    this.scheduler.dispatchLater(() => {
      childContext.evaluateNow(toExecute)
    })

    return childContext
  }

  private parentScopeOp(
    parentScope: Scope.Scope<Exit.Exit<any, any>>,
    childContext: FiberContext<E, A>,
    i0: T.Instruction
  ): T.Instruction {
    if (parentScope !== Scope.globalScope) {
      const exitOrKey = parentScope.unsafeEnsure((exit) =>
        T.suspend(
          (): T.UIO<any> => {
            const _interruptors =
              exit._tag === "Failure"
                ? Cause.interruptors(exit.cause)
                : new Set<Fiber.FiberID>()

            const head = _interruptors.values().next()

            if (head.done) {
              return childContext.interruptAs(this.fiberId)
            } else {
              return childContext.interruptAs(head.value)
            }
          }
        )
      )

      return E.fold_(
        exitOrKey,
        (exit) => {
          switch (exit._tag) {
            case "Failure": {
              return T.interruptAs(
                O.getOrElse_(
                  A.head(Array.from(Cause.interruptors(exit.cause))),
                  () => this.fiberId
                )
              )[T._I]
            }
            case "Success": {
              return T.interruptAs(this.fiberId)[T._I]
            }
          }
        },
        (key) => {
          childContext.scopeKey = key
          // Remove the finalizer key from the parent scope when the child fiber
          // terminates:
          childContext.onDone(() => {
            parentScope.unsafeDeny(key)
          })

          return i0
        }
      )
    } else {
      return i0
    }
  }

  onDone(k: Callback<never, Exit.Exit<E, A>>): void {
    const oldState = this.state.get

    switch (oldState._tag) {
      case "Done": {
        k(Exit.succeed(oldState.value))
        return
      }
      case "Executing": {
        this.state.set(
          new FiberStateExecuting(
            oldState.status,
            [k, ...oldState.observers],
            oldState.interrupted
          )
        )
      }
    }
  }

  getDescriptor() {
    return new Fiber.Descriptor(
      this.fiberId,
      this.state.get.status,
      Cause.interruptors(this.state.get.interrupted),
      Fiber.interruptStatus(this.isInterruptible),
      this.scope
    )
  }

  complete<R, R1, R2, E2, A2, R3, E3, A3>(
    winner: Fiber.Fiber<any, any>,
    loser: Fiber.Fiber<any, any>,
    cont: (
      exit: Exit.Exit<any, any>,
      fiber: Fiber.Fiber<any, any>
    ) => T.Effect<any, any, any>,
    winnerExit: Exit.Exit<any, any>,
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
          cb(T.chain(() => cont(winnerExit, loser))(winner.inheritRefs))
          break
        }
      }
    }
  }

  get inheritRefs() {
    return T.suspend(() => {
      const locals = this.fiberRefLocals
      if (locals.size === 0) {
        return T.unit
      } else {
        return T.foreachUnit_(locals, ([fiberRef, value]) =>
          update.update((old) => fiberRef.join(old, value))(fiberRef)
        )
      }
    })
  }

  get inTracingRegion() {
    return (
      this.traceStatusEnabled &&
      (this.traceStatusStack
        ? this.traceStatusStack.value
        : this.platform.initialTracingStatus)
    )
  }

  raceWithImpl<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    race: T.IRaceWith<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>
  ): T.Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
    const raceIndicator = new AtomicReference(true)
    const left = this.fork(race.left[T._I], race.scope, noop)
    const right = this.fork(race.right[T._I], race.scope, noop)

    return T.effectAsync<R & R1 & R2 & R3, E2 | E3, A2 | A3>(
      (cb) => {
        const leftRegister = left.register0((exit) => {
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
          const rightRegister = right.register0((exit) => {
            switch (exit._tag) {
              case "Failure": {
                this.complete(right, left, race.rightWins, exit, raceIndicator, cb)
                break
              }
              case "Success": {
                this.complete(
                  right,
                  left,
                  race.rightWins,
                  exit.value,
                  raceIndicator,
                  cb
                )
                break
              }
            }
          })

          if (rightRegister != null) {
            this.complete(right, left, race.rightWins, rightRegister, raceIndicator, cb)
          }
        }
      },
      [left.fiberId, right.fiberId]
    )
  }

  captureTrace(last: TraceElement | undefined): Trace {
    const exec = this.executionTraces.listReverse
    const stack_ = this.stackTraces.listReverse
    const stack = last ? L.prepend_(stack_, last) : stack_
    return new Trace(this.id, exec, stack, this.parentTrace)
  }

  cutAncestryTrace(trace: Trace): Trace {
    const maxExecLength = this.platform.ancestorExecutionTraceLength
    const maxStackLength = this.platform.ancestorStackTraceLength
    const maxAncestors = this.platform.ancestryLength - 1

    const truncated = truncatedParentTrace(trace, maxAncestors)

    return new Trace(
      trace.fiberId,
      L.take_(trace.executionTrace, maxExecLength),
      L.take_(trace.stackTrace, maxStackLength),
      truncated
    )
  }

  fastPathTrace(
    k: any,
    effect: any,
    fastPathFlatMapContinuationTrace: AtomicReference<TraceElement | undefined>
  ): TraceElement | undefined {
    if (this.inTracingRegion) {
      const kTrace = traceLocation(k)

      if (this.platform.traceEffects) {
        this.addTrace(effect)
      }
      if (this.platform.traceStack) {
        fastPathFlatMapContinuationTrace.set(kTrace)
      }
      return kTrace
    }
    return undefined
  }

  evaluateNow(i0: T.Instruction): void {
    try {
      // eslint-disable-next-line prefer-const
      let current: T.Instruction | undefined = i0

      const fastPathFlatMapContinuationTrace = new AtomicReference<
        TraceElement | undefined
      >(undefined)

      currentFiber.set(this)

      while (current != null) {
        try {
          let opCount = 0

          while (current != null) {
            // Check to see if the fiber should continue executing or not:
            if (!this.shouldInterrupt) {
              // Fiber does not need to be interrupted, but might need to yield:
              if (opCount === this.maxOp) {
                this.evaluateLater(current)
                current = undefined
              } else {
                // Fiber is neither being interrupted nor needs to yield. Execute
                // the next instruction in the program:
                switch (current._tag) {
                  case "FlatMap": {
                    const nested: T.Instruction = current.val[T._I]
                    const c = current
                    const k: (a: any) => T.Effect<any, any, any> = c.f

                    switch (nested._tag) {
                      case "Succeed": {
                        if (this.platform.traceEffects && this.inTracingRegion) {
                          this.addTraceValue(nested.trace)
                        }
                        if (this.platform.traceExecution && this.inTracingRegion) {
                          this.addTrace(k)
                        }
                        current = k(nested.val)[T._I]
                        break
                      }
                      case "EffectTotal": {
                        const kTrace = this.fastPathTrace(
                          k,
                          nested.effect,
                          fastPathFlatMapContinuationTrace
                        )
                        if (this.platform.traceExecution && this.inTracingRegion) {
                          this.addTraceValue(kTrace)
                        }
                        if (this.platform.traceStack && kTrace != null) {
                          fastPathFlatMapContinuationTrace.set(undefined)
                        }
                        current = k(nested.effect())[T._I]
                        break
                      }
                      case "EffectPartial": {
                        const kTrace = this.fastPathTrace(
                          k,
                          nested.effect,
                          fastPathFlatMapContinuationTrace
                        )
                        try {
                          if (this.platform.traceStack && kTrace != null) {
                            fastPathFlatMapContinuationTrace.set(undefined)
                          }
                          if (
                            this.platform.traceExecution &&
                            this.inTracingRegion &&
                            kTrace != null
                          ) {
                            this.addTraceValue(kTrace)
                          }
                          current = k(nested.effect())[T._I]
                        } catch (e) {
                          if (this.platform.traceExecution && this.inTracingRegion) {
                            this.addTrace(nested.onThrow)
                          }
                          current = T.fail(nested.onThrow(e))[T._I]
                        }
                        break
                      }
                      default: {
                        current = nested
                        this.pushContinuation(new ApplyFrame(k))
                      }
                    }
                    break
                  }

                  case "XPure": {
                    const res: E.Either<any, any> = X.runEither(
                      X.provideAll(this.environments?.value || {})(current)
                    )

                    if (res._tag === "Left") {
                      current = T.fail(res.left)[T._I]
                    } else {
                      current = this.nextInstr(res.right)
                    }

                    break
                  }

                  case "TracingStatus": {
                    if (this.inTracingRegion) {
                      this.pushTracingStatus(current.flag)
                      this.stack = new Stack(this.tracingExit, this.stack)
                    }
                    current = current.effect[T._I]
                    break
                  }

                  case "CheckTracingStatus": {
                    current = current.f(this.inTracingRegion)[T._I]
                    break
                  }

                  case "Trace": {
                    current = this.nextInstr(this.captureTrace(undefined))
                    break
                  }

                  case "FFI": {
                    current = current[T._I]

                    break
                  }

                  case "Succeed": {
                    if (this.platform.traceEffects && this.inTracingRegion) {
                      this.addTraceValue(current.trace)
                    }
                    current = this.nextInstr(current.val)
                    break
                  }

                  case "EffectTotal": {
                    if (this.platform.traceEffects) {
                      this.addTrace(current.effect)
                    }
                    current = this.nextInstr(current.effect())
                    break
                  }

                  case "Fail": {
                    if (this.platform.traceEffects && this.inTracingRegion) {
                      this.addTrace(current.fill)
                    }

                    const fast = fastPathFlatMapContinuationTrace.get
                    fastPathFlatMapContinuationTrace.set(undefined)
                    const fullCause = current.fill(() => this.captureTrace(fast))

                    const discardedFolds = this.unwindStack()

                    const maybeRedactedCause = discardedFolds
                      ? // We threw away some error handlers while unwinding the stack because
                        // we got interrupted during this instruction. So it's not safe to return
                        // typed failures from cause0, because they might not be typed correctly.
                        // Instead, we strip the typed failures, and return the remainders and
                        // the interruption.
                        Cause.stripFailures(fullCause)
                      : fullCause

                    if (this.isStackEmpty) {
                      // Error not caught, stack is empty:
                      const cause = () => {
                        const interrupted = this.state.get.interrupted
                        const causeAndInterrupt = Cause.contains(interrupted)(
                          maybeRedactedCause
                        )
                          ? maybeRedactedCause
                          : Cause.then(maybeRedactedCause, interrupted)

                        return causeAndInterrupt
                      }

                      this.setInterrupting(true)

                      current = this.done(Exit.halt(cause()))
                    } else {
                      this.setInterrupting(false)

                      // Error caught, next continuation on the stack will deal
                      // with it, so we just have to compute it here:
                      current = this.nextInstr(maybeRedactedCause)
                    }

                    break
                  }

                  case "Fold": {
                    this.pushContinuation(current)
                    current = current.value[T._I]
                    break
                  }

                  case "InterruptStatus": {
                    this.pushInterruptStatus(current.flag.toBoolean)
                    this.pushContinuation(this.interruptExit)
                    current = current.effect[T._I]
                    break
                  }

                  case "CheckInterrupt": {
                    current = current.f(Fiber.interruptStatus(this.isInterruptible))[
                      T._I
                    ]
                    break
                  }

                  case "EffectPartial": {
                    const c = current
                    try {
                      if (this.inTracingRegion && this.platform.traceEffects) {
                        this.addTrace(c.effect)
                      }
                      current = this.nextInstr(c.effect())
                    } catch (e) {
                      if (this.inTracingRegion && this.platform.traceEffects) {
                        this.addTrace(c.onThrow)
                      }
                      current = T.fail(c.onThrow(e))[T._I]
                    }
                    break
                  }

                  case "EffectAsync": {
                    const epoch = this.asyncEpoch
                    this.asyncEpoch = epoch + 1
                    const c = current
                    current = this.enterAsync(epoch, c.blockingOn)

                    if (!current) {
                      const k = c.register
                      if (this.platform.traceEffects && this.inTracingRegion) {
                        this.addTrace(k)
                      }
                      const h = k(this.resumeAsync(epoch))

                      switch (h._tag) {
                        case "None": {
                          current = undefined
                          break
                        }
                        case "Some": {
                          if (this.exitAsync(epoch)) {
                            current = h.value[T._I]
                          } else {
                            current = undefined
                          }
                        }
                      }
                    }

                    break
                  }

                  case "Fork": {
                    current = this.nextInstr(
                      this.fork(
                        current.value[T._I],
                        current.scope,
                        current.reportFailure
                      )
                    )
                    break
                  }

                  case "Descriptor": {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f)
                    }
                    current = current.f(this.getDescriptor())[T._I]
                    break
                  }

                  case "Yield": {
                    current = undefined
                    this.evaluateLater(T.unit[T._I])
                    break
                  }

                  case "Read": {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f)
                    }
                    current = current.f(this.environments?.value || {})[T._I]
                    break
                  }

                  case "Provide": {
                    const c = current
                    current = T.bracket_(
                      T.effectTotal(() => {
                        this.pushEnv(c.r)
                      }),
                      () => c.next,
                      () =>
                        T.effectTotal(() => {
                          this.popEnv()
                        })
                    )[T._I]
                    break
                  }

                  case "Suspend": {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.factory)
                    }
                    current = current.factory()[T._I]
                    break
                  }

                  case "SuspendPartial": {
                    const c = current

                    try {
                      if (this.platform.traceExecution && this.inTracingRegion) {
                        this.addTrace(current.factory)
                      }
                      current = c.factory()[T._I]
                    } catch (e) {
                      if (this.platform.traceExecution && this.inTracingRegion) {
                        this.addTrace(c.onThrow)
                      }
                      current = T.fail(c.onThrow(e))[T._I]
                    }

                    break
                  }

                  case "FiberRefNew": {
                    const fiberRef = new FiberRef(
                      current.initial,
                      current.onFork,
                      current.onJoin
                    )

                    this.fiberRefLocals.set(fiberRef, current.initial)

                    current = this.nextInstr(fiberRef)

                    break
                  }

                  case "FiberRefModify": {
                    const c = current
                    const oldValue = O.fromNullable(this.fiberRefLocals.get(c.fiberRef))
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f)
                    }
                    const [result, newValue] = current.f(
                      O.getOrElse_(oldValue, () => c.fiberRef.initial)
                    )
                    this.fiberRefLocals.set(c.fiberRef, newValue)
                    current = this.nextInstr(result)
                    break
                  }

                  case "RaceWith": {
                    current = this.raceWithImpl(current)[T._I]
                    break
                  }

                  case "Supervise": {
                    const c = current
                    const lastSupervisor = this.supervisors.value
                    const newSupervisor = c.supervisor.and(lastSupervisor)
                    const push = T.effectTotal(() => {
                      this.supervisors = new Stack(newSupervisor, this.supervisors)
                    })
                    const pop = T.effectTotal(() => {
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      this.supervisors = this.supervisors.previous!
                    })
                    current = T.bracket_(
                      push,
                      () => c.effect,
                      () => pop
                    )[T._I]
                    break
                  }

                  case "GetForkScope": {
                    const c = current
                    current = c.f(
                      O.getOrElse_(
                        this.forkScopeOverride?.value || O.none,
                        () => this.scope
                      )
                    )[T._I]
                    break
                  }

                  case "OverrideForkScope": {
                    const c = current

                    const push = T.effectTotal(() => {
                      this.forkScopeOverride = new Stack(
                        c.forkScope,
                        this.forkScopeOverride
                      )
                    })

                    const pop = T.effectTotal(() => {
                      this.forkScopeOverride = this.forkScopeOverride?.previous
                    })

                    current = T.bracket_(
                      push,
                      () => c.effect,
                      () => pop
                    )[T._I]

                    break
                  }
                }
              }
            } else {
              current = T.halt(this.state.get.interrupted)[T._I]
              this.setInterrupting(true)
            }

            opCount += 1
          }
        } catch (e) {
          this.setInterrupting(true)
          current = T.die(e)[T._I]
        }
      }
    } finally {
      currentFiber.set(null)
    }
  }
}
