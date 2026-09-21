import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import type { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"
import { notImplementedEffect, type ReleaseError } from "./Errors.ts"

export interface PullRequest {
  readonly number: number
  readonly url: string
  readonly headRef: string
  readonly baseRef: string
  readonly title: string
  readonly body: string
}

/**
 * Pull-request operations against the repository the tool runs in. The
 * implementation uses the `gh` CLI with the token CI provides (`GH_TOKEN`);
 * that token must be the PAT the changesets flow used, so that checks run on
 * the version branch.
 */
export class GitHub extends Context.Service<GitHub, {
  /** The open PR from `head` into `base`, if any. */
  readonly findPullRequest: (query: {
    readonly head: string
    readonly base: string
  }) => Effect.Effect<Option.Option<PullRequest>, ReleaseError>
  readonly createPullRequest: (input: {
    readonly head: string
    readonly base: string
    readonly title: string
    readonly body: string
  }) => Effect.Effect<PullRequest, ReleaseError>
  readonly updatePullRequest: (number: number, input: {
    readonly title: string
    readonly body: string
  }) => Effect.Effect<PullRequest, ReleaseError>
}>()("@effect/release/GitHub") {
  static readonly layer: Layer.Layer<GitHub, never, ChildProcessSpawner> = Layer.effect(
    GitHub,
    notImplementedEffect("GitHub.layer")
  )
}
