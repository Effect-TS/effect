import type * as Effect from "effect/Effect"
import { notImplemented, notImplementedEffect, type ReleaseError } from "./Errors.ts"
import type { Git } from "./Git.ts"
import type { GitHub, PullRequest } from "./GitHub.ts"
import type { Pnpm } from "./Pnpm.ts"
import type { ReleasePlan } from "./ReleasePlan.ts"

/** Same branch the changesets action used, so existing branch protection and tooling keep working. */
export const RELEASE_BRANCH = "changeset-release/main"
export const BASE_BRANCH = "main"
export const COMMIT_MESSAGE = "Version Packages"
export const TITLE = "Version Packages"

/** First paragraph of every version PR body; the rest is generated. */
export const BODY_INTRO =
  "This PR was opened by the release workflow. Merging it applies the version bumps, changelogs and " +
  "`.changeset/ledger.yaml` below to `main`. The packages are then staged on npm and become public only " +
  "after a maintainer approves the staged versions."

/**
 * `Version Packages`, or `Version Packages (<tag>)` when
 * `ReleasePlan.prereleaseTag` is defined (for example `Version Packages (rc)`).
 */
export const title = (_plan: ReleasePlan): string => notImplemented("VersionPullRequest.title")

/**
 * Markdown body: {@link BODY_INTRO}, then a `## Releases` section with one
 * line per effective release in the form
 * `` - `<name>`: <currentVersion> → <newVersion> (<bumpType>) ``. No-op
 * releases are omitted. Deterministic for a given plan.
 */
export const body = (_plan: ReleasePlan): string => notImplemented("VersionPullRequest.body")

export type SyncResult =
  | { readonly _tag: "Created"; readonly pullRequest: PullRequest }
  | { readonly _tag: "Updated"; readonly pullRequest: PullRequest }
  /** Applying the plan changed no file; nothing was pushed or opened. */
  | { readonly _tag: "NoChanges" }

/**
 * Creates or refreshes the version PR for `plan`:
 *
 * 1. remember `Git.headSha`;
 * 2. `Git.resetBranch(RELEASE_BRANCH, BASE_BRANCH)`;
 * 3. `Pnpm.applyVersions`;
 * 4. `Git.commitAll(COMMIT_MESSAGE)`; when it returns `none`, stop with `NoChanges`;
 * 5. `Git.pushForce(RELEASE_BRANCH)`;
 * 6. `GitHub.findPullRequest({ head: RELEASE_BRANCH, base: BASE_BRANCH })`,
 *    then `updatePullRequest` with the fresh title and body, or `createPullRequest`;
 * 7. always, even on failure, `Git.checkout` of the SHA from step 1.
 */
export const sync = (_plan: ReleasePlan): Effect.Effect<SyncResult, ReleaseError, Git | Pnpm | GitHub> =>
  notImplementedEffect("VersionPullRequest.sync")
