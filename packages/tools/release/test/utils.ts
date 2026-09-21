import { Git } from "@effect/release/Git"
import { GitHub, type PullRequest } from "@effect/release/GitHub"
import { Pnpm, type StagedPackage } from "@effect/release/Pnpm"
import { Registry, type StagedItem } from "@effect/release/Registry"
import type { AppliedVersion, ReleasePlan } from "@effect/release/ReleasePlan"
import { Workspace, type WorkspacePackage } from "@effect/release/Workspace"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

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

// ---------------------------------------------------------------------------
// Call recording
// ---------------------------------------------------------------------------

export interface Call {
  readonly service: "git" | "github" | "pnpm" | "registry" | "workspace"
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
      pushForce: (branch) => track(calls, "git", "pushForce", branch),
      checkout: (ref) => track(calls, "git", "checkout", ref)
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
