import { Effect, EffectURI } from "@effect/core/io/Effect/definition"
import { STMTypeId } from "@effect/core/stm/STM/definition/base"
import { State } from "@effect/core/stm/STM/State"
import { TxnId } from "@effect/core/stm/STM/TxnId"

import type { Entry } from "@effect/core/stm/STM/Entry"
import { TryCommit } from "@effect/core/stm/STM/TryCommit"
import { concreteTRef } from "@effect/core/stm/TRef/operations/_internal/TRefInternal"
import type { Scheduler } from "@effect/core/support/Scheduler"
import { SingleShotGen } from "@effect/core/support/SingleShotGen"

export abstract class STMBase<R, E, A> implements STM<R, E, A> {
  readonly _tag = "ICommit"
  readonly [STMTypeId] = {
    _R: (_: never): R => _,
    _E: (_: never): E => _,
    _A: (_: never): A => _
  }
  readonly [EffectURI] = {
    _R: (_: never): R => _,
    _E: (_: never): E => _,
    _A: (_: never): A => _
  }
  get commit(): Effect<R, E, A> {
    return commit(this)
  }
  abstract _call(trace: string | undefined): Effect<R, E, A>
  [Symbol.iterator](): Generator<STM<R, E, A>, A, any> {
    return new SingleShotGen<this, never>(this)
  }
}

export class STMEffect<R, E, A> extends STMBase<R, E, A> {
  readonly _stmtag = "STMEffect"

  constructor(
    readonly f: (journal: Journal, fiberId: FiberId, environment: Env<R>) => A,
    readonly trace?: string
  ) {
    super()
  }

  _call(trace: string | undefined): Effect<R, E, A> {
    return new STMEffect(this.f, trace)
  }
}

export class STMOnFailure<R, E, E1, A> extends STMBase<R, E1, A> {
  readonly _stmtag = "STMOnFailure"

  constructor(
    readonly stm: STM<R, E, A>,
    readonly onFailure: (e: E) => STM<R, E1, A>,
    readonly trace?: string
  ) {
    super()
  }
  apply(a: A): STM<R, E, A> {
    return new STMSucceedNow(a)
  }
  _call(trace: string | undefined): Effect<R, E1, A> {
    return new STMOnFailure(this.stm, this.onFailure, trace)
  }
}

export class STMOnRetry<R, E, A, R1, E1, A1> extends STMBase<R, E, A> {
  readonly _stmtag = "STMOnRetry"

  constructor(
    readonly stm: STM<R, E, A>,
    readonly onRetry: Lazy<STM<R1, E1, A1>>,
    readonly trace?: string
  ) {
    super()
  }
  apply(a: A): STM<R, E, A> {
    return new STMSucceedNow(a)
  }
  _call(trace: string | undefined): Effect<R, E, A> {
    return new STMOnRetry(this.stm, this.onRetry, trace)
  }
}

export class STMOnSuccess<R, E, A, B> extends STMBase<R, E, B> {
  readonly _stmtag = "STMOnSuccess"

  constructor(
    readonly stm: STM<R, E, A>,
    readonly apply: (a: A) => STM<R, E, B>,
    readonly trace?: string
  ) {
    super()
  }

  _call(trace: string | undefined): Effect<R, E, B> {
    return new STMOnSuccess(this.stm, this.apply, trace)
  }
}

export class STMProvide<R0, R, E, A> extends STMBase<R, E, A> {
  readonly _stmtag = "STMProvide"

  constructor(
    readonly stm: STM<R0, E, A>,
    readonly f: (env: Env<R>) => Env<R0>,
    readonly trace?: string
  ) {
    super()
  }

  _call(trace: string | undefined): Effect<R, E, A> {
    return new STMProvide(this.stm, this.f, trace)
  }
}

export class STMSucceedNow<R, E, A> extends STMBase<R, E, A> {
  readonly _stmtag = "STMSucceedNow"

  constructor(readonly a: A, readonly trace?: string) {
    super()
  }

  _call(trace: string | undefined): Effect<R, E, A> {
    return new STMSucceedNow(this.a, trace)
  }
}

export class STMSucceed<R, E, A> extends STMBase<R, E, A> {
  readonly _stmtag = "STMSucceed"

  constructor(readonly a: Lazy<A>, readonly trace?: string) {
    super()
  }

  _call(trace: string | undefined): Effect<R, E, A> {
    return new STMSucceed(this.a, trace)
  }
}

export const STMFailExceptionSym = Symbol.for("@effect/core/stm/STM/FailException")
export type STMFailExceptionSym = typeof STMFailExceptionSym

export class STMFailException<E> {
  readonly [STMFailExceptionSym]: STMFailExceptionSym = STMFailExceptionSym
  constructor(readonly e: E) {}
}

/**
 * @tsplus static effect/core/stm/STM.Ops isFailException
 */
export function isFailException(u: unknown): u is STMFailException<unknown> {
  return typeof u === "object" && u != null && STMFailExceptionSym in u
}

export const STMDieExceptionSym = Symbol.for("@effect/core/stm/STM/DieException")
export type STMDieExceptionSym = typeof STMDieExceptionSym

export class STMDieException<E> {
  readonly [STMDieExceptionSym]: STMDieExceptionSym = STMDieExceptionSym
  constructor(readonly e: E) {}
}

/**
 * @tsplus static effect/core/stm/STM.Ops isDieException
 */
export function isDieException(u: unknown): u is STMDieException<unknown> {
  return typeof u === "object" && u != null && STMDieExceptionSym in u
}

export const STMInterruptExceptionSym = Symbol.for("@effect/core/stm/STM/InterruptException")
export type STMInterruptExceptionSym = typeof STMInterruptExceptionSym

export class STMInterruptException {
  readonly [STMInterruptExceptionSym]: STMInterruptExceptionSym = STMInterruptExceptionSym
  constructor(readonly fiberId: FiberId) {}
}

/**
 * @tsplus static effect/core/stm/STM.Ops isInterruptException
 */
export function isInterruptException(u: unknown): u is STMInterruptException {
  return typeof u === "object" && u != null && STMInterruptExceptionSym in u
}

export const STMRetryExceptionSym = Symbol.for("@effect/core/stm/STM/RetryException")
export type STMRetryExceptionSym = typeof STMRetryExceptionSym

export class STMRetryException {
  readonly [STMRetryExceptionSym]: STMRetryExceptionSym = STMRetryExceptionSym
}

/**
 * @tsplus static effect/core/stm/STM.Ops isRetryException
 */
export function isRetryException(u: unknown): u is STMRetryException {
  return typeof u === "object" && u != null && STMRetryExceptionSym in u
}

/**
 * Commits this transaction atomically.
 *
 * @tsplus getter effect/core/stm/STM commit
 */
export function commit<R, E, A>(self: STM<R, E, A>): Effect<R, E, A> {
  return STM.atomically(self)
}

/**
 * @tsplus static effect/core/stm/STM.Ops atomically
 */
export function atomically<R, E, A>(self: STM<R, E, A>): Effect<R, E, A> {
  return Effect.withFiberRuntime((state) => {
    const fiberId = state.id
    const env = state.getFiberRef(FiberRef.currentEnvironment)
    const scheduler = state.getFiberRef(FiberRef.currentScheduler)
    const commitResult = tryCommitSync(fiberId, self, env, scheduler)
    switch (commitResult._tag) {
      case "Done": {
        return Effect.done(commitResult.exit)
      }
      case "Suspend": {
        const txnId = TxnId()
        const state = new AtomicReference<State<E, A>>(State.running)
        const io = Effect.async(
          tryCommitAsync(commitResult.journal, fiberId, self, txnId, state, env, scheduler)
        )
        return Effect.uninterruptibleMask(({ restore }) =>
          restore(io).catchAllCause((cause) => {
            state.compareAndSet(State.running, State.interrupted)
            const currentState = state.get
            return currentState._tag === "Done"
              ? Effect.done(currentState.exit)
              : Effect.failCause(cause)
          })
        )
      }
    }
  })
}

/**
 * Executes the specified finalization transaction whether or
 * not this effect succeeds. Note that as with all STM transactions,
 * if the full transaction fails, everything will be rolled back.
 *
 * @tsplus static effect/core/stm/STM.Aspects ensuring
 * @tsplus pipeable effect/core/stm/STM ensuring
 */
export function ensuring<R1, B>(finalizer: STM<R1, never, B>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E, A> =>
    self.foldSTM(
      (e) => finalizer > STM.fail(e),
      (a) => finalizer > STM.succeed(a)
    )
}

/**
 * Returns a value that models failure in the transaction.
 *
 * @tsplus static effect/core/stm/STM.Ops fail
 */
export function fail<E>(e: E): STM<never, E, never> {
  return new STMEffect(() => {
    throw new STMFailException(e)
  })
}

/**
 * Returns an `STM` effect that succeeds with the specified value.
 *
 * @tsplus static effect/core/stm/STM.Ops succeed
 */
export function succeed<A>(a: A): STM<never, never, A> {
  return new STMSucceedNow(a)
}

/**
 * Effectfully folds over the `STM` effect, handling both failure and
 * success.
 *
 * @tsplus static effect/core/stm/STM.Aspects foldSTM
 * @tsplus pipeable effect/core/stm/STM foldSTM
 */
export function foldSTM<E, R1, E1, A1, A, R2, E2, A2>(
  g: (e: E) => STM<R1, E1, A1>,
  f: (a: A) => STM<R2, E2, A2>
) {
  return <R>(self: STM<R, E, A>): STM<R | R1 | R2, E1 | E2, A1 | A2> =>
    self
      .map(Either.right)
      .catchAll((e) => g(e).map(Either.left))
      .flatMap((either) => either.fold(STM.succeed, f))
}

/**
 * Maps the value produced by the effect.
 *
 * @tsplus static effect/core/stm/STM.Aspects map
 * @tsplus pipeable effect/core/stm/STM map
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, B> =>
    self.flatMap(
      (a) => STM.sync(f(a))
    )
}

/**
 * Sequentially zips this value with the specified one, discarding the first
 * element of the tuple.
 *
 * @tsplus pipeable-operator effect/core/stm/STM >
 * @tsplus static effect/core/stm/STM.Aspects zipRight
 * @tsplus pipeable effect/core/stm/STM zipRight
 */
export function zipRight<R1, E1, A1>(that: STM<R1, E1, A1>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, A1> => self.zipWith(that, (_, b) => b)
}

/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 *
 * @tsplus static effect/core/stm/STM.Aspects zipWith
 * @tsplus pipeable effect/core/stm/STM zipWith
 */
export function zipWith<R1, E1, A1, A, A2>(that: STM<R1, E1, A1>, f: (a: A, b: A1) => A2) {
  return <R, E>(self: STM<R, E, A>): STM<R1 | R, E | E1, A2> =>
    self.flatMap((a) => that.map((b) => f(a, b)))
}

/**
 * Returns an `STM` effect that succeeds with the specified value.
 *
 * @tsplus static effect/core/stm/STM.Ops sync
 */
export function sync<A>(a: LazyArg<A>): STM<never, never, A> {
  return new STMSucceed(a)
}

/**
 * Recovers from all errors.
 *
 * @tsplus static effect/core/stm/STM.Aspects catchAll
 * @tsplus pipeable effect/core/stm/STM catchAll
 */
export function catchAll<E, R1, E1, B>(f: (e: E) => STM<R1, E1, B>) {
  return <R, A>(self: STM<R, E, A>): STM<R1 | R, E1, A | B> =>
    new STMOnFailure<R1 | R, E, E1, A | B>(self, f)
}

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 *
 * @tsplus static effect/core/stm/STM.Aspects flatMap
 * @tsplus pipeable effect/core/stm/STM flatMap
 */
export function flatMap<A, R1, E1, A2>(f: (a: A) => STM<R1, E1, A2>) {
  return <R, E>(self: STM<R, E, A>): STM<R1 | R, E | E1, A2> =>
    new STMOnSuccess<R1 | R, E | E1, A, A2>(self, f)
}

/**
 * @tsplus macro remove
 */
export function concreteSTM<R, E, A>(
  _: STM<R, E, A>
): asserts _ is
  | STMEffect<R, E, A>
  | STMOnFailure<R, unknown, E, A>
  | STMOnSuccess<R, E, unknown, A>
  | STMOnRetry<R, E, A, unknown, unknown, unknown>
  | STMSucceed<R, E, A>
  | STMSucceedNow<R, E, A>
  | STMProvide<unknown, R, E, A>
{
  //
}

type Erased = STM<unknown, unknown, unknown>
type Cont =
  | STMOnFailure<unknown, unknown, unknown, unknown>
  | STMOnRetry<unknown, unknown, unknown, unknown, unknown, unknown>
  | STMOnSuccess<unknown, unknown, unknown, unknown>

export class STMDriver<R, E, A> {
  private yieldOpCount = 2048
  private contStack: Stack<Cont> | undefined
  private envStack: Stack<Env<unknown>>

  constructor(
    readonly self: STM<R, E, A>,
    readonly journal: Journal,
    readonly fiberId: FiberId,
    r0: Env<R>
  ) {
    this.envStack = new Stack(r0)
  }

  private unwindStack(error: unknown, isRetry: boolean): Erased | undefined {
    let result: Erased | undefined = undefined
    while (this.contStack && result == null) {
      const cont = this.contStack.value
      this.contStack = this.contStack.previous
      if (cont._stmtag === "STMOnFailure") {
        if (!isRetry) {
          result = cont.onFailure(error)
        }
      }
      if (cont._stmtag === "STMOnRetry") {
        if (isRetry) {
          result = cont.onRetry()
        }
      }
    }
    return result
  }

  run(): TExit<E, A> {
    let curr = this.self as Erased | undefined
    let exit: TExit<unknown, unknown> | undefined = undefined
    let opCount = 0

    while (exit == null && curr != null) {
      if (opCount === this.yieldOpCount) {
        let valid = true
        for (const entry of this.journal) {
          valid = entry[1].use((_) => _.isValid())
        }
        if (!valid) {
          exit = TExit.retry
        } else {
          opCount = 0
        }
      } else {
        const k = curr
        concreteSTM(k)
        switch (k._stmtag) {
          case "STMEffect": {
            try {
              const a = k.f(this.journal, this.fiberId, this.envStack.value)
              if (!this.contStack) {
                exit = TExit.succeed(a)
              } else {
                const cont = this.contStack.value
                this.contStack = this.contStack.previous
                curr = cont.apply(a)
              }
            } catch (e) {
              if (STM.isRetryException(e)) {
                curr = this.unwindStack(undefined, true)
                if (!curr) {
                  exit = TExit.retry
                }
              } else if (STM.isFailException(e)) {
                curr = this.unwindStack(e.e, false)
                if (!curr) {
                  exit = TExit.fail(e.e)
                }
              } else if (STM.isDieException(e)) {
                curr = this.unwindStack(e.e, false)
                if (!curr) {
                  exit = TExit.die(e.e)
                }
              } else if (STM.isInterruptException(e)) {
                exit = TExit.interrupt(e.fiberId)
              } else {
                throw e
              }
            }
            break
          }

          case "STMOnSuccess": {
            this.contStack = new Stack(k, this.contStack)
            curr = k.stm
            break
          }

          case "STMOnFailure": {
            this.contStack = new Stack(k, this.contStack)
            curr = k.stm
            break
          }

          case "STMOnRetry": {
            this.contStack = new Stack(k, this.contStack)
            curr = k.stm
            break
          }

          case "STMProvide": {
            this.envStack = new Stack(k.f(this.envStack.value), this.envStack)
            curr = k.stm.ensuring(
              STM.sync(() => {
                this.envStack = this.envStack.previous!
              })
            )
            break
          }

          case "STMSucceedNow": {
            const a = k.a
            if (!this.contStack) {
              exit = TExit.succeed(a)
            } else {
              const cont = this.contStack.value
              this.contStack = this.contStack.previous
              curr = cont.apply(a)
            }
            break
          }

          case "STMSucceed": {
            const a = k.a()
            if (!this.contStack) {
              exit = TExit.succeed(a)
            } else {
              const cont = this.contStack.value
              this.contStack = this.contStack.previous
              curr = cont.apply(a)
            }
            break
          }
        }
        opCount = opCount + 1
      }
    }

    return exit as TExit<E, A>
  }
}

export function tryCommit<R, E, A>(
  fiberId: FiberId,
  stm: STM<R, E, A>,
  state: AtomicReference<State<E, A>>,
  env: Env<R>,
  scheduler: Scheduler
): TryCommit<E, A> {
  const journal: Journal = new Map()
  const value = new STMDriver(stm, journal, fiberId, env).run()
  const analysis = analyzeJournal(journal)

  if (analysis === "RW") {
    state.compareAndSet(State.running, State.done(value))
    commitJournal(journal)
  } else if (analysis === "I") {
    throw new Error("Bug: invalid journal")
  }

  switch (value._tag) {
    case "Succeed": {
      return completeTodos(Exit.succeed(value.value), journal, scheduler)
    }
    case "Fail": {
      return completeTodos(Exit.fail(value.value), journal, scheduler)
    }
    case "Die": {
      return completeTodos(Exit.die(value.value), journal, scheduler)
    }
    case "Interrupt": {
      return completeTodos(Exit.interrupt(fiberId), journal, scheduler)
    }
    case "Retry": {
      return TryCommit.suspend(journal)
    }
  }
}

export function tryCommitSync<R, E, A>(
  fiberId: FiberId,
  stm: STM<R, E, A>,
  env: Env<R>,
  scheduler: Scheduler
): TryCommit<E, A> {
  const journal: Journal = new Map()
  const value = new STMDriver(stm, journal, fiberId, env).run()
  const analysis = analyzeJournal(journal)

  if (analysis === "RW" && value._tag === "Succeed") {
    commitJournal(journal)
  } else if (analysis === "I") {
    throw new Error("Bug: invalid journal")
  }

  switch (value._tag) {
    case "Succeed": {
      return completeTodos(Exit.succeed(value.value), journal, scheduler)
    }
    case "Fail": {
      return completeTodos(Exit.fail(value.value), journal, scheduler)
    }
    case "Die": {
      return completeTodos(Exit.die(value.value), journal, scheduler)
    }
    case "Interrupt": {
      return completeTodos(Exit.interrupt(fiberId), journal, scheduler)
    }
    case "Retry": {
      return TryCommit.suspend(journal)
    }
  }
}

function completeTryCommit<R, E, A>(
  exit: Exit<E, A>,
  k: (_: Effect<R, E, A>) => unknown
) {
  k(Effect.done(exit))
}

function suspendTryCommit<R, E, A>(
  fiberId: FiberId,
  stm: STM<R, E, A>,
  txnId: TxnId,
  state: AtomicReference<State<E, A>>,
  env: Env<R>,
  k: (_: Effect<R, E, A>) => unknown,
  accum: Journal,
  journal: Journal,
  scheduler: Scheduler
) {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    addTodo(
      txnId,
      journal,
      () => tryCommitAsync(undefined, fiberId, stm, txnId, state, env, scheduler)(k)
    )
    if (isInvalid(journal)) {
      const v = tryCommit(fiberId, stm, state, env, scheduler)
      switch (v._tag) {
        case "Done": {
          completeTryCommit(v.exit, k)
          return
        }
        case "Suspend": {
          const untracked = untrackedTodoTargets(accum, v.journal)
          if (untracked.size > 0) {
            for (const entry of untracked) {
              accum.set(entry[0], entry[1])
            }
            journal = untracked
          }
          break
        }
      }
    } else {
      return
    }
  }
}

export function tryCommitAsync<R, E, A>(
  journal: Journal | undefined,
  fiberId: FiberId,
  stm: STM<R, E, A>,
  txnId: TxnId,
  state: AtomicReference<State<E, A>>,
  env: Env<R>,
  scheduler: Scheduler
) {
  return (k: (_: Effect<R, E, A>) => unknown) => {
    if (state.get.isRunning) {
      if (journal == null) {
        const v = tryCommit(fiberId, stm, state, env, scheduler)
        switch (v._tag) {
          case "Done": {
            completeTryCommit(v.exit, k)
            break
          }
          case "Suspend": {
            suspendTryCommit(fiberId, stm, txnId, state, env, k, v.journal, v.journal, scheduler)
            break
          }
        }
      } else {
        suspendTryCommit(fiberId, stm, txnId, state, env, k, journal, journal, scheduler)
      }
    }
  }
}

export type Journal = Map<TRef<unknown>, Entry>

export type JournalAnalysis = "I" | "RW" | "RO"

export type Todo = Lazy<unknown>

/**
 * Creates a function that can reset the journal.
 */
export function prepareResetJournal(journal: Journal): Lazy<unknown> {
  const saved: Journal = new Map()
  for (const entry of journal) {
    saved.set(
      entry[0],
      entry[1].use((_) => _.copy())
    )
  }
  return () => {
    journal.clear()
    for (const entry of saved) {
      journal.set(entry[0], entry[1])
    }
  }
}

/**
 * Commits the journal.
 */
export function commitJournal(journal: Journal) {
  for (const entry of journal) {
    entry[1].use((_) => _.commit())
  }
}

/**
 * Analyzes the journal, determining whether it is valid and whether it is
 * read only in a single pass. Note that information on whether the
 * journal is read only will only be accurate if the journal is valid, due
 * to short-circuiting that occurs on an invalid journal.
 */
export function analyzeJournal(journal: Journal): JournalAnalysis {
  let val: JournalAnalysis = "RO"
  for (const entry of journal) {
    val = entry[1].use((_) => (_.isInvalid() ? "I" : _.isChanged() ? "RW" : val))
    if (val === "I") {
      return val
    }
  }
  return val
}

export const emptyTodoMap = HashMap.empty<TxnId, Todo>()

/**
 * Atomically collects and clears all the todos from any `TRef` that
 * participated in the transaction.
 */
export function collectTodos(journal: Journal): Map<TxnId, Todo> {
  const allTodos: Map<TxnId, Todo> = new Map()

  for (const entry of journal) {
    const tref: TRef<unknown> = entry[1].use((_) => _.tref)
    concreteTRef(tref)
    const todos = tref.todo.get
    for (const todo of todos) {
      allTodos.set(todo[0], todo[1])
    }
    tref.todo.set(emptyTodoMap)
  }

  return allTodos
}

/**
 * Executes the todos in the current thread, sequentially.
 */
export function execTodos(todos: Map<TxnId, Todo>) {
  for (const todo of todos) {
    todo[1]()
  }
}

/**
 * Runs all the todos.
 */
export function completeTodos<E, A>(
  exit: Exit<E, A>,
  journal: Journal,
  scheduler: Scheduler
): TryCommit<E, A> {
  const todos = collectTodos(journal)
  if (todos.size > 0) {
    scheduler.scheduleTask(() => execTodos(todos))
  }
  return TryCommit.done(exit)
}

/**
 * For the given transaction id, adds the specified todo effect to all
 * `TRef` values.
 */
export function addTodo(txnId: TxnId, journal: Journal, todoEffect: Todo): boolean {
  let added = false

  for (const entry of journal) {
    const tref = entry[1].use((_) => _.tref)
    concreteTRef(tref)
    const oldTodo = tref.todo.get
    if (!oldTodo.has(txnId)) {
      const newTodo = oldTodo.set(txnId, todoEffect)
      tref.todo.set(newTodo)
      added = true
    }
  }

  return added
}

/**
 * Finds all the new todo targets that are not already tracked in the
 * `oldJournal`.
 */
export function untrackedTodoTargets(
  oldJournal: Journal,
  newJournal: Journal
): Journal {
  const untracked: Journal = new Map()
  for (const entry of newJournal) {
    const key = entry[0]
    const value = entry[1]
    if (
      // We already tracked this one
      !oldJournal.has(key) &&
      // This `TRef` was created in the current transaction, so no need to
      // add any todos to it, because it cannot be modified from the outside
      // until the transaction succeeds; so any todo added to it would never
      // succeed.
      !value.use((_) => _.isNew)
    ) {
      untracked.set(key, value)
    }
  }
  return untracked
}

/**
 * Determines if the journal is valid.
 */
export function isValid(journal: Journal) {
  let valid = true
  for (const entry of journal) {
    valid = entry[1].use((_) => _.isValid())
    if (!valid) {
      return valid
    }
  }
  return valid
}

/**
 * Determines if the journal is invalid.
 */
export function isInvalid(journal: Journal) {
  return !isValid(journal)
}
