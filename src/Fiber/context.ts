import * as A from "../Array"
// cause
import * as Cause from "../Cause/core"
// effect
import { RuntimeError } from "../Cause/errors"
import * as bracket from "../Effect/bracket_"
import * as chain from "../Effect/core"
import * as chain_ from "../Effect/core"
import * as effectAsync from "../Effect/core"
import * as effectAsyncOption from "../Effect/core"
import * as effectTotal from "../Effect/core"
import * as halt from "../Effect/core"
import * as succeedNow from "../Effect/core"
import * as suspend from "../Effect/core"
import * as unit from "../Effect/core"
import * as die from "../Effect/die"
import * as done from "../Effect/done"
import { Async, Effect, Sync, _I } from "../Effect/effect"
import * as fail from "../Effect/fail"
import * as foreachUnit_ from "../Effect/foreachUnit_"
import * as interruptAs from "../Effect/interruptAs"
import { IFold, Instruction, IRaceWith } from "../Effect/primitives"
import * as E from "../Either"
// exit
import * as Exit from "../Exit/api"
// fiberRef
import { FiberRef } from "../FiberRef/fiberRef"
import * as update from "../FiberRef/update"
import * as O from "../Option"
// supervisor
import * as Scope from "../Scope"
import * as Sup from "../Supervisor"
// support
import { AtomicReference } from "../Support/AtomicReference"
import { defaultScheduler } from "../Support/Scheduler"

// fiber
import * as Fiber from "./core"
import {
  Callback,
  FiberRefLocals,
  FiberStateDone,
  FiberStateExecuting,
  initial,
  interrupting
} from "./state"
import * as Status from "./status"

// support

export class Stack<A> {
  constructor(readonly value: A, readonly previous?: Stack<A>) {}
}

export class InterruptExit {
  readonly _tag = "InterruptExit"
  constructor(readonly apply: (a: any) => Effect<any, any, any, any>) {}
}

export class HandlerFrame {
  readonly _tag = "HandlerFrame"
  constructor(readonly apply: (a: any) => Effect<any, any, any, any>) {}
}

export class ApplyFrame {
  readonly _tag = "ApplyFrame"
  constructor(readonly apply: (a: any) => Effect<any, any, any, any>) {}
}

export type Frame =
  | InterruptExit
  | IFold<any, any, any, any, any, any, any, any, any, any, any, any>
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

  constructor(
    readonly fiberId: Fiber.FiberID,
    readonly startEnv: any,
    readonly startIStatus: Fiber.InterruptStatus,
    readonly fiberRefLocals: FiberRefLocals,
    readonly supervisor0: Sup.Supervisor<any>,
    readonly openScope: Scope.Open<Exit.Exit<E, A>>
  ) {
    _tracing.trace(this)
  }

  get poll() {
    return effectTotal.effectTotal(() => this.poll0())
  }

  getRef<K>(fiberRef: FiberRef<K>): Sync<K> {
    return effectTotal.effectTotal(
      () => this.fiberRefLocals.get(fiberRef) || fiberRef.initial
    )
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
      return succeedNow.succeed(v)[_I]
    } else {
      return effectTotal.effectTotal(() => {
        this.popInterruptStatus()
        return v
      })[_I]
    }
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
    this.stack = new Stack(k, this.stack)
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
        case "Fold": {
          if (!this.shouldInterrupt) {
            // Push error handler back onto the stack and halt iteration:
            this.pushContinuation(new HandlerFrame(frame.failure))
            unwinding = false
          } else {
            discardedFolds = true
          }
          break
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

  nextInstr(value: any): Instruction | undefined {
    if (!this.isStackEmpty) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const k = this.popContinuation()!

      return k.apply(value)[_I]
    } else {
      return this.done(Exit.succeed(value))?.[_I]
    }
  }

  notifyObservers(v: Exit.Exit<E, A>, observers: Callback<never, Exit.Exit<E, A>>[]) {
    const result = Exit.succeed(v)

    observers.forEach((k) => k(result))
  }

  observe0(k: Callback<never, Exit.Exit<E, A>>): O.Option<Sync<Exit.Exit<E, A>>> {
    const x = this.register0(k)

    if (x != null) {
      return O.some(succeedNow.succeed(x))
    }

    return O.none
  }

  get wait(): Async<Exit.Exit<E, A>> {
    return effectAsyncOption.effectAsyncOption(
      (k) => this.observe0((x) => k(done.done(x))),
      [this.fiberId]
    )
  }

  kill0(fiberId: Fiber.FiberID): Async<Exit.Exit<E, A>> {
    const interruptedCause = Cause.Interrupt(fiberId)

    const setInterruptedLoop = (): Cause.Cause<never> => {
      const oldState = this.state.get

      switch (oldState._tag) {
        case "Executing": {
          if (oldState.status._tag === "Suspended" && oldState.status.interruptible) {
            const newCause = Cause.Then(oldState.interrupted, interruptedCause)

            this.state.set(
              new FiberStateExecuting(
                Status.withInterrupting(true)(oldState.status),
                oldState.observers,
                newCause
              )
            )

            this.evaluateLater(interruptAs.interruptAs(this.fiberId)[_I])

            return newCause
          } else {
            const newCause = Cause.Then(oldState.interrupted, interruptedCause)

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

    return suspend.suspend(() => {
      setInterruptedLoop()

      return this.wait
    })
  }

  interruptAs(fiberId: Fiber.FiberID): Async<Exit.Exit<E, A>> {
    return this.kill0(fiberId)
  }

  done(v: Exit.Exit<E, A>): Instruction | undefined {
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

          return chain_.chain_(this.openScope.close(v), () => done.done(v))[_I]
        }
      }
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
  ): Instruction | undefined {
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
          return halt.halt(this.state.get.interrupted)[_I]
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
              oldState.status,
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
    return (_: Effect<any, any, any, any>) => {
      if (this.exitAsync(epoch)) {
        this.evaluateLater(_[_I])
      }
    }
  }

  evaluateLater(i0: Instruction) {
    this.scheduler.dispatchLater(() => {
      this.evaluateNow(i0)
    })
  }

  get scope(): Scope.Scope<Exit.Exit<E, A>> {
    return this.openScope.scope
  }

  fork(
    i0: Instruction,
    forkScope: O.Option<Scope.Scope<Exit.Exit<any, any>>>
  ): FiberContext<any, any> {
    const childFiberRefLocals: FiberRefLocals = new Map()

    this.fiberRefLocals.forEach((v, k) => {
      childFiberRefLocals.set(k, k.fork(v))
    })

    const parentScope: Scope.Scope<Exit.Exit<any, any>> = O.getOrElse_(
      O.alt_(forkScope, () => this.forkScopeOverride?.value || O.none),
      () => this.scope
    )

    const currentEnv = this.environments?.value || {}
    const currentSup = this.supervisors.value
    const childId = Fiber.newFiberId()
    const childScope = Scope.unsafeMakeScope<Exit.Exit<E, A>>()

    const childContext = new FiberContext(
      childId,
      currentEnv,
      Fiber.interruptStatus(this.isInterruptible),
      childFiberRefLocals,
      currentSup,
      childScope
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
    i0: Instruction
  ): Instruction {
    if (parentScope !== Scope.globalScope) {
      const exitOrKey = parentScope.unsafeEnsure((exit) =>
        suspend.suspend(
          (): Async<any> => {
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
              return interruptAs.interruptAs(
                O.getOrElse_(
                  A.head(Array.from(Cause.interruptors(exit.cause))),
                  () => this.fiberId
                )
              )[_I]
            }
            case "Success": {
              return interruptAs.interruptAs(this.fiberId)[_I]
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
    ) => Effect<any, any, any, any>,
    winnerExit: Exit.Exit<any, any>,
    ab: AtomicReference<boolean>,
    cb: (_: Effect<unknown, R & R1 & R2 & R3, E2 | E3, A2 | A3>) => void
  ): void {
    if (ab.compareAndSet(true, false)) {
      switch (winnerExit._tag) {
        case "Failure": {
          cb(cont(winnerExit, loser))
          break
        }
        case "Success": {
          cb(chain.chain(() => cont(winnerExit, loser))(winner.inheritRefs))
          break
        }
      }
    }
  }

  get inheritRefs() {
    return suspend.suspend(() => {
      const locals = this.fiberRefLocals
      if (locals.size === 0) {
        return unit.unit
      } else {
        return foreachUnit_.foreachUnit_(locals, ([fiberRef, value]) =>
          update.update((old) => fiberRef.join(old, value))(fiberRef)
        )
      }
    })
  }

  raceWithImpl<S, R, E, A, S1, R1, E1, A1, S2, R2, E2, A2, S3, R3, E3, A3>(
    race: IRaceWith<S, R, E, A, S1, R1, E1, A1, S2, R2, E2, A2, S3, R3, E3, A3>
  ): Effect<unknown, R & R1 & R2 & R3, E2 | E3, A2 | A3> {
    const raceIndicator = new AtomicReference(true)
    const left = this.fork(race.left[_I], race.scope)
    const right = this.fork(race.right[_I], race.scope)

    return effectAsync.effectAsync<R & R1 & R2 & R3, E2 | E3, A2 | A3>(
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

  evaluateNow(i0: Instruction, isSync = false): void {
    try {
      // eslint-disable-next-line prefer-const
      let current: Instruction | undefined = i0

      currentFiber.set(this)

      while (current != null) {
        try {
          while (current != null) {
            // Check to see if the fiber should continue executing or not:
            if (!this.shouldInterrupt) {
              switch (current._tag) {
                case "FlatMap": {
                  const nested: Instruction = current.val[_I]
                  const k: (a: any) => Effect<any, any, any, any> = current.f

                  switch (nested._tag) {
                    case "Succeed": {
                      current = k(nested.val)[_I]
                      break
                    }
                    case "EffectTotal": {
                      current = k(nested.effect())[_I]
                      break
                    }
                    case "EffectPartial": {
                      try {
                        current = k(nested.effect())[_I]
                      } catch (e) {
                        current = fail.fail(nested.onThrow(e))[_I]
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

                case "Succeed": {
                  current = this.nextInstr(current.val)
                  break
                }

                case "EffectTotal": {
                  current = this.nextInstr(current.effect())
                  break
                }

                case "Fail": {
                  const discardedFolds = this.unwindStack()
                  const fullCause = current.cause

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
                        : Cause.Then(maybeRedactedCause, interrupted)

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
                  current = current.value[_I]
                  break
                }

                case "InterruptStatus": {
                  this.pushInterruptStatus(current.flag.toBoolean)
                  this.pushContinuation(this.interruptExit)
                  current = current.effect[_I]
                  break
                }

                case "CheckInterrupt": {
                  current = current.f(Fiber.interruptStatus(this.isInterruptible))[_I]
                  break
                }

                case "EffectPartial": {
                  const c = current
                  try {
                    current = this.nextInstr(c.effect())
                  } catch (e) {
                    current = fail.fail(c.onThrow(e))[_I]
                  }
                  break
                }

                case "EffectAsync": {
                  if (isSync) {
                    current = die.die(
                      new Error("Fatal(Bug): runSync called with async instructions")
                    )[_I]
                    break
                  }
                  const epoch = this.asyncEpoch
                  this.asyncEpoch = epoch + 1
                  const c = current
                  current = this.enterAsync(epoch, c.blockingOn)

                  if (!current) {
                    const k = c.register
                    const h = k(this.resumeAsync(epoch))

                    switch (h._tag) {
                      case "None": {
                        current = undefined
                        break
                      }
                      case "Some": {
                        if (this.exitAsync(epoch)) {
                          current = h.value[_I]
                        } else {
                          current = undefined
                        }
                      }
                    }
                  }

                  break
                }

                case "Fork": {
                  if (isSync) {
                    current = die.die(
                      new Error("Fatal(Bug): runSync called with fork instructions")
                    )[_I]
                    break
                  }
                  current = this.nextInstr(this.fork(current.value[_I], current.scope))
                  break
                }

                case "Descriptor": {
                  current = current.f(this.getDescriptor())[_I]
                  break
                }

                case "Yield": {
                  if (isSync) {
                    current = die.die(
                      new Error("Fatal(Bug): runSync called with yield instructions")
                    )[_I]
                    break
                  }
                  current = undefined
                  this.evaluateLater(unit.unit[_I])
                  break
                }

                case "Read": {
                  current = current.f(this.environments?.value || {})[_I]
                  break
                }

                case "Provide": {
                  const c = current
                  current = bracket.bracket_(
                    effectTotal.effectTotal(() => {
                      this.pushEnv(c.r)
                    }),
                    () => c.next,
                    () =>
                      effectTotal.effectTotal(() => {
                        this.popEnv()
                      })
                  )[_I]
                  break
                }

                case "Suspend": {
                  current = current.factory()[_I]
                  break
                }

                case "SuspendPartial": {
                  const c = current

                  try {
                    current = c.factory()[_I]
                  } catch (e) {
                    current = fail.fail(c.onThrow(e))[_I]
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
                  const [result, newValue] = current.f(
                    O.getOrElse_(oldValue, () => c.fiberRef.initial)
                  )
                  this.fiberRefLocals.set(c.fiberRef, newValue)
                  current = this.nextInstr(result)
                  break
                }

                case "RaceWith": {
                  if (isSync) {
                    current = die.die(
                      new Error("Fatal(Bug): runSync called with raceWith instructions")
                    )[_I]
                    break
                  }
                  current = this.raceWithImpl(current)[_I]
                  break
                }

                case "Supervise": {
                  const c = current
                  const lastSupervisor = this.supervisors.value
                  const newSupervisor = c.supervisor.and(lastSupervisor)
                  const push = effectTotal.effectTotal(() => {
                    this.supervisors = new Stack(newSupervisor, this.supervisors)
                  })
                  const pop = effectTotal.effectTotal(() => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.supervisors = this.supervisors.previous!
                  })
                  current = bracket.bracket_(
                    push,
                    () => c.effect,
                    () => pop
                  )[_I]
                  break
                }

                case "GetForkScope": {
                  const c = current
                  current = c.f(
                    O.getOrElse_(
                      this.forkScopeOverride?.value || O.none,
                      () => this.scope
                    )
                  )[_I]
                  break
                }

                case "OverrideForkScope": {
                  const c = current

                  const push = effectTotal.effectTotal(() => {
                    this.forkScopeOverride = new Stack(
                      c.forkScope,
                      this.forkScopeOverride
                    )
                  })

                  const pop = effectTotal.effectTotal(() => {
                    this.forkScopeOverride = this.forkScopeOverride?.previous
                  })

                  current = bracket.bracket_(
                    push,
                    () => c.effect,
                    () => pop
                  )[_I]

                  break
                }
              }
            } else {
              current = halt.halt(this.state.get.interrupted)[_I]
              this.setInterrupting(true)
            }
          }
        } catch (e) {
          this.setInterrupting(true)
          current = die.die(e)[_I]
        }
      }
    } finally {
      currentFiber.set(null)
    }
  }
}
