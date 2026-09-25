import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import { ReleaseError } from "./Errors.ts"
import { Git, withRestoredHead } from "./Git.ts"
import { GitHub, type PullRequest, upsertPullRequest } from "./GitHub.ts"
import { findWorkspaceRoot } from "./Process.ts"
import type { PackageReadiness, Readiness } from "./Readiness.ts"
import { encode, identity, MANIFEST_PATH, type ReleaseManifest } from "./ReleaseManifest.ts"
import { BASE_BRANCH } from "./VersionPullRequest.ts"

/** Sibling of `changeset-release/main`; one branch per base, force-pushed on every change. */
export const PUBLISH_BRANCH = "publish-release/main"
export { BASE_BRANCH } from "./VersionPullRequest.ts"
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

const markerLine = (id: string): string => `<!-- ${IDENTITY_MARKER}: ${id} -->`

const MARKER_PATTERN = new RegExp(`<!-- ${IDENTITY_MARKER}: ([0-9a-f]+) -->`)

/**
 * `Publish Packages` when `manifest.tag` is `latest`, otherwise
 * `Publish Packages (<tag>)`; with ` [not ready]` appended when `readiness`
 * is `NotReady`.
 */
export const title = (manifest: ReleaseManifest, readiness: Readiness): string => {
  const base = manifest.tag === "latest" ? TITLE : `${TITLE} (${manifest.tag})`
  return readiness._tag === "NotReady" ? `${base} ${NOT_READY_SUFFIX}` : base
}

/**
 * Markdown body: {@link BODY_INTRO}; the identity marker line; a `## Release`
 * section stating the identity, tag and source commit; a `## Packages` table
 * with one row per manifest package (`name`, `version`, stage id, state);
 * and, when `readiness` is `NotReady`, a `## Blockers` list naming each
 * blocker with its detail. Deterministic for a given manifest and readiness.
 */
export const body = (manifest: ReleaseManifest, readiness: Readiness): string => {
  const id = identity(manifest)
  const states = new Map(readiness.packages.map((pkg) => [pkg.name, pkg]))
  const rows = manifest.packages.map((pkg) => {
    const state = states.get(pkg.name)
    return `| \`${pkg.name}\` | ${pkg.version} | \`${pkg.stageId}\` | ${state?.state ?? "unknown"} |`
  })
  const sections = [
    BODY_INTRO,
    markerLine(id),
    "## Release",
    [
      `- Identity: \`${id}\``,
      `- Dist-tag: \`${manifest.tag}\``,
      `- Source commit: \`${manifest.sourceSha}\``,
      `- Publish command: \`pnpm release publish --expect-identity ${id}\``
    ].join("\n"),
    "## Packages",
    ["| Package | Version | Stage id | State |", "| --- | --- | --- | --- |", ...rows].join("\n")
  ]
  if (readiness._tag === "NotReady") {
    sections.push(
      "## Blockers",
      "This release is not approvable yet. The readiness workflow refreshes this PR; do not merge it until the " +
        "blockers below are gone and the title no longer says not ready.",
      readiness.blockers.map((pkg) => `- \`${pkg.name}@${pkg.version}\`: ${pkg.state}, ${pkg.detail}`).join("\n")
    )
  }
  return `${sections.join("\n\n")}\n`
}

/** The identity carried by a body's marker line, if present. */
export const identityFromBody = (body: string): Option.Option<string> =>
  Option.fromNullishOr(MARKER_PATTERN.exec(body)?.[1])

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
 *    workspace root (creating `.release/`);
 *    `Git.commitPaths(COMMIT_MESSAGE, [MANIFEST_PATH])`;
 *    `Git.pushForce(PUBLISH_BRANCH)`; then `updatePullRequest` or
 *    `createPullRequest` with the ready title and body; always, even on
 *    failure, `Git.checkout` of the remembered SHA.
 */
export const sync = (
  manifest: ReleaseManifest,
  readiness: Readiness
): Effect.Effect<SyncResult, ReleaseError, Git | GitHub | FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function*() {
    const git = yield* Git
    const github = yield* GitHub
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const content = { title: title(manifest, readiness), body: body(manifest, readiness) }
    const existing = yield* github.findPullRequest({ head: PUBLISH_BRANCH, base: BASE_BRANCH })

    if (readiness._tag === "NotReady") {
      if (Option.isNone(existing)) {
        return { _tag: "Skipped", blockers: readiness.blockers } as const
      }
      const pullRequest = yield* github.updatePullRequest(existing.value.number, content)
      return { _tag: "Marked", pullRequest, blockers: readiness.blockers } as const
    }

    if (
      Option.isSome(existing) &&
      Option.getOrUndefined(identityFromBody(existing.value.body)) === identity(manifest) &&
      existing.value.title === content.title
    ) {
      return { _tag: "NoChanges", pullRequest: existing.value } as const
    }

    const root = yield* findWorkspaceRoot
    return yield* withRestoredHead(
      git,
      Effect.gen(function*() {
        yield* git.resetBranch(PUBLISH_BRANCH, BASE_BRANCH)
        const file = path.join(root, MANIFEST_PATH)
        yield* fs.makeDirectory(path.dirname(file), { recursive: true }).pipe(
          Effect.mapError((cause) =>
            new ReleaseError({ message: `Could not create ${path.dirname(MANIFEST_PATH)}`, cause })
          )
        )
        yield* fs.writeFileString(file, encode(manifest)).pipe(
          Effect.mapError((cause) => new ReleaseError({ message: `Could not write ${MANIFEST_PATH}`, cause }))
        )
        const commit = yield* git.commitPaths(COMMIT_MESSAGE, [MANIFEST_PATH])
        if (Option.isNone(commit)) {
          return yield* new ReleaseError({
            message: `${MANIFEST_PATH} on ${BASE_BRANCH} already pins release ${identity(manifest)}; nothing to propose`
          })
        }
        yield* git.pushForce(PUBLISH_BRANCH)
        return yield* upsertPullRequest(github, { head: PUBLISH_BRANCH, base: BASE_BRANCH, existing, ...content })
      })
    )
  })
