import * as Scope from "../../Scope.ts"
import type { WorkflowInstance } from "../WorkflowEngine.ts"

interface ParentState {
  nextOrder: number
  maxOrder: number
  stampedSize: number
  abandoned: boolean
}

const parentStates = new WeakMap<Scope.Scope, ParentState>()
const entryOrders = new WeakMap<object, number>()

const getParentState = (parent: Scope.Scope): ParentState => {
  let state = parentStates.get(parent)
  if (state === undefined) {
    state = { nextOrder: 0, maxOrder: -1, stampedSize: 0, abandoned: false }
    parentStates.set(parent, state)
  }
  return state
}

const stampExisting = (parent: Scope.Scope, parentState: ParentState): void => {
  if (parent.state._tag !== "Open") return
  if (parent.state.finalizerKey !== undefined) {
    if (!entryOrders.has(parent.state.finalizerKey)) {
      const order = parentState.nextOrder++
      entryOrders.set(parent.state.finalizerKey, order)
      if (order > parentState.maxOrder) parentState.maxOrder = order
    }
    parentState.stampedSize = 1
    return
  }
  const finalizers = parent.state.finalizers
  if (finalizers === undefined || finalizers.size === parentState.stampedSize) return
  for (const key of finalizers.keys()) {
    if (!entryOrders.has(key)) {
      const order = parentState.nextOrder++
      entryOrders.set(key, order)
      if (order > parentState.maxOrder) parentState.maxOrder = order
    }
  }
  parentState.stampedSize = finalizers.size
}

/**
 * Marks every run under `parent` as abandoned, without the engine retaining
 * their instances.
 *
 * @internal
 */
export const markScopeAbandoned = (parent: Scope.Scope): void => {
  getParentState(parent).abandoned = true
}

/**
 * Forks the run's scope from `parent` on first access while preserving run
 * order on close, so unused runs leave nothing attached to `parent`.
 *
 * @internal
 */
export const withLazyScope = (
  instance: WorkflowInstance["Service"],
  parent: Scope.Scope
): WorkflowInstance["Service"] => {
  const parentState = getParentState(parent)
  stampExisting(parent, parentState)
  const order = parentState.nextOrder++
  let scope: Scope.Closeable | undefined
  let abandoned = instance.abandoned
  return {
    ...instance,
    get scope() {
      if (scope === undefined) {
        stampExisting(parent, parentState)
        scope = Scope.forkUnsafe(parent)
        entryOrders.set(scope, order)
        if (parent.state._tag === "Open") {
          parentState.stampedSize = parent.state.finalizers !== undefined ? parent.state.finalizers.size : 1
        }
        if (order < parentState.maxOrder && parent.state._tag === "Open" && parent.state.finalizers !== undefined) {
          const finalizer = parent.state.finalizers.get(scope)!
          parent.state.finalizers.delete(scope)
          const entries = Array.from(parent.state.finalizers)
          parent.state.finalizers.clear()
          let inserted = false
          for (const [key, fn] of entries) {
            if (!inserted && (entryOrders.get(key) ?? -1) > order) {
              parent.state.finalizers.set(scope, finalizer)
              inserted = true
            }
            parent.state.finalizers.set(key, fn)
          }
          if (!inserted) {
            parent.state.finalizers.set(scope, finalizer)
          }
        } else if (order > parentState.maxOrder) {
          parentState.maxOrder = order
        }
      }
      return scope
    },
    get abandoned() {
      return abandoned || parentState.abandoned
    },
    set abandoned(value) {
      abandoned = value
    }
  }
}
