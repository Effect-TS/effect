// tracing: off

import "../../../Operator"

import * as HM from "../../../Collections/Immutable/HashMap"
import * as T from "../../../Effect"
import type { FiberID } from "../../../Fiber"
import type { AtomicBoolean } from "../../../Support/AtomicBoolean"
import { AtomicNumber } from "../../../Support/AtomicNumber"
import type { Atomic } from "../../TRef"
import type { Entry } from "../Entry"
import type { TExit } from "../TExit"
import { FailTypeId, RetryTypeId, SucceedTypeId } from "../TExit"
import type { TryCommit } from "../TryCommit"
import { Done, DoneTypeId, Suspend, SuspendTypeId } from "../TryCommit"
import type { TxnId } from "../TxnId"

export type Journal = Map<Atomic<any>, Entry>

export type Todo = () => unknown

export const STMTypeId = Symbol()
export type STMTypeId = typeof STMTypeId

/**
 * `STM<R, E, A>` represents an effect that can be performed transactionally,
 *  resulting in a failure `E` or a value `A` that may require an environment
 *  `R` to execute.
 *
 * Software Transactional Memory is a technique which allows composition of arbitrary atomic operations.  It is
 *  the software analog of transactions in database systems.
 *
 * The API is lifted directly from the Haskell package Control.Concurrent.STM although the implementation does not
 *  resemble the Haskell one at all.
 *  [[http://hackage.haskell.org/package/stm-2.5.0.0/docs/Control-Concurrent-STM.html]]
 *
 * STM in Haskell was introduced in:
 *  Composable memory transactions, by Tim Harris, Simon Marlow, Simon Peyton Jones, and Maurice Herlihy, in ACM
 *  Conference on Principles and Practice of Parallel Programming 2005.
 *  [[https://www.microsoft.com/en-us/research/publication/composable-memory-transactions/]]
 *
 * See also:
 *  Lock Free Data Structures using STMs in Haskell, by Anthony Discolo, Tim Harris, Simon Marlow, Simon Peyton Jones,
 *  Satnam Singh) FLOPS 2006: Eighth International Symposium on Functional and Logic Programming, Fuji Susono, JAPAN,
 *  April 2006
 *  [[https://www.microsoft.com/en-us/research/publication/lock-free-data-structures-using-stms-in-haskell/]]
 *
 * The implemtation is based on the ZIO STM module, while JS environments have no race conditions from multiple threads
 *  STM provides greater benefits for syncronisation of Fibers and transactional data-types can be quite useful.
 */
export class STM<R, E, A> {
  readonly _typeId: STMTypeId = STMTypeId
  constructor(
    readonly exec: (
      journal: Journal,
      fiberId: FiberID,
      stackSize: AtomicNumber,
      r: R
    ) => TExit<E, A>
  ) {}
}

export const ResumableTypeId = Symbol()
export type ResumableTypeId = typeof ResumableTypeId

export class Resumable<E, E1, A, B> {
  readonly _typeId: ResumableTypeId = ResumableTypeId
  constructor(
    readonly stm: STM<unknown, E, A>,
    readonly stack: Array<(_: TExit<E, A>) => STM<unknown, E1, B>>
  ) {}
}

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

export function run<R, E, A>(
  self: STM<R, E, A>,
  journal: Journal,
  fiberId: FiberID,
  r: R
) {
  type Cont = (_: TExit<unknown, unknown>) => STM<unknown, unknown, unknown>
  const stackSize = new AtomicNumber(0)
  const stack = new Array<Cont>()
  let current = self as STM<R, unknown, unknown>
  let result = (undefined as unknown) as TExit<unknown, unknown>
  while (result == null) {
    try {
      const v = current.exec(journal, fiberId, stackSize, r)
      if (stack.length === 0) {
        result = v
      } else {
        const next = stack.pop()!
        current = next(v)
      }
    } catch (e) {
      if (e instanceof Resumable) {
        current = e.stm
        while (e.stack.length > 0) {
          stack.push(e.stack.pop()!)
        }
        stackSize.set(0)
      } else {
        throw e
      }
    }
  }
  return result as TExit<E, A>
}

export const emptyTodoMap = HM.make<TxnId, Todo>(
  {
    equals: (x, y) => x === y
  },
  {
    hash: (_) => _
  }
)

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
 */
export function completeTodos<E, A>(io: T.IO<E, A>, journal: Journal): Done<E, A> {
  const todos = collectTodos(journal)
  if (todos.size > 0) {
    Promise.resolve(todos).then(execTodos)
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
  const value = run(stm, journal, fiberId, r)
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
