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
import { findWorkspaceRoot } from "./Process.ts"
import * as PublishPullRequest from "./PublishPullRequest.ts"
import type { SyncResult } from "./PublishPullRequest.ts"
import * as Readiness from "./Readiness.ts"
import type { PackageReadiness } from "./Readiness.ts"
import { Registry, type StagedItem } from "./Registry.ts"
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
   * The manifest already merged on `main` still pins items that sit in the
   * queue: that release is authorised and awaiting (or part-way through)
   * publication. No new PR is opened until it finishes.
   */
  | { readonly _tag: "InProgress"; readonly identity: string; readonly remaining: ReadonlyArray<ManifestPackage> }
  /**
   * The merged manifest still pins queue items, but none is approvable or
   * pending (blocked, rejected, unknown): that release can neither finish nor
   * be superseded until the items are dealt with. No PR is opened.
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
 * 2. If `MANIFEST_PATH` exists on the checkout and any of its stage ids is in
 *    the queue → `InProgress`, nothing else happens.
 * 3. Any release-set package with no queue item at its version → `Incomplete`.
 * 4. `ReleaseManifest.fromStaged` with `sourceSha = Git.lastCommitTouching(LEDGER_PATH)`,
 *    then `Readiness.assess`. `dryRun` → `ReadinessDryRun` with the proposed
 *    title and body, no git or GitHub. Otherwise `PublishPullRequest.sync`,
 *    reported as `NotReady` (with the marked or absent PR) or `Ready`.
 *
 * `publish` (dispatched by a maintainer after the publish PR merged):
 *
 * 1. Read and decode `MANIFEST_PATH` from the checkout; its identity must
 *    equal `expectedIdentity`, otherwise fail before any registry call.
 * 2. `Registry.listStaged` and `Registry.isPublished` for every manifest
 *    package; `Readiness.assess`. `NotReady` → fail naming every blocker;
 *    nothing is approved. Packages already `public` are verified, not
 *    approved: this is what makes a retry after partial publication finish
 *    the same release.
 * 3. Nothing left to approve → `AlreadyPublished`. `dryRun` → `PublishDryRun`.
 * 4. `StageApproval.approve(stageId, otp)` for each approvable package in
 *    manifest order, one registry operation each (there is no batch approve;
 *    publication is not atomic). The first failure stops the loop and fails
 *    with the approved and remaining packages named.
 * 5. Poll `Registry.isPublished` for every approved package every
 *    `CONFIRM_INTERVAL` until all are served or `CONFIRM_TIMEOUT` elapses;
 *    on timeout fail naming the unconfirmed packages. Only then `Published`,
 *    which is the website gate.
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
      const root = yield* findWorkspaceRoot.pipe(Effect.orDie)
      const manifestFile = path.join(root, ReleaseManifest.MANIFEST_PATH)

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
        const exists = yield* fs.exists(manifestFile).pipe(
          Effect.mapError((cause) =>
            new ReleaseError({ message: `Could not inspect ${ReleaseManifest.MANIFEST_PATH}`, cause })
          )
        )
        if (!exists) return Option.none<ReleaseManifest.ReleaseManifest>()
        const text = yield* fs.readFileString(manifestFile).pipe(
          Effect.mapError((cause) =>
            new ReleaseError({ message: `Could not read ${ReleaseManifest.MANIFEST_PATH}`, cause })
          )
        )
        return Option.some(yield* ReleaseManifest.decode(text))
      })

      const readiness = Effect.fn("Publication.readiness")(function*(options: ReadinessOptions) {
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
          const queued = new Set(staged.map((item) => item.id))
          if (merged.value.packages.some((pkg) => queued.has(pkg.stageId))) {
            const remaining = merged.value.packages.filter((pkg) => !published.has(versionKey(pkg.name, pkg.version)))
            return { _tag: "InProgress", identity: ReleaseManifest.identity(merged.value), remaining } as const
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
      const confirmPublic = Effect.fn("Publication.confirmPublic")(function*(packages: ReadonlyArray<ManifestPackage>) {
        let remaining = packages
        for (let poll = 0;; poll++) {
          const served = yield* publishedKeys(remaining)
          remaining = remaining.filter((pkg) => !served.has(versionKey(pkg.name, pkg.version)))
          if (remaining.length === 0) return
          if (poll >= maxPolls) {
            return yield* new ReleaseError({
              message: `Approved but not yet served by the registry after ${
                Duration.format(Duration.fromInputUnsafe(CONFIRM_TIMEOUT))
              }: ${remaining.map(describe).join(", ")}`
            })
          }
          yield* Effect.sleep(CONFIRM_INTERVAL)
        }
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

        const staged: ReadonlyArray<StagedItem> = yield* registry.listStaged
        const published = yield* publishedKeys(manifest.packages)
        const assessed = Readiness.assess({ manifest, staged, published })
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
