import { Publication } from "@effect/release/Publication"
import * as PublishPullRequest from "@effect/release/PublishPullRequest"
import type { StagedItem } from "@effect/release/Registry"
import * as ReleaseManifest from "@effect/release/ReleaseManifest"
import { versionKey } from "@effect/release/Routing"
import type { WorkspacePackage } from "@effect/release/Workspace"
import { assert, describe, it } from "@effect/vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import { TestClock } from "effect/testing"
import {
  callNames,
  callsTo,
  EFFECT_STAGE_ID,
  fileSystemLayer,
  githubLayer,
  gitLayer,
  LEDGER_SHA,
  makeCalls,
  manifest,
  manifestQueue,
  otp,
  packages,
  pullRequest,
  registryLayer,
  stageApprovalLayer,
  stagedWithId,
  VITEST_STAGE_ID,
  workspaceLayer
} from "./utils.ts"

/** Computed lazily so that an unimplemented member fails the test that needs it, not the whole file. */
const identity = () => ReleaseManifest.identity(manifest)

/** The real orchestrator over stubbed git, GitHub, registry, approval, workspace and file system. */
const app = (options: {
  readonly staged?: Array<StagedItem>
  /** Items that left the queue but `viewStaged` still returns. */
  readonly viewable?: ReadonlyArray<StagedItem>
  readonly published?: Set<string>
  /** The manifest merged on `origin/main`, if any. */
  readonly merged?: ReleaseManifest.ReleaseManifest
  /** Files in the working tree (never where the merged manifest is read from). */
  readonly files?: Map<string, string>
  readonly workspace?: ReadonlyArray<WorkspacePackage>
  readonly existing?: ReturnType<typeof pullRequest>
  readonly failing?: ReadonlySet<string>
  /** Whether approving marks the version public in the registry stub (default: yes). */
  readonly publishOnApprove?: boolean
  /** Whether `NPM_STAGE_TOKEN` is configured (default: yes). */
  readonly stageToken?: boolean
}) => {
  const calls = makeCalls()
  const published = options.published ?? new Set<string>()
  const staged = options.staged ?? []
  const byId = new Map([...staged, ...(options.viewable ?? [])].map((item) => [item.id, item]))
  const onMain = options.merged === undefined
    ? undefined
    : new Map([[ReleaseManifest.MANIFEST_PATH, ReleaseManifest.encode(options.merged)]])
  const layer = Publication.layer.pipe(
    Layer.provideMerge(Layer.mergeAll(
      gitLayer(calls, { headSha: "abc123", onMain }),
      githubLayer(calls, options.existing === undefined ? undefined : { existing: options.existing }),
      registryLayer(calls, { published, staged }),
      stageApprovalLayer(calls, {
        items: staged,
        viewable: options.viewable,
        failing: options.failing,
        onApproved: (id) => {
          const item = byId.get(id)
          if (item !== undefined && options.publishOnApprove !== false) {
            published.add(versionKey(item.packageName, item.version))
          }
        }
      }),
      workspaceLayer(calls, options.workspace ?? packages),
      fileSystemLayer(calls, options.files),
      Path.layer
    )),
    Layer.provideMerge(
      ConfigProvider.layer(
        ConfigProvider.fromEnv({ env: options.stageToken === false ? {} : { NPM_STAGE_TOKEN: "stage-token" } })
      )
    )
  )
  return { calls, layer, published, staged }
}

const mutationNames = (calls: ReturnType<typeof makeCalls>) =>
  callNames(calls).filter((name) =>
    name.startsWith("git.") && name !== "git.headSha" && name !== "git.lastCommitTouching" &&
      name !== "git.showFile" ||
    name.startsWith("github.create") || name.startsWith("github.update") ||
    name.startsWith("fs.write") || name.startsWith("fs.makeDirectory") ||
    name === "approval.approve"
  )

describe("Publication.readiness", () => {
  it.effect("is Idle when every public version is already published", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        published: new Set([versionKey("effect", "4.0.0-rc.117"), versionKey("@effect/vitest", "4.0.0-rc.117")])
      })
      const result = yield* Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      assert.strictEqual(result._tag, "Idle")
      assert.deepStrictEqual(mutationNames(calls), [])
      assert.deepStrictEqual(callsTo(calls, "github.findPullRequest"), [])
    }))

  it.effect("is Idle when nothing is staged and nothing is published (a Stage run is still due)", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({})
      const result = yield* Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      assert.oneOf(result._tag, ["Idle", "Incomplete"])
      assert.deepStrictEqual(mutationNames(calls), [])
    }))

  it.effect("reports Incomplete when an unpublished public package has no staged upload", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({ staged: [stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")] })
      const result = yield* Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      assert.strictEqual(result._tag, "Incomplete")
      if (result._tag === "Incomplete") {
        assert.deepStrictEqual(result.missing, [{ name: "effect", version: "4.0.0-rc.117" }])
      }
      assert.deepStrictEqual(mutationNames(calls), [])
      assert.deepStrictEqual(callsTo(calls, "github.findPullRequest"), [])
    }))

  it.effect("leaves an authorised release alone while its pinned items are still in the queue", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117")],
        published: new Set([versionKey("@effect/vitest", "4.0.0-rc.117")]),
        merged: manifest
      })
      const result = yield* Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      assert.strictEqual(result._tag, "InProgress")
      if (result._tag === "InProgress") {
        assert.strictEqual(result.identity, identity())
        assert.deepStrictEqual(result.remaining.map((pkg) => pkg.name), ["effect"])
      }
      assert.deepStrictEqual(mutationNames(calls), [])
      assert.deepStrictEqual(callsTo(calls, "github.findPullRequest"), [])
    }))

  it.effect("reads the authorised release from origin/main, not from the working tree", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117")],
        published: new Set([versionKey("@effect/vitest", "4.0.0-rc.117")]),
        files: new Map([[ReleaseManifest.MANIFEST_PATH, ReleaseManifest.encode(manifest)]])
      })
      const result = yield* Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      assert.notStrictEqual(result._tag, "InProgress")
      assert.deepStrictEqual(callsTo(calls, "git.showFile").map((call) => call.args), [
        ["origin/main", ReleaseManifest.MANIFEST_PATH]
      ])
    }))

  it.effect("reports a stalled authorised release with its blockers instead of waiting forever", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "blocked")],
        published: new Set([versionKey("@effect/vitest", "4.0.0-rc.117")]),
        merged: manifest
      })
      const result = yield* Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      assert.strictEqual(result._tag, "Stalled")
      if (result._tag === "Stalled") {
        assert.strictEqual(result.identity, identity())
        assert.deepStrictEqual(result.blockers.map((pkg) => [pkg.name, pkg.state]), [["effect", "blocked"]])
        assert.include(result.blockers[0].detail, "blocked")
      }
      assert.deepStrictEqual(mutationNames(calls), [])
      assert.deepStrictEqual(callsTo(calls, "github.findPullRequest"), [])
    }))

  it.effect("stays InProgress while a pinned upload is still validating", () =>
    Effect.gen(function*() {
      const { layer } = app({
        staged: [stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "validating")],
        published: new Set([versionKey("@effect/vitest", "4.0.0-rc.117")]),
        merged: manifest
      })
      const result = yield* Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      assert.strictEqual(result._tag, "InProgress")
    }))

  it.effect("counts the remaining packages against the manifest versions, not the workspace's", () =>
    Effect.gen(function*() {
      const bumped = packages.map((pkg) => pkg.private ? pkg : { ...pkg, version: "4.0.0-rc.118" })
      const { layer } = app({
        staged: [stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")],
        published: new Set([versionKey("effect", "4.0.0-rc.117")]),
        merged: manifest,
        workspace: bumped
      })
      const result = yield* Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      assert.strictEqual(result._tag, "InProgress")
      if (result._tag === "InProgress") {
        assert.deepStrictEqual(result.remaining.map((pkg) => pkg.name), ["@effect/vitest"])
      }
    }))

  it.effect("fails naming NPM_STAGE_TOKEN before touching the registry or GitHub when it is absent", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({ staged: [...manifestQueue], stageToken: false })
      const error = yield* Effect.flip(
        Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      )
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "NPM_STAGE_TOKEN")
      assert.deepStrictEqual(
        callNames(calls).filter((name) => name.startsWith("registry.") || name.startsWith("github.")),
        []
      )
      assert.deepStrictEqual(mutationNames(calls), [])
    }))

  it.effect("opens the publish PR with the manifest once every upload is approvable", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({ staged: [...manifestQueue] })
      const result = yield* Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      assert.strictEqual(result._tag, "Ready")
      if (result._tag === "Ready") {
        assert.strictEqual(result.identity, identity())
        assert.deepStrictEqual(result.manifest, manifest)
        assert.strictEqual(result.pullRequest._tag, "Created")
      }
      assert.deepStrictEqual(callsTo(calls, "git.lastCommitTouching")[0].args, [ReleaseManifest.LEDGER_PATH])
      assert.deepStrictEqual(callsTo(calls, "fs.writeFileString")[0].args, [
        ReleaseManifest.MANIFEST_PATH,
        ReleaseManifest.encode(manifest)
      ])
      assert.lengthOf(callsTo(calls, "github.createPullRequest"), 1)
      assert.deepStrictEqual(callsTo(calls, "approval.approve"), [])
    }))

  it.effect("is idempotent: a second run against the same queue changes nothing", () =>
    Effect.gen(function*() {
      const existing = pullRequest({
        headRef: "publish-release/main",
        title: "Publish Packages (rc)",
        body: PublishPullRequest.body(
          manifest,
          { _tag: "Ready", packages: manifest.packages.map((pkg) => ({ ...pkg, state: "approvable", detail: "" })) }
        )
      })
      const { calls, layer } = app({ staged: [...manifestQueue], existing })
      const result = yield* Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      assert.strictEqual(result._tag, "Ready")
      if (result._tag === "Ready") {
        assert.strictEqual(result.pullRequest._tag, "NoChanges")
      }
      assert.deepStrictEqual(mutationNames(calls), [])
    }))

  it.effect("opens nothing while an upload is still validating", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [
          stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "validating"),
          stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
        ]
      })
      const result = yield* Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      assert.strictEqual(result._tag, "NotReady")
      if (result._tag === "NotReady") {
        assert.deepStrictEqual(result.blockers.map((pkg) => [pkg.name, pkg.state]), [["effect", "pending"]])
        assert.isTrue(result.pullRequest._tag === "None")
      }
      assert.deepStrictEqual(mutationNames(calls), [])
    }))

  it.effect("marks the open PR when a previously ready release regresses", () =>
    Effect.gen(function*() {
      const existing = pullRequest({ number: 8500, headRef: "publish-release/main", title: "Publish Packages (rc)" })
      const { calls, layer } = app({
        staged: [
          stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "blocked"),
          stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
        ],
        existing
      })
      const result = yield* Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      assert.strictEqual(result._tag, "NotReady")
      if (result._tag === "NotReady") {
        assert.strictEqual(result.pullRequest._tag, "Some")
      }
      assert.deepStrictEqual(mutationNames(calls), ["github.updatePullRequest"])
      const [, input] = callsTo(calls, "github.updatePullRequest")[0].args as [number, { title: string }]
      assert.strictEqual(input.title, "Publish Packages (rc) [not ready]")
    }))

  it.effect("fails before GitHub when a stale version sits in the queue", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [...manifestQueue, stagedWithId("7c6b5a49-3827-4165-9f0e-1d2c3b4a5968", "effect", "4.0.0-rc.116")]
      })
      const error = yield* Effect.flip(
        Effect.provide(Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc" })), layer)
      )
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "4.0.0-rc.116")
      assert.deepStrictEqual(mutationNames(calls), [])
      assert.deepStrictEqual(callsTo(calls, "github.findPullRequest"), [])
    }))

  it.effect("previews the PR on a dry run without touching git or GitHub", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({ staged: [...manifestQueue] })
      const result = yield* Effect.provide(
        Effect.flatMap(Publication, (p) => p.readiness({ tag: "rc", dryRun: true })),
        layer
      )
      assert.strictEqual(result._tag, "ReadinessDryRun")
      if (result._tag === "ReadinessDryRun") {
        assert.strictEqual(result.identity, identity())
        assert.strictEqual(result.title, "Publish Packages (rc)")
        assert.include(result.body, identity())
      }
      assert.deepStrictEqual(
        callNames(calls).filter((name) => name.startsWith("github.") || name.startsWith("fs.write")),
        []
      )
      assert.deepStrictEqual(mutationNames(calls), [])
    }))
})

const publish = (options: { readonly expectedIdentity?: string; readonly dryRun?: boolean } = {}) =>
  Effect.flatMap(
    Publication,
    (p) => p.publish({ expectedIdentity: options.expectedIdentity ?? identity(), otp, dryRun: options.dryRun })
  )

describe("Publication.publish", () => {
  it.effect("approves every pinned upload in manifest order and confirms each is public", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({ staged: [...manifestQueue], merged: manifest })
      const result = yield* Effect.provide(publish(), layer)
      assert.strictEqual(result._tag, "Published")
      if (result._tag === "Published") {
        assert.strictEqual(result.identity, identity())
        assert.deepStrictEqual(result.approved.map((pkg) => pkg.name), ["@effect/vitest", "effect"])
        assert.deepStrictEqual(result.alreadyPublic, [])
        assert.strictEqual(result.websiteRevision, LEDGER_SHA)
      }
      assert.deepStrictEqual(callsTo(calls, "approval.approve").map((call) => call.args), [
        [VITEST_STAGE_ID, "123456"],
        [EFFECT_STAGE_ID, "123456"]
      ])
      const confirmed = callsTo(calls, "registry.isPublished").map((call) => call.args.join("@"))
      assert.include(confirmed, "effect@4.0.0-rc.117")
      assert.include(confirmed, "@effect/vitest@4.0.0-rc.117")
      assert.deepStrictEqual(
        callNames(calls).filter((name) => name.startsWith("pnpm.") || name.startsWith("github.")),
        []
      )
    }))

  it.effect("refuses a manifest whose identity is not the one that was approved, before any registry call", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({ staged: [...manifestQueue], merged: manifest })
      const error = yield* Effect.flip(Effect.provide(publish({ expectedIdentity: "0000000000000000" }), layer))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "0000000000000000")
      assert.include(error.message, identity())
      assert.deepStrictEqual(
        callNames(calls).filter((name) => name.startsWith("registry.") || name.startsWith("approval.")),
        []
      )
    }))

  it.effect("fails when no manifest has been merged", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({ staged: [...manifestQueue] })
      const error = yield* Effect.flip(Effect.provide(publish(), layer))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, ReleaseManifest.MANIFEST_PATH)
      assert.deepStrictEqual(callsTo(calls, "approval.approve"), [])
    }))

  it.effect("refuses a manifest that only exists in the working tree, before any registry call", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [...manifestQueue],
        files: new Map([[ReleaseManifest.MANIFEST_PATH, ReleaseManifest.encode(manifest)]])
      })
      const error = yield* Effect.flip(Effect.provide(publish(), layer))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, ReleaseManifest.MANIFEST_PATH)
      assert.deepStrictEqual(callsTo(calls, "git.showFile").map((call) => call.args), [
        ["origin/main", ReleaseManifest.MANIFEST_PATH]
      ])
      assert.deepStrictEqual(
        callNames(calls).filter((name) => name.startsWith("registry.") || name.startsWith("approval.")),
        []
      )
    }))

  it.effect("fails naming NPM_STAGE_TOKEN before any registry or approval call when it is absent", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({ staged: [...manifestQueue], merged: manifest, stageToken: false })
      const error = yield* Effect.flip(Effect.provide(publish(), layer))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "NPM_STAGE_TOKEN")
      assert.deepStrictEqual(
        callNames(calls).filter((name) => name.startsWith("registry.") || name.startsWith("approval.")),
        []
      )
    }))

  it.effect("rechecks the whole release and approves nothing while any upload is not ready", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [
          stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "validating"),
          stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
        ],
        merged: manifest
      })
      const error = yield* Effect.flip(Effect.provide(publish(), layer))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "effect")
      assert.include(error.message, "validating")
      assert.deepStrictEqual(callsTo(calls, "approval.approve"), [])
    }))

  it.effect("approves nothing, at once, when a pinned upload is gone from the queue and unknown to the registry", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")],
        merged: manifest
      })
      const error = yield* Effect.flip(Effect.provide(publish(), layer))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "effect")
      assert.deepStrictEqual(callsTo(calls, "approval.viewStaged").map((call) => call.args), [[EFFECT_STAGE_ID]])
      assert.deepStrictEqual(callsTo(calls, "approval.approve"), [])
    }))

  it.effect("finishes a release whose approved upload left the queue before the registry served it", () =>
    Effect.gen(function*() {
      // A previous run approved `effect` and was interrupted before the confirm poll finished:
      // the item is no longer listed, `viewStaged` still knows it, and the version is not served yet.
      const { calls, layer, published } = app({
        staged: [stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")],
        viewable: [stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "published")],
        merged: manifest
      })
      const fiber = yield* Effect.forkChild(Effect.provide(publish(), layer))
      yield* TestClock.adjust("15 seconds")
      assert.deepStrictEqual(callsTo(calls, "approval.approve"), [], "nothing is approved until the gap is resolved")
      published.add(versionKey("effect", "4.0.0-rc.117"))
      yield* TestClock.adjust("15 seconds")
      yield* TestClock.adjust("15 seconds")
      const result = yield* Fiber.join(fiber)
      assert.strictEqual(result._tag, "Published")
      if (result._tag === "Published") {
        assert.deepStrictEqual(result.approved.map((pkg) => pkg.name), ["@effect/vitest"])
        assert.deepStrictEqual(result.alreadyPublic.map((pkg) => pkg.name), ["effect"])
      }
      assert.deepStrictEqual(callsTo(calls, "approval.approve").map((call) => call.args[0]), [VITEST_STAGE_ID])
      const names = callNames(calls)
      assert.isAbove(
        names.indexOf("approval.approve"),
        names.lastIndexOf("approval.viewStaged"),
        "the gap is resolved before anything is approved"
      )
    }))

  it.effect("approves nothing when a vanished upload never becomes public", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")],
        viewable: [stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "published")],
        merged: manifest
      })
      const fiber = yield* Effect.forkChild(Effect.flip(Effect.provide(publish(), layer)))
      yield* TestClock.adjust("11 minutes")
      const error = yield* Fiber.join(fiber)
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "effect")
      assert.deepStrictEqual(callsTo(calls, "approval.approve"), [])
    }))

  it.effect("does not wait for a vanished upload when another blocker exists", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117", "validating")],
        viewable: [stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "published")],
        merged: manifest
      })
      const error = yield* Effect.flip(Effect.provide(publish(), layer))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "@effect/vitest")
      assert.include(error.message, "validating")
      assert.deepStrictEqual(callsTo(calls, "approval.approve"), [])
    }))

  it.effect("ignores newer queue contents: only the pinned ids are ever approved", () =>
    Effect.gen(function*() {
      const restaged = "3b2a1908-7f6e-4d5c-9b4a-3f2e1d0c9b8a"
      const { calls, layer } = app({
        staged: [...manifestQueue, stagedWithId(restaged, "effect", "4.0.0-rc.118")],
        merged: manifest
      })
      yield* Effect.provide(publish(), layer)
      assert.deepStrictEqual(callsTo(calls, "approval.approve").map((call) => call.args[0]), [
        VITEST_STAGE_ID,
        EFFECT_STAGE_ID
      ])
    }))

  it.effect("finishes a partially published release: verifies public versions and approves only the rest", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117")],
        published: new Set([versionKey("@effect/vitest", "4.0.0-rc.117")]),
        merged: manifest
      })
      const result = yield* Effect.provide(publish(), layer)
      assert.strictEqual(result._tag, "Published")
      if (result._tag === "Published") {
        assert.deepStrictEqual(result.approved.map((pkg) => pkg.name), ["effect"])
        assert.deepStrictEqual(result.alreadyPublic.map((pkg) => pkg.name), ["@effect/vitest"])
        assert.strictEqual(result.websiteRevision, LEDGER_SHA)
      }
      assert.deepStrictEqual(callsTo(calls, "approval.approve").map((call) => call.args[0]), [EFFECT_STAGE_ID])
    }))

  it.effect("approves nothing and still reports the website revision when everything is already public", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        published: new Set([versionKey("effect", "4.0.0-rc.117"), versionKey("@effect/vitest", "4.0.0-rc.117")]),
        merged: manifest
      })
      const result = yield* Effect.provide(publish(), layer)
      assert.deepStrictEqual(result, { _tag: "AlreadyPublished", identity: identity(), websiteRevision: LEDGER_SHA })
      assert.deepStrictEqual(callsTo(calls, "approval.approve"), [])
    }))

  it.effect("stops at the first failed approval and names what is approved and what remains", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [...manifestQueue],
        merged: manifest,
        failing: new Set([VITEST_STAGE_ID])
      })
      const error = yield* Effect.flip(Effect.provide(publish(), layer))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "@effect/vitest")
      assert.include(error.message, "effect")
      assert.deepStrictEqual(callsTo(calls, "approval.approve").map((call) => call.args[0]), [VITEST_STAGE_ID])
    }))

  it.effect("waits for the registry to serve an approved version before reporting success", () =>
    Effect.gen(function*() {
      const { calls, layer, published } = app({ staged: [...manifestQueue], merged: manifest, publishOnApprove: false })
      const fiber = yield* Effect.forkChild(Effect.provide(publish(), layer))
      yield* TestClock.adjust("15 seconds")
      const before = callsTo(calls, "registry.isPublished").length
      yield* TestClock.adjust("15 seconds")
      assert.isAbove(callsTo(calls, "registry.isPublished").length, before)
      published.add(versionKey("effect", "4.0.0-rc.117"))
      published.add(versionKey("@effect/vitest", "4.0.0-rc.117"))
      yield* TestClock.adjust("15 seconds")
      const result = yield* Fiber.join(fiber)
      assert.strictEqual(result._tag, "Published")
    }))

  it.effect("fails naming the unconfirmed packages when the registry never serves an approved version", () =>
    Effect.gen(function*() {
      const { layer } = app({ staged: [...manifestQueue], merged: manifest, publishOnApprove: false })
      const fiber = yield* Effect.forkChild(Effect.flip(Effect.provide(publish(), layer)))
      yield* TestClock.adjust("11 minutes")
      const error = yield* Fiber.join(fiber)
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "effect")
      assert.include(error.message, "@effect/vitest")
    }))

  it.effect("previews the approvals on a dry run without approving", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({
        staged: [stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117")],
        published: new Set([versionKey("@effect/vitest", "4.0.0-rc.117")]),
        merged: manifest
      })
      const result = yield* Effect.provide(publish({ dryRun: true }), layer)
      assert.strictEqual(result._tag, "PublishDryRun")
      if (result._tag === "PublishDryRun") {
        assert.deepStrictEqual(result.toApprove.map((pkg) => pkg.name), ["effect"])
        assert.deepStrictEqual(result.alreadyPublic.map((pkg) => pkg.name), ["@effect/vitest"])
      }
      assert.deepStrictEqual(callsTo(calls, "approval.approve"), [])
    }))

  it.effect("never versions, builds or stages at publication time", () =>
    Effect.gen(function*() {
      const { calls, layer } = app({ staged: [...manifestQueue], merged: manifest })
      yield* Effect.provide(publish(), layer)
      assert.deepStrictEqual(
        callNames(calls).filter((name) =>
          name.startsWith("pnpm.") || (name.startsWith("git.") && name !== "git.showFile") || name.startsWith("github.")
        ),
        []
      )
    }))
})
