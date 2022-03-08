import { HashMap } from "../../collection/immutable/HashMap"
import type { Lazy } from "../../data/Function"
import { Effect } from "../../io/Effect"
import { Exit } from "../../io/Exit"
import type { FiberId } from "../../io/FiberId"
import type { AtomicReference } from "../../support/AtomicReference"
import { defaultScheduler } from "../../support/Scheduler"
import type { Atomic } from "../TRef/Atomic"
import type { STM } from "./definition"
import type { Entry } from "./Entry"
import { STMDriver } from "./operations/_internal/STMDriver"
import { State } from "./State"
import {
  DieTypeId,
  FailTypeId,
  InterruptTypeId,
  RetryTypeId,
  SucceedTypeId
} from "./TExit"
import { DoneTypeId, SuspendTypeId, TryCommit } from "./TryCommit"
import type { TxnId } from "./TxnId"

export type Journal = Map<Atomic<any>, Entry>

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
    const tref: Atomic<unknown> = entry[1].use((_) => _.tref as Atomic<unknown>)
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
 *
 * @tsplus fluent ets/Journal completeTodos
 */
export function completeTodos<E, A>(
  exit: Exit<E, A>,
  journal: Journal
): TryCommit<E, A> {
  const todos = collectTodos(journal)
  if (todos.size > 0) {
    defaultScheduler(() => execTodos(todos))
  }
  return TryCommit.Done(exit)
}

/**
 * For the given transaction id, adds the specified todo effect to all
 * `TRef` values.
 */
export function addTodo(txnId: TxnId, journal: Journal, todoEffect: Todo): boolean {
  let added = false

  for (const entry of journal) {
    const tref = entry[1].use((_) => _.tref as Atomic<unknown>)
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

export function tryCommit<R, E, A>(
  fiberId: FiberId,
  stm: STM<R, E, A>,
  state: AtomicReference<State<E, A>>,
  r: R
): TryCommit<E, A> {
  const journal: Journal = new Map()
  const value = new STMDriver(stm, journal, fiberId, r).run()
  const analysis = analyzeJournal(journal)

  if (analysis === "RW") {
    state.compareAndSet(State.Running, State.Done(value))
    commitJournal(journal)
  } else if (analysis === "I") {
    throw new Error("Bug: invalid journal")
  }

  switch (value._typeId) {
    case SucceedTypeId: {
      return completeTodos(Exit.succeed(value.value), journal)
    }
    case FailTypeId: {
      return completeTodos(Exit.fail(value.value), journal)
    }
    case DieTypeId: {
      return completeTodos(Exit.die(value.value), journal)
    }
    case InterruptTypeId: {
      return completeTodos(Exit.interrupt(fiberId), journal)
    }
    case RetryTypeId: {
      return TryCommit.Suspend(journal)
    }
  }
}

export function tryCommitSync<R, E, A>(
  fiberId: FiberId,
  stm: STM<R, E, A>,
  r: R
): TryCommit<E, A> {
  const journal: Journal = new Map()
  const value = new STMDriver(stm, journal, fiberId, r).run()
  const analysis = analyzeJournal(journal)

  if (analysis === "RW" && value._typeId === SucceedTypeId) {
    commitJournal(journal)
  } else if (analysis === "I") {
    throw new Error("Bug: invalid journal")
  }

  switch (value._typeId) {
    case SucceedTypeId: {
      return completeTodos(Exit.succeed(value.value), journal)
    }
    case FailTypeId: {
      return completeTodos(Exit.fail(value.value), journal)
    }
    case DieTypeId: {
      return completeTodos(Exit.die(value.value), journal)
    }
    case InterruptTypeId: {
      return completeTodos(Exit.interrupt(fiberId), journal)
    }
    case RetryTypeId: {
      return TryCommit.Suspend(journal)
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
  r: R,
  k: (_: Effect<R, E, A>) => unknown,
  accum: Journal,
  journal: Journal
) {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    addTodo(txnId, journal, () =>
      tryCommitAsync(undefined, fiberId, stm, txnId, state, r)(k)
    )
    if (isInvalid(journal)) {
      const v = tryCommit(fiberId, stm, state, r)
      switch (v._typeId) {
        case DoneTypeId: {
          completeTryCommit(v.exit, k)
          return
        }
        case SuspendTypeId: {
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
  r: R
) {
  return (k: (_: Effect<R, E, A>) => unknown) => {
    if (state.get.isRunning()) {
      if (journal == null) {
        const v = tryCommit(fiberId, stm, state, r)
        switch (v._typeId) {
          case DoneTypeId: {
            completeTryCommit(v.exit, k)
            break
          }
          case SuspendTypeId: {
            suspendTryCommit(fiberId, stm, txnId, state, r, k, v.journal, v.journal)
            break
          }
        }
      } else {
        suspendTryCommit(fiberId, stm, txnId, state, r, k, journal, journal)
      }
    }
  }
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
