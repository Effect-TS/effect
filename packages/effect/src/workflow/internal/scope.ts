import * as Effect from "../../Effect.ts"
import type * as Exit from "../../Exit.ts"
import * as Scope from "../../Scope.ts"
import type { WorkflowInstance } from "../WorkflowEngine.ts"

interface LazyScopeState {
  readonly parent: Scope.Scope
  readonly onCreate?: (() => void) | undefined
  scope: Scope.Closeable | undefined
  closedExit: Exit.Exit<any, any> | undefined
}

const lazyScopes = new WeakMap<WorkflowInstance["Service"], LazyScopeState>()

/**
 * Installs a lazy child scope on `instance` so runs that never read `scope`
 * do not fork or retain a child under `parent`.
 *
 * @internal
 */
export const attachLazyScope = (
  instance: WorkflowInstance["Service"],
  parent: Scope.Scope,
  onCreate?: () => void
): WorkflowInstance["Service"] => {
  const state: LazyScopeState = { parent, onCreate, scope: undefined, closedExit: undefined }
  lazyScopes.set(instance, state)
  return Object.defineProperty(instance, "scope", {
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
          if (state.scope.state._tag !== "Closed") {
            state.onCreate?.()
          }
        }
      }
      return state.scope
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
