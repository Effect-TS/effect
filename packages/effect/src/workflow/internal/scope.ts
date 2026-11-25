import * as Effect from "../../Effect.ts"
import type * as Exit from "../../Exit.ts"
import * as Scope from "../../Scope.ts"
import type { WorkflowInstance } from "../WorkflowEngine.ts"

interface LazyScopeState {
  readonly parent: Scope.Scope
  scope: Scope.Closeable | undefined
  closedExit: Exit.Exit<any, any> | undefined
}

const lazyScopes = new WeakMap<WorkflowInstance["Service"], LazyScopeState>()
const abandonedScopes = new WeakSet<Scope.Scope>()

/**
 * Marks a parent run scope as abandoned so any instance backed by it observes
 * `abandoned === true` without strongly retaining unused runs.
 *
 * @internal
 */
export const markScopeAbandoned = (scope: Scope.Scope): void => {
  abandonedScopes.add(scope)
}

/**
 * Installs a lazy child scope on `instance` so runs that never read `scope`
 * do not fork or retain a child under `parent`, while still observing
 * abandonment of `parent`.
 *
 * @internal
 */
export const attachLazyScope = (
  instance: WorkflowInstance["Service"],
  parent: Scope.Scope
): WorkflowInstance["Service"] => {
  const state: LazyScopeState = { parent, scope: undefined, closedExit: undefined }
  let abandoned = instance.abandoned
  lazyScopes.set(instance, state)
  return Object.defineProperties(instance, {
    scope: {
      enumerable: true,
      configurable: true,
      get() {
        if (state.scope === undefined) {
          if (state.closedExit !== undefined) {
            const scope = Scope.makeUnsafe()
            scope.state = { _tag: "Closed", exit: state.closedExit }
            state.scope = scope
          } else {
            state.scope = Scope.forkUnsafe(state.parent)
          }
        }
        return state.scope
      }
    },
    abandoned: {
      enumerable: true,
      configurable: true,
      get() {
        return abandoned || abandonedScopes.has(state.parent)
      },
      set(value: boolean) {
        abandoned = value
      }
    }
  })
}

/**
 * Closes `instance`'s scope without materializing one that was never accessed.
 *
 * @internal
 */
export const closeInstanceScope = (
  instance: WorkflowInstance["Service"],
  exit: Exit.Exit<any, any>
): Effect.Effect<void> => {
  const state = lazyScopes.get(instance)
  if (state === undefined) {
    return Scope.close(instance.scope, exit)
  }
  if (state.scope !== undefined) {
    return Scope.close(state.scope, exit)
  }
  state.closedExit ??= exit
  return Effect.void
}
