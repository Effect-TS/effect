import * as Scope from "../../Scope.ts"
import type { WorkflowInstance } from "../WorkflowEngine.ts"

const abandonedScopes = new WeakSet<Scope.Scope>()

/**
 * Marks every run under `parent` as abandoned, without the engine retaining
 * their instances.
 *
 * @internal
 */
export const markScopeAbandoned = (parent: Scope.Scope): void => {
  abandonedScopes.add(parent)
}

/**
 * Forks the run's scope from `parent` on first access, so a run that never
 * uses its scope leaves nothing attached to `parent`.
 *
 * Attachment happens on first read rather than at run start, so a scope first
 * read after a newer run has already forked closes in reverse first-use order
 * when `parent` closes.
 *
 * @internal
 */
export const withLazyScope = (
  instance: WorkflowInstance["Service"],
  parent: Scope.Scope
): WorkflowInstance["Service"] => {
  let scope: Scope.Closeable | undefined
  let abandoned = instance.abandoned
  return {
    ...instance,
    get scope() {
      return scope ??= Scope.forkUnsafe(parent)
    },
    get abandoned() {
      return abandoned || abandonedScopes.has(parent)
    },
    set abandoned(value) {
      abandoned = value
    }
  }
}
