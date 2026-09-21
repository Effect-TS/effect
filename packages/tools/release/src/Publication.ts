import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import type * as Path from "effect/Path"
import type * as Redacted from "effect/Redacted"
import type { ReleaseError } from "./Errors.ts"
import type { Git } from "./Git.ts"
import type { GitHub, PullRequest } from "./GitHub.ts"
import { notImplementedEffect } from "./NotImplemented.ts"
import type { SyncResult } from "./PublishPullRequest.ts"
import type { PackageReadiness, Readiness } from "./Readiness.ts"
import type { Registry } from "./Registry.ts"
import type { ManifestPackage, ReleaseManifest } from "./ReleaseManifest.ts"
import type { StageApproval } from "./StageApproval.ts"
import type { Workspace } from "./Workspace.ts"

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
  /** Some unpublished public packages are not in the queue at all; no manifest can be built. */
  | {
    readonly _tag: "Incomplete"
    readonly missing: ReadonlyArray<{ readonly name: string; readonly version: string }>
  }
  | {
    readonly _tag: "NotReady"
    readonly manifest: ReleaseManifest
    readonly identity: string
    readonly blockers: ReadonlyArray<PackageReadiness>
    readonly pullRequest: Option.Option<PullRequest>
  }
  | {
    readonly _tag: "Ready"
    readonly manifest: ReleaseManifest
    readonly identity: string
    readonly pullRequest: SyncResult
  }
  | {
    readonly _tag: "ReadinessDryRun"
    readonly manifest: ReleaseManifest
    readonly identity: string
    readonly readiness: Readiness
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
  > = Layer.effect(Publication, notImplementedEffect("Publication.layer"))
}
