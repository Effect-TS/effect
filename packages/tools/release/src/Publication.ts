import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import type * as Redacted from "effect/Redacted"
import { ReleaseError } from "./Errors.ts"
import { Git } from "./Git.ts"
import { GitHub, type PullRequest } from "./GitHub.ts"
import * as PublishPullRequest from "./PublishPullRequest.ts"
import type { SyncResult } from "./PublishPullRequest.ts"
import * as Readiness from "./Readiness.ts"
import type { PackageReadiness } from "./Readiness.ts"
import { Registry, STAGE_TOKEN, type StagedItem } from "./Registry.ts"
import * as ReleaseManifest from "./ReleaseManifest.ts"
import type { ManifestPackage } from "./ReleaseManifest.ts"
import { versionKey } from "./Routing.ts"
import { StageApproval } from "./StageApproval.ts"
import { Workspace, type WorkspacePackage } from "./Workspace.ts"

/** Environment variable holding the one-time password for `publish`; never a CLI flag. */
export const OTP = "NPM_OTP"

/** How `publish` waits for the registry to serve an approved version. */
export const CONFIRM_INTERVAL: Duration.Input = "15 seconds"
export const CONFIRM_TIMEOUT: Duration.Input = "10 minutes"

export interface ReadinessOptions {
  /** dist-tag the release was staged under; must match every staged item's tag. */
  readonly tag: string
  /** Assess and print the proposed PR without touching git or GitHub. */
  readonly dryRun?: boolean | undefined
}

export type ReadinessResult =
  /** No public package has an unpublished manifest version in the stage queue. */
  | { readonly _tag: "Idle"; readonly reason: string }
  /**
   * The manifest already merged on `main` still has work: an approvable or
   * pending upload, or a pinned upload that has left the queue while that
   * version is still the workspace version. No new PR is opened until it
   * finishes.
   */
  | { readonly _tag: "InProgress"; readonly identity: string; readonly remaining: ReadonlyArray<ManifestPackage> }
  /**
   * The merged manifest still pins a blocked or unknown upload at a version
   * the workspace is on. No PR is opened. Rejecting the upload turns that
   * hold into `InProgress`: the pinned id is gone, so the package is missing
   * while that version is still current. The recovery that works is a version
   * bump that clears those versions from the workspace, and a reject of any
   * leftover upload still listed at the old version. The bump alone leaves
   * readiness failing the stale-version check. Once every remaining version
   * has left the workspace, this no longer applies: readiness continues, and
   * merging its publish PR replaces this manifest.
   */
  | { readonly _tag: "Stalled"; readonly identity: string; readonly blockers: ReadonlyArray<PackageReadiness> }
  /** Some unpublished public packages are not in the queue at all; no manifest can be built. */
  | {
    readonly _tag: "Incomplete"
    readonly missing: ReadonlyArray<{ readonly name: string; readonly version: string }>
  }
  | {
    readonly _tag: "NotReady"
    readonly manifest: ReleaseManifest.ReleaseManifest
    readonly identity: string
    readonly blockers: ReadonlyArray<PackageReadiness>
    readonly pullRequest: Option.Option<PullRequest>
  }
  | {
    readonly _tag: "Ready"
    readonly manifest: ReleaseManifest.ReleaseManifest
    readonly identity: string
    readonly pullRequest: SyncResult
  }
  | {
    readonly _tag: "ReadinessDryRun"
    readonly manifest: ReleaseManifest.ReleaseManifest
    readonly identity: string
    readonly readiness: Readiness.Readiness
    readonly title: string
    readonly body: string
  }

export interface PublishOptions {
  /** The identity printed in the merged publish PR; must equal the identity of the manifest on `main`. */
  readonly expectedIdentity: string
  readonly otp: Redacted.Redacted<string>
  /** Recheck and print what would be approved without approving anything. */
  readonly dryRun?: boolean | undefined
}

export type PublishResult =
  | {
    readonly _tag: "Published"
    readonly identity: string
    readonly approved: ReadonlyArray<ManifestPackage>
    readonly alreadyPublic: ReadonlyArray<ManifestPackage>
    /** `manifest.sourceSha`; the workflow deploys the website from it. */
    readonly websiteRevision: string
  }
  /** Every manifest version was already public; nothing approved. Safe to re-run the website deployment. */
  | { readonly _tag: "AlreadyPublished"; readonly identity: string; readonly websiteRevision: string }
  | {
    readonly _tag: "PublishDryRun"
    readonly identity: string
    readonly toApprove: ReadonlyArray<ManifestPackage>
    readonly alreadyPublic: ReadonlyArray<ManifestPackage>
  }

const describe = (pkg: ManifestPackage): string => `${pkg.name}@${pkg.version}`

/**
 * Orchestrates the two halves of the publish flow.
 *
 * `readiness` (scheduled, and after every Stage run):
 *
 * 1. `Workspace.packages`, `Registry.listStaged`, and one `Registry.isPublished`
 *    per public package at its manifest version. The release set is every
 *    public package whose version is not published. Empty → `Idle`.
 * 2. Read `MANIFEST_PATH` from `origin/main`. Pending or approvable items,
 *    or a missing pinned item that is still the workspace version →
 *    `InProgress`. Blocked or unknown items that are still current →
 *    `Stalled`. Once every remaining version has left the workspace and
 *    nothing left is approvable or pending, continue with the next release.
 * 3. Any release-set package with no queue item at its version → `Incomplete`.
 * 4. `ReleaseManifest.fromStaged` with `sourceSha = Git.lastCommitTouching(LEDGER_PATH)`,
 *    then `Readiness.assess`. `dryRun` → `ReadinessDryRun` with the proposed
 *    title and body, no git or GitHub. Otherwise `PublishPullRequest.sync`,
 *    reported as `NotReady` (with the marked or absent PR) or `Ready`.
 *
 * `publish` (dispatched by a maintainer after the publish PR merged):
 *
 * 1. Read and decode `MANIFEST_PATH` from `origin/main`; its identity must
 *    equal `expectedIdentity`, otherwise fail before any registry call.
 * 2. `Registry.listStaged` and `Registry.isPublished` for every manifest
 *    package; `Readiness.assess`. A missing pinned item is checked with
 *    `StageApproval.viewStaged`. An approvable viewed status is approved;
 *    pending or blocked fails at once. Any other status must become public
 *    inside the bounded confirmation window. After that wait the queue is
 *    read again. A fresh listing wins for ids it contains. An upload that
 *    was approvable only because the listing missed it is viewed again,
 *    unless that version is already public, and kept only when that view is
 *    still approvable. A version that became public is skipped and not
 *    viewed again. Pending, blocked, unknown, or a 404 fails before anything
 *    is approved. Any other `NotReady` result fails naming every blocker;
 *    nothing is approved. Packages already `public` are verified,
 *    not approved, which lets a retry finish the same release.
 * 3. Nothing left to approve → `AlreadyPublished`. `dryRun` → `PublishDryRun`.
 * 4. `StageApproval.approve(stageId, otp)` for each approvable package in
 *    manifest order, one registry operation each (there is no batch approve;
 *    publication is not atomic). The first failure stops the loop and fails
 *    with the approved and remaining packages named.
 * 5. Poll `Registry.isPublished` for every approved package every
 *    `CONFIRM_INTERVAL` until all are served or `CONFIRM_TIMEOUT` elapses;
 *    on timeout fail naming the unconfirmed packages. Only then `Published`.
 *    `Published` and `AlreadyPublished` are both a successful publication
 *    for the website gate.
 *
 * Neither half runs `pnpm version`, `pnpm build` or `pnpm stage publish`.
 */
export class Publication extends Context.Service<Publication, {
  readonly readiness: (options: ReadinessOptions) => Effect.Effect<ReadinessResult, ReleaseError>
  readonly publish: (options: PublishOptions) => Effect.Effect<PublishResult, ReleaseError>
}>()("@effect/release/Publication") {
  static readonly layer: Layer.Layer<
    Publication,
    never,
    Git | GitHub | Registry | StageApproval | Workspace | FileSystem.FileSystem | Path.Path
  > = Layer.effect(
    Publication,
    Effect.gen(function*() {
      const git = yield* Git
      const github = yield* GitHub
      const registry = yield* Registry
      const approval = yield* StageApproval
      const workspace = yield* Workspace
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const publishedKeys = (packages: ReadonlyArray<{ readonly name: string; readonly version: string }>) =>
        Effect.forEach(
          packages,
          (pkg) =>
            registry.isPublished(pkg.name, pkg.version).pipe(
              Effect.map((published) => published ? versionKey(pkg.name, pkg.version) : undefined)
            ),
          { concurrency: 8 }
        ).pipe(Effect.map((keys) => new Set(keys.filter((key): key is string => key !== undefined))))

      /** The manifest merged on `main`, if any. */
      const mergedManifest = Effect.gen(function*() {
        const text = yield* git.showFile("origin/main", ReleaseManifest.MANIFEST_PATH)
        if (Option.isNone(text)) return Option.none<ReleaseManifest.ReleaseManifest>()
        return Option.some(yield* ReleaseManifest.decode(text.value))
      })

      const requireStageToken = Config.option(Config.Redacted(STAGE_TOKEN)).pipe(
        Effect.mapError((cause) => new ReleaseError({ message: `Could not read ${STAGE_TOKEN}`, cause })),
        Effect.flatMap((token) =>
          Option.isSome(token)
            ? Effect.void
            : new ReleaseError({ message: `${STAGE_TOKEN} is not set; release readiness cannot be verified` })
        )
      )

      const readiness = Effect.fn("Publication.readiness")(function*(options: ReadinessOptions) {
        yield* requireStageToken
        const packages = yield* workspace.packages
        const publicPackages = packages.filter((pkg) => !pkg.private)
        const staged = yield* registry.listStaged
        const published = yield* publishedKeys(publicPackages)
        const releaseSet: ReadonlyArray<WorkspacePackage> = publicPackages.filter((pkg) =>
          !published.has(versionKey(pkg.name, pkg.version))
        )
        if (releaseSet.length === 0) {
          return { _tag: "Idle", reason: "every public package is published at its manifest version" } as const
        }

        const merged = yield* mergedManifest
        if (Option.isSome(merged)) {
          const mergedPublished = yield* publishedKeys(merged.value.packages)
          const mergedReadiness = Readiness.assess({ manifest: merged.value, staged, published: mergedPublished })
          const remaining = mergedReadiness.packages.filter((pkg) => pkg.state !== "public")
          const canProgress = remaining.some((pkg) => pkg.state === "approvable" || pkg.state === "pending")
          const stillCurrent = remaining.some((pkg) =>
            publicPackages.some((item) => item.name === pkg.name && item.version === pkg.version)
          )
          // A missing upload is unfinished, not stalled, while it is still this
          // release. Approvable or pending items hold the next release even
          // after the workspace has moved on: publish can still approve them.
          if (canProgress || (stillCurrent && remaining.every((pkg) => pkg.state === "missing"))) {
            return { _tag: "InProgress", identity: ReleaseManifest.identity(merged.value), remaining } as const
          }
          if (stillCurrent && remaining.length > 0) {
            return {
              _tag: "Stalled",
              identity: ReleaseManifest.identity(merged.value),
              blockers: remaining
            } as const
          }
        }

        const missing = releaseSet
          .filter((pkg) => !staged.some((item) => item.packageName === pkg.name && item.version === pkg.version))
          .map((pkg) => ({ name: pkg.name, version: pkg.version }))
        if (missing.length > 0) {
          return { _tag: "Incomplete", missing } as const
        }

        const sourceSha = yield* git.lastCommitTouching(ReleaseManifest.LEDGER_PATH)
        const manifest = yield* ReleaseManifest.fromStaged({
          tag: options.tag,
          sourceSha,
          packages: releaseSet,
          staged
        })
        const identity = ReleaseManifest.identity(manifest)
        const assessed = Readiness.assess({ manifest, staged, published })

        if (options.dryRun === true) {
          return {
            _tag: "ReadinessDryRun",
            manifest,
            identity,
            readiness: assessed,
            title: PublishPullRequest.title(manifest, assessed),
            body: PublishPullRequest.body(manifest, assessed)
          } as const
        }

        const synced = yield* PublishPullRequest.sync(manifest, assessed).pipe(
          Effect.provideService(Git, git),
          Effect.provideService(GitHub, github),
          Effect.provideService(FileSystem.FileSystem, fs),
          Effect.provideService(Path.Path, path)
        )
        if (assessed._tag === "NotReady") {
          return {
            _tag: "NotReady",
            manifest,
            identity,
            blockers: assessed.blockers,
            pullRequest: synced._tag === "Marked" ? Option.some(synced.pullRequest) : Option.none()
          } as const
        }
        return { _tag: "Ready", manifest, identity, pullRequest: synced } as const
      })

      const maxPolls = Math.ceil(Duration.toMillis(CONFIRM_TIMEOUT) / Duration.toMillis(CONFIRM_INTERVAL))

      /** Polls until every package is served or the timeout elapses. */
      const confirmPublic = Effect.fn("Publication.confirmPublic")(function*(
        packages: ReadonlyArray<ManifestPackage>,
        timeoutMessage = "Approved but not yet served by the registry"
      ) {
        let remaining = packages
        for (let poll = 0;; poll++) {
          const served = yield* publishedKeys(remaining)
          remaining = remaining.filter((pkg) => !served.has(versionKey(pkg.name, pkg.version)))
          if (remaining.length === 0) return
          if (poll >= maxPolls) {
            return yield* new ReleaseError({
              message: `${timeoutMessage} after ${Duration.format(Duration.fromInputUnsafe(CONFIRM_TIMEOUT))}: ${
                remaining.map(describe).join(", ")
              }`
            })
          }
          yield* Effect.sleep(CONFIRM_INTERVAL)
        }
      })

      /**
       * A missing pinned upload is not a reason to approve the rest of the
       * release from the listing alone. View it. An approvable view is carried
       * into the queue the recheck uses; pending or blocked fails at once;
       * anything else must become public before another approval. After that
       * wait, a fresh listing wins. An id the listing still misses is viewed
       * again, except when no wait ran (the pre-wait view is still current)
       * or the version is already public (skipped before the view, not approved).
       */
      const recoverMissing = Effect.fn("Publication.recoverMissing")(function*(
        identity: string,
        manifest: ReleaseManifest.ReleaseManifest,
        missing: ReadonlyArray<PackageReadiness>,
        published: ReadonlySet<string>
      ) {
        const fail = (subject: string, detail: string) =>
          new ReleaseError({
            message: `Release ${identity} is not ready; nothing was approved: ${subject} (${detail})`
          })
        const viewedApprovable: Array<StagedItem> = []
        const waiting: Array<ManifestPackage> = []
        for (const pkg of missing) {
          const viewed = yield* approval.viewStaged(pkg.stageId)
          if (
            Option.isNone(viewed) || viewed.value.id !== pkg.stageId || viewed.value.packageName !== pkg.name ||
            viewed.value.version !== pkg.version
          ) {
            return yield* fail(describe(pkg), pkg.detail)
          }
          const classified = Readiness.assessPackage(pkg, { manifest, staged: [viewed.value], published })
          if (classified.state === "approvable") {
            viewedApprovable.push(viewed.value)
          } else if (classified.state === "pending" || classified.state === "blocked") {
            return yield* fail(describe(classified), `${classified.state}: ${classified.detail}`)
          } else {
            waiting.push(pkg)
          }
        }
        if (waiting.length > 0) {
          yield* confirmPublic(waiting, "Staged upload left the queue but was not served by the registry")
        }
        const freshPublished = yield* publishedKeys(manifest.packages)
        // The wait can be minutes long. A fresh listing wins for ids it
        // contains. An upload the listing still misses was never refreshed
        // by that list, so it is viewed again; the pre-wait snapshot is not
        // reused. Without a wait the snapshot is still current. A version
        // that became public is skipped before that view.
        const listed = yield* registry.listStaged
        const listedIds = new Set(listed.map((item) => item.id))
        const carried: Array<StagedItem> = []
        for (const item of viewedApprovable) {
          if (listedIds.has(item.id)) continue
          if (waiting.length === 0) {
            carried.push(item)
            continue
          }
          const subject = `${item.packageName}@${item.version}`
          if (freshPublished.has(versionKey(item.packageName, item.version))) continue
          const viewed = yield* approval.viewStaged(item.id)
          if (
            Option.isNone(viewed) || viewed.value.id !== item.id ||
            viewed.value.packageName !== item.packageName || viewed.value.version !== item.version
          ) {
            return yield* fail(subject, "not in the stage queue")
          }
          const pinned = manifest.packages.find((candidate) => candidate.stageId === item.id)
          if (pinned === undefined) {
            return yield* fail(subject, "missing: not in the stage queue")
          }
          const classified = Readiness.assessPackage(pinned, {
            manifest,
            staged: [viewed.value],
            published: freshPublished
          })
          if (classified.state === "approvable") {
            carried.push(viewed.value)
            continue
          }
          return yield* fail(subject, `${classified.state}: ${classified.detail}`)
        }
        return { staged: [...listed, ...carried], published: freshPublished }
      })

      const publish = Effect.fn("Publication.publish")(function*(options: PublishOptions) {
        const merged = yield* mergedManifest
        if (Option.isNone(merged)) {
          return yield* new ReleaseError({
            message: `No release manifest at ${ReleaseManifest.MANIFEST_PATH}; merge the publish pull request first`
          })
        }
        const manifest = merged.value
        const identity = ReleaseManifest.identity(manifest)
        if (identity !== options.expectedIdentity) {
          return yield* new ReleaseError({
            message: `The merged manifest is release ${identity}, not the expected ${options.expectedIdentity}`
          })
        }

        yield* requireStageToken
        let staged: ReadonlyArray<StagedItem> = yield* registry.listStaged
        let published = yield* publishedKeys(manifest.packages)
        let assessed = Readiness.assess({ manifest, staged, published })
        if (assessed._tag === "NotReady") {
          const missing = assessed.blockers.filter((pkg) => pkg.state === "missing")
          const otherBlockers = assessed.blockers.filter((pkg) => pkg.state !== "missing")
          if (missing.length > 0 && otherBlockers.length === 0) {
            const recovered = yield* recoverMissing(identity, manifest, missing, published)
            staged = recovered.staged
            published = recovered.published
            assessed = Readiness.assess({ manifest, staged, published })
          }
        }
        if (assessed._tag === "NotReady") {
          return yield* new ReleaseError({
            message: `Release ${identity} is not ready; nothing was approved: ${
              assessed.blockers.map((pkg) => `${describe(pkg)} (${pkg.state}: ${pkg.detail})`).join("; ")
            }`
          })
        }
        const strip = (pkg: PackageReadiness): ManifestPackage => ({
          name: pkg.name,
          version: pkg.version,
          stageId: pkg.stageId
        })
        const toApprove = assessed.packages.filter((pkg) => pkg.state === "approvable").map(strip)
        const alreadyPublic = assessed.packages.filter((pkg) => pkg.state === "public").map(strip)
        if (toApprove.length === 0) {
          return { _tag: "AlreadyPublished", identity, websiteRevision: manifest.sourceSha } as const
        }
        if (options.dryRun === true) {
          return { _tag: "PublishDryRun", identity, toApprove, alreadyPublic } as const
        }

        const approved: Array<ManifestPackage> = []
        for (const pkg of toApprove) {
          yield* approval.approve(pkg.stageId, options.otp).pipe(
            Effect.mapError((cause) =>
              new ReleaseError({
                message: `Publication of release ${identity} stopped at ${describe(pkg)}: ${cause.message}. Approved: ${
                  approved.length === 0 ? "none" : approved.map(describe).join(", ")
                }. Remaining: ${toApprove.filter((other) => !approved.includes(other)).map(describe).join(", ")}`,
                cause
              })
            )
          )
          approved.push(pkg)
        }
        yield* confirmPublic(approved)
        return { _tag: "Published", identity, approved, alreadyPublic, websiteRevision: manifest.sourceSha } as const
      })

      return Publication.of({ readiness, publish })
    })
  )
}
