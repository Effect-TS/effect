import * as O from "../../Option"
// cause
import { Interrupt, Then, Cause } from "../Cause/cause"
import { contains } from "../Cause/contains"
import { interruptors } from "../Cause/interruptors"
import { isEmpty } from "../Cause/isEmpty"
import { stripFailures } from "../Cause/stripFailures"
// effect
import * as bracket from "../Effect/bracket"
import * as chain from "../Effect/chain"
import * as die from "../Effect/die"
import * as done from "../Effect/done"
import { Effect, Sync, Async } from "../Effect/effect"
import * as effectAsync from "../Effect/effectAsync"
import * as effectAsyncOption from "../Effect/effectAsyncOption"
import * as effectTotal from "../Effect/effectTotal"
import * as fail from "../Effect/fail"
import * as foreachUnit_ from "../Effect/foreachUnit_"
import * as halt from "../Effect/halt"
import * as interruptAs from "../Effect/interruptAs"
import { IFold, Instruction, IRaceWith } from "../Effect/primitives"
import * as succeedNow from "../Effect/succeedNow"
import * as suspend from "../Effect/suspend"
import * as unit from "../Effect/unit"
// exit
import { RuntimeError, IllegalStateException } from "../Errors"
import { Exit } from "../Exit/exit"
import { flatten as flattenExit } from "../Exit/flatten"
import { halt as haltExit } from "../Exit/halt"
import { succeed as succeedExit } from "../Exit/succeed"
// fiberRef
import { FiberRef } from "../FiberRef/fiberRef"
import * as update from "../FiberRef/update"
// supervisor
import * as Scope from "../Scope"
import * as Sup from "../Supervisor"
// support
import { AtomicReference } from "../Support/AtomicReference"
import { defaultScheduler } from "../Support/Scheduler"

// fiber
import { currentFiber } from "./currentFiber"
import { Descriptor } from "./descriptor"
import * as Fiber from "./fiber"
import { FiberID, newFiberId } from "./id"
import * as IS from "./interruptStatus"
import {
  initial,
  FiberRefLocals,
  interrupting,
  Callback,
  FiberStateExecuting,
  FiberStateDone
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

export class FiberContext<E, A> implements Fiber.Runtime<E, A> {
  readonly _tag = "RuntimeFiber"
  readonly state = new AtomicReference(initial<E, A>())
  readonly scheduler = defaultScheduler

  asyncEpoch = 0 | 0
  stack?: Stack<Frame> = undefined
  environments?: Stack<any> = new Stack(this.startEnv)
  interruptStatus?: Stack<boolean> = new Stack(this.startIStatus.toBoolean)
  supervisors: Stack<Sup.Supervisor<any>> = new Stack(this.supervisor0)
  forkScopeOverride?: Stack<O.Option<Scope.Scope<Exit<any, any>>>> = undefined
  scopeKey: Scope.Key | undefined = undefined

  constructor(
    readonly fiberId: FiberID,
    readonly startEnv: any,
    readonly startIStatus: IS.InterruptStatus,
    readonly fiberRefLocals: FiberRefLocals,
    readonly supervisor0: Sup.Supervisor<any>,
    readonly openScope: Scope.Open<Exit<E, A>>
  ) {}

  get poll() {
    return effectTotal.effectTotal(() => this.poll0())
  }

  getRef<K>(fiberRef: FiberRef<K>) {
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
      return succeedNow.succeedNow(v).asInstruction
    } else {
      return effectTotal.effectTotal(() => {
        this.popInterruptStatus()
        return v
      }).asInstruction
    }
  })

  get isInterruptible() {
    return this.interruptStatus ? this.interruptStatus.value : true
  }

  get isInterrupted() {
    return !isEmpty(this.state.get.interrupted)
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
    const v = this.register0((xx) => k(flattenExit(xx)))

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

  register0(k: Callback<never, Exit<E, A>>): Exit<E, A> | null {
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

      return k.apply(value).asInstruction
    } else {
      return this.done(succeedExit(value))?.asInstruction
    }
  }

  notifyObservers(v: Exit<E, A>, observers: Callback<never, Exit<E, A>>[]) {
    const result = succeedExit(v)

    observers.forEach((k) => k(result))
  }

  observe0(k: Callback<never, Exit<E, A>>): O.Option<Sync<Exit<E, A>>> {
    const x = this.register0(k)

    if (x != null) {
      return O.some(succeedNow.succeedNow(x))
    }

    return O.none
  }

  get wait(): Async<Exit<E, A>> {
    return effectAsyncOption.effectAsyncOption(
      (k) => this.observe0((x) => k(done.done(x))),
      [this.fiberId]
    )
  }

  kill0(fiberId: FiberID): Async<Exit<E, A>> {
    const interruptedCause = Interrupt(fiberId)

    const setInterruptedLoop = (): Cause<never> => {
      const oldState = this.state.get

      switch (oldState._tag) {
        case "Executing": {
          if (oldState.status._tag === "Suspended" && oldState.status.interruptible) {
            const newCause = Then(oldState.interrupted, interruptedCause)

            this.state.set(
              new FiberStateExecuting(
                Status.withInterrupting(true)(oldState.status),
                oldState.observers,
                newCause
              )
            )

            this.evaluateLater(interruptAs.interruptAs(this.fiberId).asInstruction)

            return newCause
          } else {
            const newCause = Then(oldState.interrupted, interruptedCause)

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

  interruptAs(fiberId: FiberID): Async<Exit<E, A>> {
    return this.kill0(fiberId)
  }

  done(v: Exit<E, A>): Instruction | undefined {
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

          return chain.chain(() => done.done(v))(this.openScope.close(v)).asInstruction
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

  enterAsync(epoch: number, blockingOn: readonly FiberID[]): Instruction | undefined {
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
          return halt.halt(this.state.get.interrupted).asInstruction
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
        this.evaluateLater(_.asInstruction)
      }
    }
  }

  evaluateLater(i0: Instruction) {
    this.scheduler.dispatchLater(this.evaluateNow.bind(this), i0, 0)
  }

  get scope(): Scope.Scope<Exit<E, A>> {
    return this.openScope.scope
  }

  fork(
    i0: Instruction,
    forkScope: O.Option<Scope.Scope<Exit<any, any>>>
  ): FiberContext<any, any> {
    const childFiberRefLocals: FiberRefLocals = new Map()

    this.fiberRefLocals.forEach((v, k) => {
      childFiberRefLocals.set(k, k.fork(v))
    })

    const parentScope: Scope.Scope<Exit<any, any>> = O.getOrElse_(
      O.alt_(forkScope, () => this.forkScopeOverride?.value || O.none),
      () => this.scope
    )

    const currentEnv = this.environments?.value || {}
    const currentSup = this.supervisors.value
    const childId = newFiberId()
    const childScope = Scope.unsafeMakeScope<Exit<E, A>>()

    const childContext = new FiberContext(
      childId,
      currentEnv,
      IS.fromBoolean(this.isInterruptible),
      childFiberRefLocals,
      currentSup,
      childScope
    )

    if (currentSup !== Sup.none) {
      currentSup.unsafeOnStart(currentEnv, i0, O.some(this), childContext)
      childContext.onDone((exit) =>
        currentSup.unsafeOnEnd(flattenExit(exit), childContext)
      )
    }

    if (parentScope !== Scope.globalScope) {
      const childContextRef = () => childContext
      const key = parentScope.unsafeEnsure((exit) =>
        suspend.suspend(
          (): Async<any> => {
            const childContext = childContextRef()

            if (childContext != null) {
              const _interruptors =
                exit._tag === "Failure" ? interruptors(exit.cause) : new Set<FiberID>()

              const head = _interruptors.values().next()

              if (head.done) {
                return childContext.interruptAs(this.fiberId)
              } else {
                return childContext.interruptAs(head.value)
              }
            } else {
              return unit.unit
            }
          }
        )
      )

      childContext.scopeKey = O.getOrElse_(key, () => {
        throw new IllegalStateException(
          "Defect: The fiber's scope has ended before the fiber itself has ended"
        )
      })
    }

    this.scheduler.dispatchLater(
      () => {
        childContext.evaluateNow(i0)
      },
      undefined,
      0
    )

    return childContext
  }

  onDone(k: Callback<never, Exit<E, A>>): void {
    const oldState = this.state.get

    switch (oldState._tag) {
      case "Done": {
        k(succeedExit(oldState.value))
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
    return new Descriptor(
      this.fiberId,
      this.state.get.status,
      interruptors(this.state.get.interrupted),
      IS.fromBoolean(this.isInterruptible),
      this.scope
    )
  }

  complete<R, R1, R2, E2, A2, R3, E3, A3>(
    winner: Fiber.Fiber<any, any>,
    loser: Fiber.Fiber<any, any>,
    cont: (
      exit: Exit<any, any>,
      fiber: Fiber.Fiber<any, any>
    ) => Effect<any, any, any, any>,
    winnerExit: Exit<any, any>,
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
    const left = this.fork(race.left.asInstruction, race.scope)
    const right = this.fork(race.right.asInstruction, race.scope)

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

  evaluateNow(i0: Instruction): void {
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
                  const nested: Instruction = current.val.asInstruction
                  const k: (a: any) => Effect<any, any, any, any> = current.f

                  switch (nested._tag) {
                    case "Succeed": {
                      current = k(nested.val).asInstruction
                      break
                    }
                    case "EffectTotal": {
                      current = k(nested.effect()).asInstruction
                      break
                    }
                    case "EffectPartial": {
                      try {
                        current = k(nested.effect()).asInstruction
                      } catch (e) {
                        current = fail.fail(nested.onThrow(e)).asInstruction
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
                  const cause0 = current.cause

                  if (this.isStackEmpty) {
                    // Error not caught, stack is empty:
                    const cause = () => {
                      const interrupted = this.state.get.interrupted
                      const causeAndInterrupt = contains(interrupted)(cause0)
                        ? cause0
                        : Then(cause0, interrupted)

                      if (discardedFolds) {
                        // We threw away some error handlers while unwinding the stack because
                        // we got interrupted during this instruction. So it's not safe to return
                        // typed failures from cause0, because they might not be typed correctly.
                        // Instead, we strip the typed failures, and return the remainders and
                        // the interruption.
                        return stripFailures(causeAndInterrupt)
                      } else {
                        return causeAndInterrupt
                      }
                    }

                    current = this.done(haltExit(cause()))
                  } else {
                    this.setInterrupting(false)

                    // Error caught, next continuation on the stack will deal
                    // with it, so we just have to compute it here:
                    current = this.nextInstr(cause0)
                  }

                  break
                }

                case "Fold": {
                  this.pushContinuation(current)
                  current = current.value.asInstruction
                  break
                }

                case "InterruptStatus": {
                  this.pushInterruptStatus(current.flag.toBoolean)
                  this.pushContinuation(this.interruptExit)
                  current = current.effect.asInstruction
                  break
                }

                case "CheckInterrupt": {
                  current = current.f(IS.fromBoolean(this.isInterruptible))
                    .asInstruction
                  break
                }

                case "EffectPartial": {
                  const c = current
                  try {
                    current = this.nextInstr(c.effect())
                  } catch (e) {
                    current = fail.fail(c.onThrow(e)).asInstruction
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
                    const h = k(this.resumeAsync(epoch))

                    switch (h._tag) {
                      case "None": {
                        current = undefined
                        break
                      }
                      case "Some": {
                        if (this.exitAsync(epoch)) {
                          current = h.value.asInstruction
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
                    this.fork(current.value.asInstruction, current.scope)
                  )
                  break
                }

                case "Descriptor": {
                  current = current.f(this.getDescriptor()).asInstruction
                  break
                }

                case "Yield": {
                  this.evaluateLater(unit.unit.asInstruction)
                  break
                }

                case "Read": {
                  current = current.f(this.environments?.value || {}).asInstruction
                  break
                }

                case "Provide": {
                  const c = current
                  current = bracket.bracket(
                    effectTotal.effectTotal(() => {
                      this.pushEnv(c.r)
                    }),
                    () =>
                      effectTotal.effectTotal(() => {
                        this.popEnv()
                      }),
                    () => c.next
                  ).asInstruction
                  break
                }

                case "Suspend": {
                  current = current.factory().asInstruction
                  break
                }

                case "SuspendPartial": {
                  const c = current

                  try {
                    current = c.factory().asInstruction
                  } catch (e) {
                    current = fail.fail(c.onThrow(e)).asInstruction
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
                  current = this.raceWithImpl(current).asInstruction
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
                  current = bracket.bracket(
                    push,
                    () => pop,
                    () => c.effect
                  ).asInstruction
                  break
                }

                case "GetForkScope": {
                  const c = current
                  current = c.f(
                    O.getOrElse_(
                      this.forkScopeOverride?.value || O.none,
                      () => this.scope
                    )
                  ).asInstruction
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

                  current = bracket.bracket(
                    push,
                    () => pop,
                    () => c.effect
                  ).asInstruction

                  break
                }
              }
            } else {
              current = halt.halt(this.state.get.interrupted).asInstruction
              this.setInterrupting(true)
            }
          }
        } catch (e) {
          this.setInterrupting(true)
          current = die.die(e).asInstruction
        }
      }
    } finally {
      currentFiber.set(null)
    }
  }
}
