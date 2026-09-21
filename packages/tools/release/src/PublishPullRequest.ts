import type * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import type * as Option from "effect/Option"
import type * as Path from "effect/Path"
import type { ReleaseError } from "./Errors.ts"
import type { Git } from "./Git.ts"
import type { GitHub, PullRequest } from "./GitHub.ts"
import { notImplemented, notImplementedEffect } from "./NotImplemented.ts"
import type { PackageReadiness, Readiness } from "./Readiness.ts"
import type { ReleaseManifest } from "./ReleaseManifest.ts"

/** Sibling of `changeset-release/main`; one branch per base, force-pushed on every change. */
export const PUBLISH_BRANCH = "publish-release/main"
export const BASE_BRANCH = "main"
export const COMMIT_MESSAGE = "Publish Packages"
export const TITLE = "Publish Packages"
/** Appended to the title while the release is not approvable. */
export const NOT_READY_SUFFIX = "[not ready]"

/**
 * HTML comment carrying the manifest identity, `<!-- release-manifest: <identity> -->`.
 * It is how a readiness run tells whether the open PR already describes this
 * exact manifest, so repeated runs are no-ops.
 */
export const IDENTITY_MARKER = "release-manifest"

/** First paragraph of every publish PR body; the rest is generated. */
export const BODY_INTRO =
  "This PR was opened by the release readiness workflow. Every package below is staged on npm and has passed " +
  "the registry's validation. Merging this PR authorises publication of exactly the staged tarballs pinned in " +
  "`.release/manifest.json`: nothing is rebuilt or re-versioned. After merging, a maintainer runs the Publish " +
  "workflow with the identity below and a one-time password; publication rechecks the whole release first."

/**
 * `Publish Packages` when `manifest.tag` is `latest`, otherwise
 * `Publish Packages (<tag>)`; with ` [not ready]` appended when `readiness`
 * is `NotReady`.
 */
export const title = (_manifest: ReleaseManifest, _readiness: Readiness): string =>
  notImplemented("PublishPullRequest.title")

/**
 * Markdown body: {@link BODY_INTRO}; the identity marker line; a `## Release`
 * section stating the identity, tag and source commit; a `## Packages` table
 * with one row per manifest package (`name`, `version`, stage id, state);
 * and, when `readiness` is `NotReady`, a `## Blockers` list naming each
 * blocker with its detail. Deterministic for a given manifest and readiness.
 */
export const body = (_manifest: ReleaseManifest, _readiness: Readiness): string =>
  notImplemented("PublishPullRequest.body")

/** The identity carried by a body's marker line, if present. */
export const identityFromBody = (_body: string): Option.Option<string> =>
  notImplemented("PublishPullRequest.identityFromBody")

export type SyncResult =
  | { readonly _tag: "Created"; readonly pullRequest: PullRequest }
  | { readonly _tag: "Updated"; readonly pullRequest: PullRequest }
  /** The open PR already carries this identity with a ready title; nothing touched. */
  | { readonly _tag: "NoChanges"; readonly pullRequest: PullRequest }
  /** Not ready and an open PR exists: its title and body now say so; no git mutation. */
  | { readonly _tag: "Marked"; readonly pullRequest: PullRequest; readonly blockers: ReadonlyArray<PackageReadiness> }
  /** Not ready and no open PR: nothing created. */
  | { readonly _tag: "Skipped"; readonly blockers: ReadonlyArray<PackageReadiness> }

/**
 * Creates, refreshes or marks the publish PR for `manifest`:
 *
 * 1. `GitHub.findPullRequest({ head: PUBLISH_BRANCH, base: BASE_BRANCH })`.
 * 2. `readiness` is `NotReady`: with an open PR, `updatePullRequest` with the
 *    not-ready title and body and return `Marked`; without one, return
 *    `Skipped`. Git is never touched on this path, so an unready release can
 *    never be committed as approvable.
 * 3. `readiness` is `Ready` and the open PR's body carries this manifest's
 *    identity and its title is the ready title: `NoChanges`, no git.
 * 4. Otherwise remember `Git.headSha`; `Git.resetBranch(PUBLISH_BRANCH, BASE_BRANCH)`;
 *    write `ReleaseManifest.encode(manifest)` to `MANIFEST_PATH` under the
 *    workspace root (creating `.release/`); `Git.commitAll(COMMIT_MESSAGE)`;
 *    `Git.pushForce(PUBLISH_BRANCH)`; then `updatePullRequest` or
 *    `createPullRequest` with the ready title and body; always, even on
 *    failure, `Git.checkout` of the remembered SHA.
 */
export const sync = (
  _manifest: ReleaseManifest,
  _readiness: Readiness
): Effect.Effect<SyncResult, ReleaseError, Git | GitHub | FileSystem.FileSystem | Path.Path> =>
  notImplementedEffect("PublishPullRequest.sync")
