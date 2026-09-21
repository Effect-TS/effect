import { ReleaseError } from "@effect/release/Errors"
import { Git } from "@effect/release/Git"
import { GitHub, type PullRequest } from "@effect/release/GitHub"
import { Pnpm, type StagedPackage } from "@effect/release/Pnpm"
import { Registry, type StagedItem } from "@effect/release/Registry"
import type { ManifestPackage, ReleaseManifest } from "@effect/release/ReleaseManifest"
import type { AppliedVersion, ReleasePlan } from "@effect/release/ReleasePlan"
import { StageApproval } from "@effect/release/StageApproval"
import { Workspace, type WorkspacePackage } from "@effect/release/Workspace"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PlatformError from "effect/PlatformError"
import * as Redacted from "effect/Redacted"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const effectPackage: WorkspacePackage = {
  name: "effect",
  version: "4.0.0-rc.117",
  dir: "packages/effect",
  private: false
}

export const vitestPackage: WorkspacePackage = {
  name: "@effect/vitest",
  version: "4.0.0-rc.117",
  dir: "packages/vitest",
  private: false
}

export const scratchpadPackage: WorkspacePackage = {
  name: "scratchpad",
  version: "0.0.0",
  dir: "scratchpad",
  private: true
}

export const packages: ReadonlyArray<WorkspacePackage> = [effectPackage, vitestPackage, scratchpadPackage]

/** What pnpm prints while the fixed group sits on the `rc` lane with one pending intent. */
export const rcPlan: ReleasePlan = {
  releases: [
    {
      name: "effect",
      currentVersion: "4.0.0-rc.117",
      newVersion: "4.0.0-rc.118",
      bumpType: "patch",
      causes: ["intent"]
    },
    {
      name: "@effect/vitest",
      currentVersion: "4.0.0-rc.117",
      newVersion: "4.0.0-rc.118",
      bumpType: "patch",
      causes: ["fixed"]
    },
    { name: "scratchpad", currentVersion: "0.0.0", newVersion: "0.0.0", bumpType: "patch", causes: ["dependencies"] }
  ]
}

/** Only dependents that do not move: pnpm lists them, but nothing is released. */
export const noOpPlan: ReleasePlan = {
  releases: [
    { name: "scratchpad", currentVersion: "0.0.0", newVersion: "0.0.0", bumpType: "patch", causes: ["dependencies"] }
  ]
}

export const emptyPlan: ReleasePlan = { releases: [] }

export const stagedItem = (packageName: string, version: string, status = "staged"): StagedItem => ({
  id: `stage-${packageName}-${version}`,
  packageName,
  version,
  tag: Option.some("rc"),
  status: Option.some(status)
})

/** Registry stage ids are UUIDs; pnpm refuses anything else, so the fixtures use real ones. */
export const EFFECT_STAGE_ID = "8a4f1c2e-3b6d-4e7f-9a1b-2c3d4e5f6a70"
export const VITEST_STAGE_ID = "1f2e3d4c-5b6a-4978-8f7e-6d5c4b3a2910"
export const LEDGER_SHA = "c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00"

/** A queue item with an explicit id, for manifest fixtures. */
export const stagedWithId = (
  id: string,
  packageName: string,
  version: string,
  status = "staged",
  tag: Option.Option<string> = Option.some("rc")
): StagedItem => ({ id, packageName, version, tag, status: Option.some(status) })

export const effectManifestPackage: ManifestPackage = {
  name: "effect",
  version: "4.0.0-rc.117",
  stageId: EFFECT_STAGE_ID
}

export const vitestManifestPackage: ManifestPackage = {
  name: "@effect/vitest",
  version: "4.0.0-rc.117",
  stageId: VITEST_STAGE_ID
}

/** The release of the two public fixture packages, packages sorted by name (`@` sorts before `e`). */
export const manifest: ReleaseManifest = {
  schema: 1,
  tag: "rc",
  sourceSha: LEDGER_SHA,
  packages: [vitestManifestPackage, effectManifestPackage]
}

/** The queue as it looks once both fixture packages are staged and scanned. */
export const manifestQueue: ReadonlyArray<StagedItem> = [
  stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117"),
  stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
]

export const otp = Redacted.make("123456")

// ---------------------------------------------------------------------------
// Call recording
// ---------------------------------------------------------------------------

export interface Call {
  readonly service: "git" | "github" | "pnpm" | "registry" | "workspace" | "approval" | "fs"
  readonly method: string
  readonly args: ReadonlyArray<unknown>
}

export interface Calls {
  readonly entries: Array<Call>
}

export const makeCalls = (): Calls => ({ entries: [] })

export const callNames = (calls: Calls): ReadonlyArray<string> =>
  calls.entries.map((call) => `${call.service}.${call.method}`)

export const callsTo = (calls: Calls, name: string): ReadonlyArray<Call> =>
  calls.entries.filter((call) => `${call.service}.${call.method}` === name)

const track = (calls: Calls, service: Call["service"], method: string, ...args: ReadonlyArray<unknown>) =>
  Effect.sync(() => {
    calls.entries.push({ service, method, args })
  })

// ---------------------------------------------------------------------------
// Stub layers
// ---------------------------------------------------------------------------

export const gitLayer = (calls: Calls, options?: {
  readonly headSha?: string
  readonly commitSha?: Option.Option<string>
  readonly ledgerSha?: string
  readonly pushFailure?: Effect.Effect<never, any> | undefined
  /** Files served by `showFile` for `origin/main`, keyed by workspace-relative path. */
  readonly onMain?: ReadonlyMap<string, string> | undefined
}) =>
  Layer.succeed(
    Git,
    Git.of({
      headSha: track(calls, "git", "headSha").pipe(Effect.as(options?.headSha ?? "0123456789abcdef")),
      resetBranch: (branch, from) => track(calls, "git", "resetBranch", branch, from),
      commitAll: (message) =>
        track(calls, "git", "commitAll", message).pipe(
          Effect.as(options?.commitSha ?? Option.some("fedcba9876543210"))
        ),
      pushForce: (branch) =>
        track(calls, "git", "pushForce", branch).pipe(Effect.andThen(options?.pushFailure ?? Effect.void)),
      checkout: (ref) => track(calls, "git", "checkout", ref),
      lastCommitTouching: (path) =>
        track(calls, "git", "lastCommitTouching", path).pipe(Effect.as(options?.ledgerSha ?? LEDGER_SHA)),
      showFile: (ref, path) =>
        track(calls, "git", "showFile", ref, path).pipe(
          Effect.as(ref === "origin/main" ? Option.fromNullishOr(options?.onMain?.get(path)) : Option.none())
        ),
      commitPaths: (message, paths) =>
        track(calls, "git", "commitPaths", message, paths).pipe(
          Effect.as(options?.commitSha ?? Option.some("fedcba9876543210"))
        )
    })
  )

export const pnpmLayer = (calls: Calls, options: {
  readonly plan: ReleasePlan
  readonly applied?: ReadonlyArray<AppliedVersion>
  readonly applyFailure?: Effect.Effect<never, any> | undefined
}) =>
  Layer.succeed(
    Pnpm,
    Pnpm.of({
      dryRunPlan: track(calls, "pnpm", "dryRunPlan").pipe(Effect.as(options.plan)),
      applyVersions: track(calls, "pnpm", "applyVersions").pipe(
        Effect.andThen(options.applyFailure ?? Effect.succeed(options.applied ?? []))
      ),
      stagePublish: (input) =>
        track(calls, "pnpm", "stagePublish", input).pipe(
          Effect.as(
            input.packages.map((name): StagedPackage => ({
              name,
              version: "4.0.0-rc.117",
              stageId: input.dryRun ? Option.none() : Option.some(`stage-${name}`)
            }))
          )
        )
    })
  )

export const pullRequest = (overrides?: Partial<PullRequest>): PullRequest => ({
  number: 8400,
  url: "https://github.com/Effect-TS/effect/pull/8400",
  headRef: "changeset-release/main",
  baseRef: "main",
  title: "Version Packages (rc)",
  body: "old body",
  ...overrides
})

export const githubLayer = (calls: Calls, options?: { readonly existing?: PullRequest }) =>
  Layer.succeed(
    GitHub,
    GitHub.of({
      findPullRequest: (query) =>
        track(calls, "github", "findPullRequest", query).pipe(Effect.as(Option.fromUndefinedOr(options?.existing))),
      createPullRequest: (input) =>
        track(calls, "github", "createPullRequest", input).pipe(
          Effect.as(pullRequest({ number: 8401, url: "https://github.com/Effect-TS/effect/pull/8401", ...input }))
        ),
      updatePullRequest: (number, input) =>
        track(calls, "github", "updatePullRequest", number, input).pipe(
          Effect.as(pullRequest({ ...options?.existing, number, ...input }))
        )
    })
  )

export const registryLayer = (calls: Calls, options: {
  readonly published: ReadonlySet<string>
  readonly staged?: ReadonlyArray<StagedItem> | undefined
}) =>
  Layer.succeed(
    Registry,
    Registry.of({
      isPublished: (name, version) =>
        track(calls, "registry", "isPublished", name, version).pipe(
          Effect.as(options.published.has(`${name}@${version}`))
        ),
      listStaged: track(calls, "registry", "listStaged").pipe(Effect.as(options.staged ?? []))
    })
  )

export const workspaceLayer = (calls: Calls, list: ReadonlyArray<WorkspacePackage> = packages) =>
  Layer.succeed(
    Workspace,
    Workspace.of({
      packages: track(calls, "workspace", "packages").pipe(Effect.as(list))
    })
  )

/**
 * `viewStaged` answers from `items` by id; `approve` records the id and the
 * OTP value, fails with `approveFailure` for ids in `failing`, and otherwise
 * moves the item to `published` in `items` so a later `listStaged` from
 * {@link registryLayer} built over the same array sees the change.
 */
export const stageApprovalLayer = (calls: Calls, options?: {
  readonly items?: Array<StagedItem>
  /** Items `viewStaged` can see that `listStaged` no longer returns (left the queue). */
  readonly viewable?: ReadonlyArray<StagedItem> | undefined
  readonly failing?: ReadonlySet<string> | undefined
  readonly onApproved?: (id: string) => void
}) =>
  Layer.succeed(
    StageApproval,
    StageApproval.of({
      viewStaged: (id) =>
        track(calls, "approval", "viewStaged", id).pipe(
          Effect.as(Option.fromUndefinedOr(
            options?.items?.find((item) => item.id === id) ?? options?.viewable?.find((item) => item.id === id)
          ))
        ),
      approve: (id, otp) =>
        track(calls, "approval", "approve", id, Redacted.value(otp)).pipe(
          Effect.flatMap(() =>
            options?.failing?.has(id)
              ? Effect.fail(new ReleaseError({ message: `Failed to approve staged package ${id} (status 403)` }))
              : Effect.sync(() => options?.onApproved?.(id))
          )
        )
    })
  )

/**
 * A file system that serves `files` (workspace-relative path → content) and
 * records writes; `exists` and `readFileString` work on the same map, so a
 * write becomes visible to later reads within the test.
 */
export const fileSystemLayer = (calls: Calls, files: Map<string, string> = new Map()) => {
  const relative = (path: string) => path.replace(/^.*?(?=\.release\/|\.changeset\/|pnpm-workspace\.yaml)/, "")
  return Layer.succeed(
    FileSystem.FileSystem,
    FileSystem.makeNoop({
      exists: (path) => Effect.succeed(path.endsWith("pnpm-workspace.yaml") || files.has(relative(path))),
      readFileString: (path) =>
        Effect.suspend(() => {
          const content = files.get(relative(path))
          return content === undefined
            ? Effect.fail(
              new PlatformError.PlatformError(
                new PlatformError.BadArgument({ module: "FileSystem", method: "readFileString", description: path })
              )
            )
            : Effect.succeed(content)
        }),
      makeDirectory: (path) => track(calls, "fs", "makeDirectory", relative(path)),
      writeFileString: (path, content) =>
        track(calls, "fs", "writeFileString", relative(path), content).pipe(
          Effect.tap(() => Effect.sync(() => files.set(relative(path), content)))
        )
    })
  )
}
