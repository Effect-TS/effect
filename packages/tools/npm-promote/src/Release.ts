import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import type { NpmCli, ReleasePackage } from "./NpmPromote.ts"
import type { NpmPromoteError } from "./NpmPromoteError.ts"
import type { OverdueRelease } from "./TrackingIssue.ts"
import type { VersionBump } from "./Workspace.ts"

/**
 * Website deployments, with a persisted record of which revisions were
 * deployed so a failed or interrupted deploy is retried by the next run.
 */
export class Website extends Context.Service<Website, {
  readonly isDeployed: (revision: string) => Effect.Effect<boolean, NpmPromoteError>
  /** Requests the deployment and records it once the request succeeded. */
  readonly deploy: (revision: string) => Effect.Effect<void, NpmPromoteError>
}>()("@effect/npm-promote/Website") {}

/**
 * The single tracking issue for an overdue release.
 */
export class Alerts extends Context.Service<Alerts, {
  readonly open: (release: OverdueRelease) => Effect.Effect<void, NpmPromoteError>
  readonly resolve: Effect.Effect<void, NpmPromoteError>
}>()("@effect/npm-promote/Alerts") {}

export interface Release {
  readonly packages: ReadonlyArray<ReleasePackage>
  readonly bump: VersionBump
}

/**
 * One scheduled run: promotes the release, deploys the website for the bump
 * commit once `effect`'s `latest` is the target and no deployment is recorded,
 * and opens or resolves the tracking issue.
 *
 * Fails when promotion or the deploy fails, after alerting if the release is
 * overdue.
 */
export const promoteRelease = (
  _release: Release,
  _options: { readonly overdueAfterHours: number; readonly dryRun?: boolean | undefined }
): Effect.Effect<void, NpmPromoteError, HttpClient.HttpClient | NpmCli | Website | Alerts> =>
  Effect.die("not implemented")
