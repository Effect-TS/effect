import * as Scope from "../../Scope.ts"
import type { WorkflowInstance } from "../WorkflowEngine.ts"

interface ParentState {
  nextOrder: number
  maxOrder: number
  abandoned: boolean
}

const parentStates = new WeakMap<Scope.Scope, ParentState>()
const entryOrders = new WeakMap<object, number>()
const wrappedMaps = new WeakSet<Map<object, unknown>>()
let forking = false

const getParentState = (parent: Scope.Scope): ParentState => {
  let state = parentStates.get(parent)
  if (state === undefined) {
    state = { nextOrder: 0, maxOrder: -1, abandoned: false }
    parentStates.set(parent, state)
  }
  return state
}

const stampKey = (key: object, parentState: ParentState): void => {
  if (!entryOrders.has(key)) {
    const order = parentState.nextOrder++
    entryOrders.set(key, order)
    if (order > parentState.maxOrder) parentState.maxOrder = order
  }
}

const ensureTracked = (parent: Scope.Scope, parentState: ParentState): void => {
  if (parent.state._tag !== "Open") return
  if (parent.state.finalizerKey !== undefined) {
    stampKey(parent.state.finalizerKey, parentState)
    return
  }
  const finalizers = parent.state.finalizers
  if (finalizers === undefined || wrappedMaps.has(finalizers)) return
  for (const key of finalizers.keys()) {
    stampKey(key, parentState)
  }
  wrappedMaps.add(finalizers)
  finalizers.set = function(key, value) {
    if (!forking) stampKey(key, parentState)
    return Map.prototype.set.call(this, key, value)
  }
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
  ensureTracked(parent, parentState)
  const order = parentState.nextOrder++
  let scope: Scope.Closeable | undefined
  let abandoned = instance.abandoned
  return {
    ...instance,
    get scope() {
      if (scope === undefined) {
        ensureTracked(parent, parentState)
        forking = true
        try {
          scope = Scope.forkUnsafe(parent)
        } finally {
          forking = false
        }
        entryOrders.set(scope, order)
        ensureTracked(parent, parentState)
        if (order < parentState.maxOrder && parent.state._tag === "Open" && parent.state.finalizers !== undefined) {
          const finalizer = parent.state.finalizers.get(scope)!
          parent.state.finalizers.delete(scope)
          const entries = Array.from(parent.state.finalizers)
          parent.state.finalizers.clear()
          let inserted = false
          for (const [key, fn] of entries) {
            if (!inserted && (entryOrders.get(key) ?? -1) > order) {
              Map.prototype.set.call(parent.state.finalizers, scope, finalizer)
              inserted = true
            }
            Map.prototype.set.call(parent.state.finalizers, key, fn)
          }
          if (!inserted) {
            Map.prototype.set.call(parent.state.finalizers, scope, finalizer)
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
