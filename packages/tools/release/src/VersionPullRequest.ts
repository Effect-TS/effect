import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type { ReleaseError } from "./Errors.ts"
import { Git, withRestoredHead } from "./Git.ts"
import { GitHub, type PullRequest, upsertPullRequest } from "./GitHub.ts"
import { Pnpm } from "./Pnpm.ts"
import { effectiveReleases, prereleaseTag, type ReleasePlan } from "./ReleasePlan.ts"

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
export const title = (plan: ReleasePlan): string =>
  Option.match(prereleaseTag(plan), {
    onNone: () => TITLE,
    onSome: (tag) => `${TITLE} (${tag})`
  })

/**
 * Markdown body: {@link BODY_INTRO}, then a `## Releases` section with one
 * line per effective release in the form
 * `` - `<name>`: <currentVersion> → <newVersion> (<bumpType>) ``. No-op
 * releases are omitted. Deterministic for a given plan.
 */
export const body = (plan: ReleasePlan): string => {
  const lines = effectiveReleases(plan).map((release) =>
    `- \`${release.name}\`: ${release.currentVersion} → ${release.newVersion} (${release.bumpType})`
  )
  return `${BODY_INTRO}\n\n## Releases\n\n${lines.join("\n")}\n`
}

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
export const sync = (plan: ReleasePlan): Effect.Effect<SyncResult, ReleaseError, Git | Pnpm | GitHub> =>
  Effect.gen(function*() {
    const git = yield* Git
    const pnpm = yield* Pnpm
    const github = yield* GitHub
    return yield* withRestoredHead(
      git,
      Effect.gen(function*() {
        yield* git.resetBranch(RELEASE_BRANCH, BASE_BRANCH)
        yield* pnpm.applyVersions
        const commit = yield* git.commitAll(COMMIT_MESSAGE)
        if (Option.isNone(commit)) {
          return { _tag: "NoChanges" } as const
        }
        yield* git.pushForce(RELEASE_BRANCH)
        const existing = yield* github.findPullRequest({ head: RELEASE_BRANCH, base: BASE_BRANCH })
        return yield* upsertPullRequest(github, {
          head: RELEASE_BRANCH,
          base: BASE_BRANCH,
          existing,
          title: title(plan),
          body: body(plan)
        })
      })
    )
  })
