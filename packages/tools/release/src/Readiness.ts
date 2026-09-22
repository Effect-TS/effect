import * as Option from "effect/Option"
import type { StagedItem } from "./Registry.ts"
import type { ManifestPackage, ReleaseManifest } from "./ReleaseManifest.ts"
import { versionKey } from "./Routing.ts"

/**
 * Registry status words, as observed on `GET /-/stage` items. The registry
 * documents none of them; the sets below are the contract's assumption and
 * the live probe (EFF-1455 P3) may amend them. Anything outside every set is
 * `unknown` and never ready: readiness fails closed on new vocabulary.
 */
export const APPROVABLE_STATUSES: ReadonlySet<string> = new Set(["staged", "awaiting_approval"])
export const PENDING_STATUSES: ReadonlySet<string> = new Set(["validating"])
export const BLOCKED_STATUSES: ReadonlySet<string> = new Set(["blocked", "rejected", "deleted"])

/**
 * - `public`: the registry already serves `name@version`; nothing to approve.
 * - `approvable`: the pinned stage id exists at the pinned name and version
 *   with an approvable status.
 * - `pending`: the pinned stage id exists but its scan has not finished.
 * - `missing`: no staged item has the pinned id, or the item with that id is
 *   not `name@version`. If another item exists for the same name and version
 *   the detail names its id (the release was re-staged; the manifest is stale).
 * - `blocked`: the pinned item is blocked, rejected or deleted.
 * - `unknown`: the pinned item has no status or one outside every set.
 */
export type PackageState = "public" | "approvable" | "pending" | "missing" | "blocked" | "unknown"

export interface PackageReadiness extends ManifestPackage {
  readonly state: PackageState
  /** Human-readable reason, e.g. `status validating` or `staged again as <id>`. */
  readonly detail: string
}

/**
 * `Ready` when every package is `public` or `approvable`. Otherwise
 * `NotReady`, with `blockers` listing every package in another state, in
 * manifest order. `packages` always lists every manifest package.
 */
export type Readiness =
  | { readonly _tag: "Ready"; readonly packages: ReadonlyArray<PackageReadiness> }
  | {
    readonly _tag: "NotReady"
    readonly packages: ReadonlyArray<PackageReadiness>
    readonly blockers: ReadonlyArray<PackageReadiness>
  }

export interface ReadinessInput {
  readonly manifest: ReleaseManifest
  /** The whole stage queue; items outside the manifest are ignored. */
  readonly staged: ReadonlyArray<StagedItem>
  /** `name@version` keys the registry already serves (`Routing.versionKey`). */
  readonly published: ReadonlySet<string>
}

/** One manifest package against the given queue and published set. `assess` maps this over the manifest. */
export const assessPackage = (pkg: ManifestPackage, input: ReadinessInput): PackageReadiness => {
  const classify = (state: PackageState, detail: string): PackageReadiness => ({ ...pkg, state, detail })
  if (input.published.has(versionKey(pkg.name, pkg.version))) {
    return classify("public", "published")
  }
  const item = input.staged.find((item) => item.id === pkg.stageId)
  if (item === undefined) {
    const restaged = input.staged.find((item) => item.packageName === pkg.name && item.version === pkg.version)
    return classify(
      "missing",
      restaged === undefined ? "not in the stage queue" : `not in the stage queue; staged again as ${restaged.id}`
    )
  }
  if (item.packageName !== pkg.name || item.version !== pkg.version) {
    return classify("missing", `stage id now belongs to ${item.packageName}@${item.version}`)
  }
  if (Option.isNone(item.status)) {
    return classify("unknown", "no status")
  }
  const status = item.status.value
  const detail = `status ${status}`
  if (APPROVABLE_STATUSES.has(status)) return classify("approvable", detail)
  if (PENDING_STATUSES.has(status)) return classify("pending", detail)
  if (BLOCKED_STATUSES.has(status)) return classify("blocked", detail)
  return classify("unknown", detail)
}

/** Pure; assessed against the manifest only, never against the queue at large. */
export const assess = (input: ReadinessInput): Readiness => {
  const packages = input.manifest.packages.map((pkg) => assessPackage(pkg, input))
  const blockers = packages.filter((pkg) => pkg.state !== "public" && pkg.state !== "approvable")
  return blockers.length === 0 ? { _tag: "Ready", packages } : { _tag: "NotReady", packages, blockers }
}
