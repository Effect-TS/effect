import * as Cause from "../../Cause.js"
import * as Context from "../../Context.js"
import * as Effect from "../../Effect.js"
import * as Either from "../../Either.js"
import * as Equal from "../../Equal.js"
import * as Exit from "../../Exit.js"
import type * as FiberId from "../../FiberId.js"
import * as FiberRef from "../../FiberRef.js"
import type { LazyArg } from "../../Function.js"
import { constVoid, dual, pipe } from "../../Function.js"
import * as Hash from "../../Hash.js"
import type * as Option from "../../Option.js"
import { pipeArguments } from "../../Pipeable.js"
import { hasProperty } from "../../Predicate.js"
import type * as Scheduler from "../../Scheduler.js"
import type * as STM from "../../STM.js"
import { StreamTypeId } from "../../Stream.js"
import { ChannelTypeId } from "../core-stream.js"
import { withFiberRuntime } from "../core.js"
import { effectVariance } from "../effectable.js"
import { OP_COMMIT } from "../opCodes/effect.js"
import { SinkTypeId } from "../sink.js"
import * as OpCodes from "./opCodes/stm.js"
import * as TExitOpCodes from "./opCodes/tExit.js"
import * as TryCommitOpCodes from "./opCodes/tryCommit.js"
import * as Journal from "./stm/journal.js"
import * as STMState from "./stm/stmState.js"
import * as TExit from "./stm/tExit.js"
import * as TryCommit from "./stm/tryCommit.js"
import * as TxnId from "./stm/txnId.js"

/** @internal */
const STMSymbolKey = "effect/STM"

/** @internal */
export const STMTypeId: STM.STMTypeId = Symbol.for(
  STMSymbolKey
) as STM.STMTypeId

/** @internal */
export type Primitive =
  | STMEffect
  | STMOnFailure
  | STMOnRetry
  | STMOnSuccess
  | STMProvide
  | STMSync
  | STMSucceed
  | STMRetry
  | STMFail
  | STMDie
  | STMInterrupt

/** @internal */
type Op<Tag extends string, Body = {}> = STM.STM<never, never, never> & Body & {
  readonly _tag: OP_COMMIT
  readonly i0: Tag
}

/** @internal */
interface STMEffect extends
  Op<OpCodes.OP_WITH_STM_RUNTIME, {
    readonly i1: (
      runtime: STMDriver<unknown, unknown, unknown>
    ) => STM.STM<unknown, unknown, unknown>
  }>
{}

/** @internal */
interface STMOnFailure extends
  Op<OpCodes.OP_ON_FAILURE, {
    readonly i1: STM.STM<unknown, unknown, unknown>
    readonly i2: (error: unknown) => STM.STM<unknown, unknown, unknown>
  }>
{}

/** @internal */
interface STMOnRetry extends
  Op<OpCodes.OP_ON_RETRY, {
    readonly i1: STM.STM<unknown, unknown, unknown>
    readonly i2: () => STM.STM<unknown, unknown, unknown>
  }>
{}

/** @internal */
interface STMOnSuccess extends
  Op<OpCodes.OP_ON_SUCCESS, {
    readonly i1: STM.STM<unknown, unknown, unknown>
    readonly i2: (a: unknown) => STM.STM<unknown, unknown, unknown>
  }>
{}

/** @internal */
interface STMProvide extends
  Op<OpCodes.OP_PROVIDE, {
    readonly i1: STM.STM<unknown, unknown, unknown>
    readonly i2: (context: Context.Context<unknown>) => Context.Context<unknown>
  }>
{}

/** @internal */
interface STMSync extends
  Op<OpCodes.OP_SYNC, {
    readonly i1: () => unknown
  }>
{}

/** @internal */
interface STMSucceed extends
  Op<OpCodes.OP_SUCCEED, {
    readonly i1: unknown
  }>
{}

/** @internal */
interface STMRetry extends Op<OpCodes.OP_RETRY, {}> {}

/** @internal */
interface STMFail extends
  Op<OpCodes.OP_FAIL, {
    readonly i1: LazyArg<unknown>
  }>
{}

/** @internal */
interface STMDie extends
  Op<OpCodes.OP_DIE, {
    readonly i1: LazyArg<unknown>
  }>
{}

/** @internal */
interface STMInterrupt extends
  Op<OpCodes.OP_INTERRUPT, {
    readonly i1: FiberId.Runtime
  }>
{}

const stmVariance = {
  /* c8 ignore next */
  _R: (_: never) => _,
  /* c8 ignore next */
  _E: (_: never) => _,
  /* c8 ignore next */
  _A: (_: never) => _
}

/** @internal */
class STMPrimitive implements STM.STM<any, any, any> {
  public _tag = OP_COMMIT
  public _op = OP_COMMIT
  public i1: any = undefined
  public i2: any = undefined;
  [Effect.EffectTypeId]: any;
  [StreamTypeId]: any;
  [SinkTypeId]: any;
  [ChannelTypeId]: any
  get [STMTypeId]() {
    return stmVariance
  }
  constructor(readonly i0: Primitive["i0"]) {
    this[Effect.EffectTypeId] = effectVariance
    this[StreamTypeId] = stmVariance
    this[SinkTypeId] = stmVariance
    this[ChannelTypeId] = stmVariance
  }
  [Equal.symbol](this: {}, that: unknown) {
    return this === that
  }
  [Hash.symbol](this: {}) {
    return Hash.random(this)
  }
  commit(this: STM.STM<any, any, any>): Effect.Effect<any, any, any> {
    return unsafeAtomically(this, constVoid, constVoid)
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const isSTM = (u: unknown): u is STM.STM<unknown, unknown, unknown> => hasProperty(u, STMTypeId)

/** @internal */
export const commit = <R, E, A>(self: STM.STM<R, E, A>): Effect.Effect<R, E, A> =>
  unsafeAtomically(self, constVoid, constVoid)

/** @internal */
export const unsafeAtomically = <R, E, A>(
  self: STM.STM<R, E, A>,
  onDone: (exit: Exit.Exit<E, A>) => unknown,
  onInterrupt: LazyArg<unknown>
): Effect.Effect<R, E, A> =>
  withFiberRuntime<R, E, A>((state) => {
    const fiberId = state.id()
    const env = state.getFiberRef(FiberRef.currentContext) as Context.Context<R>
    const scheduler = state.getFiberRef(FiberRef.currentScheduler)
    const priority = state.getFiberRef(FiberRef.currentSchedulingPriority)
    const commitResult = tryCommitSync(fiberId, self, env, scheduler, priority)
    switch (commitResult._tag) {
      case TryCommitOpCodes.OP_DONE: {
        onDone(commitResult.exit)
        return commitResult.exit
      }
      case TryCommitOpCodes.OP_SUSPEND: {
        const txnId = TxnId.make()
        const state: { value: STMState.STMState<E, A> } = { value: STMState.running }
        const effect = Effect.async(
          (k: (effect: Effect.Effect<R, E, A>) => unknown): void =>
            tryCommitAsync(fiberId, self, txnId, state, env, scheduler, priority, k)
        )
        return Effect.uninterruptibleMask((restore) =>
          pipe(
            restore(effect),
            Effect.catchAllCause((cause) => {
              let currentState = state.value
              if (STMState.isRunning(currentState)) {
                state.value = STMState.interrupted
              }
              currentState = state.value
              if (STMState.isDone(currentState)) {
                onDone(currentState.exit)
                return currentState.exit
              }
              onInterrupt()
              return Effect.failCause(cause)
            })
          )
        )
      }
    }
  })

/** @internal */
const tryCommit = <R, E, A>(
  fiberId: FiberId.FiberId,
  stm: STM.STM<R, E, A>,
  state: { value: STMState.STMState<E, A> },
  env: Context.Context<R>,
  scheduler: Scheduler.Scheduler,
  priority: number
): TryCommit.TryCommit<E, A> => {
  const journal: Journal.Journal = new Map()
  const tExit = new STMDriver(stm, journal, fiberId, env).run()
  const analysis = Journal.analyzeJournal(journal)

  if (analysis === Journal.JournalAnalysisReadWrite) {
    Journal.commitJournal(journal)
  } else if (analysis === Journal.JournalAnalysisInvalid) {
    throw new Error(
      "BUG: STM.TryCommit.tryCommit - please report an issue at https://github.com/Effect-TS/effect/issues"
    )
  }

  switch (tExit._tag) {
    case TExitOpCodes.OP_SUCCEED: {
      state.value = STMState.fromTExit(tExit)
      return completeTodos(Exit.succeed(tExit.value), journal, scheduler, priority)
    }
    case TExitOpCodes.OP_FAIL: {
      state.value = STMState.fromTExit(tExit)
      const cause = Cause.fail(tExit.error)
      return completeTodos(
        Exit.failCause(cause),
        journal,
        scheduler,
        priority
      )
    }
    case TExitOpCodes.OP_DIE: {
      state.value = STMState.fromTExit(tExit)
      const cause = Cause.die(tExit.defect)
      return completeTodos(
        Exit.failCause(cause),
        journal,
        scheduler,
        priority
      )
    }
    case TExitOpCodes.OP_INTERRUPT: {
      state.value = STMState.fromTExit(tExit)
      const cause = Cause.interrupt(fiberId)
      return completeTodos(
        Exit.failCause(cause),
        journal,
        scheduler,
        priority
      )
    }
    case TExitOpCodes.OP_RETRY: {
      return TryCommit.suspend(journal)
    }
  }
}

/** @internal */
const tryCommitSync = <R, E, A>(
  fiberId: FiberId.FiberId,
  stm: STM.STM<R, E, A>,
  env: Context.Context<R>,
  scheduler: Scheduler.Scheduler,
  priority: number
): TryCommit.TryCommit<E, A> => {
  const journal: Journal.Journal = new Map()
  const tExit = new STMDriver(stm, journal, fiberId, env).run()
  const analysis = Journal.analyzeJournal(journal)

  if (analysis === Journal.JournalAnalysisReadWrite && TExit.isSuccess(tExit)) {
    Journal.commitJournal(journal)
  } else if (analysis === Journal.JournalAnalysisInvalid) {
    throw new Error(
      "BUG: STM.TryCommit.tryCommitSync - please report an issue at https://github.com/Effect-TS/effect/issues"
    )
  }

  switch (tExit._tag) {
    case TExitOpCodes.OP_SUCCEED: {
      return completeTodos(Exit.succeed(tExit.value), journal, scheduler, priority)
    }
    case TExitOpCodes.OP_FAIL: {
      const cause = Cause.fail(tExit.error)
      return completeTodos(
        Exit.failCause(cause),
        journal,
        scheduler,
        priority
      )
    }
    case TExitOpCodes.OP_DIE: {
      const cause = Cause.die(tExit.defect)
      return completeTodos(
        Exit.failCause(cause),
        journal,
        scheduler,
        priority
      )
    }
    case TExitOpCodes.OP_INTERRUPT: {
      const cause = Cause.interrupt(fiberId)
      return completeTodos(
        Exit.failCause(cause),
        journal,
        scheduler,
        priority
      )
    }
    case TExitOpCodes.OP_RETRY: {
      return TryCommit.suspend(journal)
    }
  }
}

/** @internal */
const tryCommitAsync = <R, E, A>(
  fiberId: FiberId.FiberId,
  self: STM.STM<R, E, A>,
  txnId: TxnId.TxnId,
  state: { value: STMState.STMState<E, A> },
  context: Context.Context<R>,
  scheduler: Scheduler.Scheduler,
  priority: number,
  k: (effect: Effect.Effect<R, E, A>) => unknown
) => {
  if (STMState.isRunning(state.value)) {
    const result = tryCommit(fiberId, self, state, context, scheduler, priority)
    switch (result._tag) {
      case TryCommitOpCodes.OP_DONE: {
        completeTryCommit(result.exit, k)
        break
      }
      case TryCommitOpCodes.OP_SUSPEND: {
        Journal.addTodo(
          txnId,
          result.journal,
          () => tryCommitAsync(fiberId, self, txnId, state, context, scheduler, priority, k)
        )
        break
      }
    }
  }
}

/** @internal */
const completeTodos = <E, A>(
  exit: Exit.Exit<E, A>,
  journal: Journal.Journal,
  scheduler: Scheduler.Scheduler,
  priority: number
): TryCommit.TryCommit<E, A> => {
  const todos = Journal.collectTodos(journal)
  if (todos.size > 0) {
    scheduler.scheduleTask(() => Journal.execTodos(todos), priority)
  }
  return TryCommit.done(exit)
}

/** @internal */
const completeTryCommit = <R, E, A>(
  exit: Exit.Exit<E, A>,
  k: (effect: Effect.Effect<R, E, A>) => unknown
): void => {
  k(exit)
}

/** @internal */
type Continuation = STMOnFailure | STMOnSuccess | STMOnRetry

/** @internal */
export const context = <R>(): STM.STM<R, never, Context.Context<R>> =>
  effect<R, Context.Context<R>>((_, __, env) => env)

/** @internal */
export const contextWith = <R0, R>(f: (environment: Context.Context<R0>) => R): STM.STM<R0, never, R> =>
  map(context<R0>(), f)

/** @internal */
export const contextWithSTM = <R0, R, E, A>(
  f: (environment: Context.Context<R0>) => STM.STM<R, E, A>
): STM.STM<R0 | R, E, A> => flatMap(context<R0>(), f)

/** @internal */
export class STMDriver<in out R, out E, out A> {
  private contStack: Array<Continuation> = []
  private env: Context.Context<unknown>

  constructor(
    readonly self: STM.STM<R, E, A>,
    readonly journal: Journal.Journal,
    readonly fiberId: FiberId.FiberId,
    r0: Context.Context<R>
  ) {
    this.env = r0 as Context.Context<unknown>
  }

  getEnv(): Context.Context<R> {
    return this.env
  }

  pushStack(cont: Continuation) {
    this.contStack.push(cont)
  }

  popStack() {
    return this.contStack.pop()
  }

  nextSuccess() {
    let current = this.popStack()
    while (current !== undefined && current.i0 !== OpCodes.OP_ON_SUCCESS) {
      current = this.popStack()
    }
    return current
  }

  nextFailure() {
    let current = this.popStack()
    while (current !== undefined && current.i0 !== OpCodes.OP_ON_FAILURE) {
      current = this.popStack()
    }
    return current
  }

  nextRetry() {
    let current = this.popStack()
    while (current !== undefined && current.i0 !== OpCodes.OP_ON_RETRY) {
      current = this.popStack()
    }
    return current
  }

  run(): TExit.TExit<E, A> {
    let curr = this.self as Primitive | Context.Tag<any, any> | Either.Either<any, any> | Option.Option<any> | undefined
    let exit: TExit.TExit<unknown, unknown> | undefined = undefined
    while (exit === undefined && curr !== undefined) {
      try {
        const current = curr
        if (current) {
          switch (current._tag) {
            case "Tag": {
              curr = effect((_, __, env) => Context.unsafeGet(env, current)) as Primitive
              break
            }
            case "Left": {
              curr = fail(current.left) as Primitive
              break
            }
            case "None": {
              curr = fail(new Cause.NoSuchElementException()) as Primitive
              break
            }
            case "Right": {
              curr = succeed(current.right) as Primitive
              break
            }
            case "Some": {
              curr = succeed(current.value) as Primitive
              break
            }
            case "Commit": {
              switch (current.i0) {
                case OpCodes.OP_DIE: {
                  exit = TExit.die(current.i1())
                  break
                }
                case OpCodes.OP_FAIL: {
                  const cont = this.nextFailure()
                  if (cont === undefined) {
                    exit = TExit.fail(current.i1())
                  } else {
                    curr = cont.i2(current.i1()) as Primitive
                  }
                  break
                }
                case OpCodes.OP_RETRY: {
                  const cont = this.nextRetry()
                  if (cont === undefined) {
                    exit = TExit.retry
                  } else {
                    curr = cont.i2() as Primitive
                  }
                  break
                }
                case OpCodes.OP_INTERRUPT: {
                  exit = TExit.interrupt(this.fiberId)
                  break
                }
                case OpCodes.OP_WITH_STM_RUNTIME: {
                  curr = current.i1(this as STMDriver<unknown, unknown, unknown>) as Primitive
                  break
                }
                case OpCodes.OP_ON_SUCCESS:
                case OpCodes.OP_ON_FAILURE:
                case OpCodes.OP_ON_RETRY: {
                  this.pushStack(current)
                  curr = current.i1 as Primitive
                  break
                }
                case OpCodes.OP_PROVIDE: {
                  const env = this.env
                  this.env = current.i2(env)
                  curr = pipe(
                    current.i1,
                    ensuring(sync(() => (this.env = env)))
                  ) as Primitive
                  break
                }
                case OpCodes.OP_SUCCEED: {
                  const value = current.i1
                  const cont = this.nextSuccess()
                  if (cont === undefined) {
                    exit = TExit.succeed(value)
                  } else {
                    curr = cont.i2(value) as Primitive
                  }
                  break
                }
                case OpCodes.OP_SYNC: {
                  const value = current.i1()
                  const cont = this.nextSuccess()
                  if (cont === undefined) {
                    exit = TExit.succeed(value)
                  } else {
                    curr = cont.i2(value) as Primitive
                  }
                  break
                }
              }
              break
            }
          }
        }
      } catch (e) {
        curr = die(e) as Primitive
      }
    }
    return exit as TExit.TExit<E, A>
  }
}

/** @internal */
export const catchAll = dual<
  <E, R1, E1, B>(
    f: (e: E) => STM.STM<R1, E1, B>
  ) => <R, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R1 | R, E1, B | A>,
  <R, A, E, R1, E1, B>(
    self: STM.STM<R, E, A>,
    f: (e: E) => STM.STM<R1, E1, B>
  ) => STM.STM<R1 | R, E1, B | A>
>(2, (self, f) => {
  const stm = new STMPrimitive(OpCodes.OP_ON_FAILURE)
  stm.i1 = self
  stm.i2 = f
  return stm
})

/** @internal */
export const mapInputContext = dual<
  <R0, R>(
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => <E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R0, E, A>,
  <E, A, R0, R>(
    self: STM.STM<R, E, A>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => STM.STM<R0, E, A>
>(2, (self, f) => {
  const stm = new STMPrimitive(OpCodes.OP_PROVIDE)
  stm.i1 = self
  stm.i2 = f
  return stm
})

/** @internal */
export const die = (defect: unknown): STM.STM<never, never, never> => dieSync(() => defect)

/** @internal */
export const dieMessage = (message: string): STM.STM<never, never, never> =>
  dieSync(() => new Cause.RuntimeException(message))

/** @internal */
export const dieSync = (evaluate: LazyArg<unknown>): STM.STM<never, never, never> => {
  const stm = new STMPrimitive(OpCodes.OP_DIE)
  stm.i1 = evaluate
  return stm as any
}

/** @internal */
export const effect = <R, A>(
  f: (journal: Journal.Journal, fiberId: FiberId.FiberId, environment: Context.Context<R>) => A
): STM.STM<R, never, A> => withSTMRuntime((_) => succeed(f(_.journal, _.fiberId, _.getEnv())))

/** @internal */
export const ensuring = dual<
  <R1, B>(finalizer: STM.STM<R1, never, B>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R1 | R, E, A>,
  <R, E, A, R1, B>(self: STM.STM<R, E, A>, finalizer: STM.STM<R1, never, B>) => STM.STM<R1 | R, E, A>
>(2, (self, finalizer) =>
  matchSTM(self, {
    onFailure: (e) => zipRight(finalizer, fail(e)),
    onSuccess: (a) => zipRight(finalizer, succeed(a))
  }))

/** @internal */
export const fail = <E>(error: E): STM.STM<never, E, never> => failSync(() => error)

/** @internal */
export const failSync = <E>(evaluate: LazyArg<E>): STM.STM<never, E, never> => {
  const stm = new STMPrimitive(OpCodes.OP_FAIL)
  stm.i1 = evaluate
  return stm as any
}

/** @internal */
export const flatMap = dual<
  <A, R1, E1, A2>(f: (a: A) => STM.STM<R1, E1, A2>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R1 | R, E1 | E, A2>,
  <R, E, A, R1, E1, A2>(self: STM.STM<R, E, A>, f: (a: A) => STM.STM<R1, E1, A2>) => STM.STM<R1 | R, E1 | E, A2>
>(2, (self, f) => {
  const stm = new STMPrimitive(OpCodes.OP_ON_SUCCESS)
  stm.i1 = self
  stm.i2 = f
  return stm
})

/** @internal */
export const matchSTM = dual<
  <E, R1, E1, A1, A, R2, E2, A2>(
    options: {
      readonly onFailure: (e: E) => STM.STM<R1, E1, A1>
      readonly onSuccess: (a: A) => STM.STM<R2, E2, A2>
    }
  ) => <R>(self: STM.STM<R, E, A>) => STM.STM<R1 | R2 | R, E1 | E2, A1 | A2>,
  <R, E, R1, E1, A1, A, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    options: {
      readonly onFailure: (e: E) => STM.STM<R1, E1, A1>
      readonly onSuccess: (a: A) => STM.STM<R2, E2, A2>
    }
  ) => STM.STM<R1 | R2 | R, E1 | E2, A1 | A2>
>(2, <R, E, R1, E1, A1, A, R2, E2, A2>(
  self: STM.STM<R, E, A>,
  { onFailure, onSuccess }: {
    readonly onFailure: (e: E) => STM.STM<R1, E1, A1>
    readonly onSuccess: (a: A) => STM.STM<R2, E2, A2>
  }
): STM.STM<R1 | R2 | R, E1 | E2, A1 | A2> =>
  pipe(
    self,
    map(Either.right),
    catchAll((e) => pipe(onFailure(e), map(Either.left))),
    flatMap((either): STM.STM<R | R1 | R2, E1 | E2, A1 | A2> => {
      switch (either._tag) {
        case "Left": {
          return succeed(either.left)
        }
        case "Right": {
          return onSuccess(either.right)
        }
      }
    })
  ))

/** @internal */
export const withSTMRuntime = <R, E, A>(
  f: (runtime: STMDriver<unknown, unknown, unknown>) => STM.STM<R, E, A>
): STM.STM<R, E, A> => {
  const stm = new STMPrimitive(OpCodes.OP_WITH_STM_RUNTIME)
  stm.i1 = f
  return stm
}

/** @internal */
export const interrupt: STM.STM<never, never, never> = withSTMRuntime((_) => {
  const stm = new STMPrimitive(OpCodes.OP_INTERRUPT)
  stm.i1 = _.fiberId
  return stm as any
})

/** @internal */
export const interruptAs = (fiberId: FiberId.FiberId): STM.STM<never, never, never> => {
  const stm = new STMPrimitive(OpCodes.OP_INTERRUPT)
  stm.i1 = fiberId
  return stm as any
}

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, B>,
  <R, E, A, B>(self: STM.STM<R, E, A>, f: (a: A) => B) => STM.STM<R, E, B>
>(2, (self, f) => pipe(self, flatMap((a) => sync(() => f(a)))))

/** @internal */
export const orTry = dual<
  <R1, E1, A1>(
    that: LazyArg<STM.STM<R1, E1, A1>>
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R1 | R, E1 | E, A1 | A>,
  <R, E, A, R1, E1, A1>(
    self: STM.STM<R, E, A>,
    that: LazyArg<STM.STM<R1, E1, A1>>
  ) => STM.STM<R1 | R, E1 | E, A1 | A>
>(2, (self, that) => {
  const stm = new STMPrimitive(OpCodes.OP_ON_RETRY)
  stm.i1 = self
  stm.i2 = that
  return stm
})

/** @internal */
export const retry: STM.STM<never, never, never> = new STMPrimitive(OpCodes.OP_RETRY)

/** @internal */
export const succeed = <A>(value: A): STM.STM<never, never, A> => {
  const stm = new STMPrimitive(OpCodes.OP_SUCCEED)
  stm.i1 = value
  return stm as any
}

/** @internal */
export const sync = <A>(evaluate: () => A): STM.STM<never, never, A> => {
  const stm = new STMPrimitive(OpCodes.OP_SYNC)
  stm.i1 = evaluate
  return stm as any
}

/** @internal */
export const zip = dual<
  <R1, E1, A1>(
    that: STM.STM<R1, E1, A1>
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R1 | R, E1 | E, [A, A1]>,
  <R, E, A, R1, E1, A1>(
    self: STM.STM<R, E, A>,
    that: STM.STM<R1, E1, A1>
  ) => STM.STM<R1 | R, E1 | E, [A, A1]>
>(2, (self, that) => pipe(self, zipWith(that, (a, a1) => [a, a1])))

/** @internal */
export const zipLeft = dual<
  <R1, E1, A1>(that: STM.STM<R1, E1, A1>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R1 | R, E1 | E, A>,
  <R, E, A, R1, E1, A1>(self: STM.STM<R, E, A>, that: STM.STM<R1, E1, A1>) => STM.STM<R1 | R, E1 | E, A>
>(2, (self, that) => pipe(self, flatMap((a) => pipe(that, map(() => a)))))

/** @internal */
export const zipRight = dual<
  <R1, E1, A1>(that: STM.STM<R1, E1, A1>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R1 | R, E1 | E, A1>,
  <R, E, A, R1, E1, A1>(self: STM.STM<R, E, A>, that: STM.STM<R1, E1, A1>) => STM.STM<R1 | R, E1 | E, A1>
>(2, (self, that) => pipe(self, flatMap(() => that)))

/** @internal */
export const zipWith = dual<
  <R1, E1, A1, A, A2>(
    that: STM.STM<R1, E1, A1>,
    f: (a: A, b: A1) => A2
  ) => <R, E>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R1 | R, E1 | E, A2>,
  <R, E, R1, E1, A1, A, A2>(
    self: STM.STM<R, E, A>,
    that: STM.STM<R1, E1, A1>,
    f: (a: A, b: A1) => A2
  ) => STM.STM<R1 | R, E1 | E, A2>
>(
  3,
  (self, that, f) => pipe(self, flatMap((a) => pipe(that, map((b) => f(a, b)))))
)
