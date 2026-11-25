import * as Scope from "../../Scope.ts"
import type { WorkflowInstance } from "../WorkflowEngine.ts"

interface ParentState {
  nextOrder: number
  maxOrder: number
  abandoned: boolean
}

const parentStates = new WeakMap<Scope.Scope, ParentState>()
const scopeOrders = new WeakMap<object, number>()

const getParentState = (parent: Scope.Scope): ParentState => {
  let state = parentStates.get(parent)
  if (state === undefined) {
    state = { nextOrder: 0, maxOrder: -1, abandoned: false }
    parentStates.set(parent, state)
  }
  return state
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
  const order = parentState.nextOrder++
  let scope: Scope.Closeable | undefined
  let abandoned = instance.abandoned
  return {
    ...instance,
    get scope() {
      if (scope === undefined) {
        scope = Scope.forkUnsafe(parent)
        scopeOrders.set(scope, order)
        if (order < parentState.maxOrder && parent.state._tag === "Open" && parent.state.finalizers !== undefined) {
          const entries = Array.from(parent.state.finalizers).sort(
            ([a], [b]) =>
              (scopeOrders.get(a) ?? Number.MAX_SAFE_INTEGER) - (scopeOrders.get(b) ?? Number.MAX_SAFE_INTEGER)
          )
          parent.state.finalizers.clear()
          for (const [key, fn] of entries) {
            parent.state.finalizers.set(key, fn)
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
