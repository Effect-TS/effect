// ets_tracing: off

import "../../../Operator/index.js"

import * as HM from "../../../Collections/Immutable/HashMap/index.js"
import * as T from "../../../Effect/index.js"
import type { FiberID } from "../../../Fiber/index.js"
import type { AtomicBoolean } from "../../../Support/AtomicBoolean/index.js"
import { defaultScheduler } from "../../../Support/Scheduler/index.js"
import type { Atomic } from "../../TRef/index.js"
import { STMDriver } from "../_internal/driver.js"
import type { STM } from "../_internal/primitives.js"
import type { Entry } from "../Entry/index.js"
import { DieTypeId, FailTypeId, RetryTypeId, SucceedTypeId } from "../TExit/index.js"
import type { TryCommit } from "../TryCommit/index.js"
import { Done, DoneTypeId, Suspend, SuspendTypeId } from "../TryCommit/index.js"
import type { TxnId } from "../TxnId/index.js"

export type Journal = Map<Atomic<any>, Entry>

export type Todo = () => unknown

/**
 * Creates a function that can reset the journal.
 */
export function prepareResetJournal(journal: Journal): () => unknown {
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
export function analyzeJournal(journal: Journal): "I" | "RW" | "RO" {
  let val: "I" | "RW" | "RO" = "RO"
  for (const entry of journal) {
    val = entry[1].use((_) => (_.isInvalid() ? "I" : _.isChanged() ? "RW" : val))
    if (val === "I") {
      return val
    }
  }
  return val
}

export const emptyTodoMap = HM.make<TxnId, Todo>()

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
  const todosSorted = Array.from(todos.entries()).sort((x, y) => x[0] - y[0])
  for (const [_, todo] of todosSorted) {
    todo()
  }
}

/**
 * Runs all the todos.
 */
export function completeTodos<E, A>(io: T.IO<E, A>, journal: Journal): Done<E, A> {
  const todos = collectTodos(journal)
  if (todos.size > 0) {
    defaultScheduler(() => execTodos(todos))
  }
  return new Done(io)
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
    if (!HM.has_(oldTodo, txnId)) {
      const newTodo = HM.set_(oldTodo, txnId, todoEffect)
      tref.todo.set(newTodo)
      added = true
    }
  }

  return added
}

/**
 * Finds all the new todo targets that are not already tracked in the `oldJournal`.
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
  fiberId: FiberID,
  stm: STM<R, E, A>,
  r: R
): TryCommit<E, A> {
  const journal: Journal = new Map()
  const value = new STMDriver(stm, journal, fiberId, r).run()
  const analysis = analyzeJournal(journal)
  if (analysis === "RW") {
    commitJournal(journal)
  } else if (analysis === "I") {
    throw new Error("Bug: invalid journal")
  }
  switch (value._typeId) {
    case RetryTypeId: {
      return new Suspend(journal)
    }
    case SucceedTypeId: {
      return completeTodos(T.succeed(value.value), journal)
    }
    case FailTypeId: {
      return completeTodos(T.fail(value.value), journal)
    }
    case DieTypeId: {
      return completeTodos(T.die(value.value), journal)
    }
  }
}

function completeTryCommit<R, E, A>(
  io: T.IO<E, A>,
  k: (_: T.Effect<R, E, A>) => unknown,
  done: AtomicBoolean
) {
  done.set(true)
  k(io)
}
function suspendTryCommit<R, E, A>(
  fiberId: FiberID,
  stm: STM<R, E, A>,
  txnId: TxnId,
  done: AtomicBoolean,
  r: R,
  k: (_: T.Effect<R, E, A>) => unknown,
  accum: Journal,
  journal: Journal
) {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    addTodo(txnId, journal, () =>
      tryCommitAsync(undefined, fiberId, stm, txnId, done, r)(k)
    )
    if (isInvalid(journal)) {
      const v = tryCommit(fiberId, stm, r)
      switch (v._typeId) {
        case DoneTypeId: {
          completeTryCommit(v.io, k, done)
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
  fiberId: FiberID,
  stm: STM<R, E, A>,
  txnId: TxnId,
  done: AtomicBoolean,
  r: R
) {
  return (k: (_: T.Effect<R, E, A>) => unknown) => {
    if (!done.get) {
      if (journal == null) {
        const v = tryCommit(fiberId, stm, r)
        switch (v._typeId) {
          case DoneTypeId: {
            completeTryCommit(v.io, k, done)
            break
          }
          case SuspendTypeId: {
            suspendTryCommit(fiberId, stm, txnId, done, r, k, v.journal, v.journal)
            break
          }
        }
      } else {
        suspendTryCommit(fiberId, stm, txnId, done, r, k, journal, journal)
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
