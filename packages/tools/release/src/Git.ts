import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import type { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"
import { notImplementedEffect, type ReleaseError } from "./Errors.ts"

/**
 * The git operations the version-PR flow needs. The implementation shells out
 * to `git` with the identity CI configured; it never rewrites `main`.
 */
export class Git extends Context.Service<Git, {
  /** Full SHA of `HEAD`. */
  readonly headSha: Effect.Effect<string, ReleaseError>
  /** Creates or resets the local `branch` to `from` and checks it out. */
  readonly resetBranch: (branch: string, from: string) => Effect.Effect<void, ReleaseError>
  /** Stages every change and commits; `none` when the tree was clean. */
  readonly commitAll: (message: string) => Effect.Effect<Option.Option<string>, ReleaseError>
  /** `git push --force origin <branch>`. */
  readonly pushForce: (branch: string) => Effect.Effect<void, ReleaseError>
  /** `git checkout <ref>`; used to return to the original commit afterwards. */
  readonly checkout: (ref: string) => Effect.Effect<void, ReleaseError>
}>()("@effect/release/Git") {
  static readonly layer: Layer.Layer<Git, never, ChildProcessSpawner> = Layer.effect(
    Git,
    notImplementedEffect("Git.layer")
  )
}
