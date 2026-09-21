import * as PublishPullRequest from "@effect/release/PublishPullRequest"
import * as Readiness from "@effect/release/Readiness"
import * as ReleaseManifest from "@effect/release/ReleaseManifest"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
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
  pullRequest,
  stagedWithId,
  VITEST_STAGE_ID
} from "./utils.ts"

// Computed lazily so that an unimplemented member fails the test that needs it, not the whole file.
const ready = () => Readiness.assess({ manifest, staged: manifestQueue, published: new Set() })
const notReady = () =>
  Readiness.assess({
    manifest,
    staged: [
      stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "validating"),
      stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
    ],
    published: new Set()
  })
const identity = () => ReleaseManifest.identity(manifest)
const marker = () => `<!-- ${PublishPullRequest.IDENTITY_MARKER}: ${identity()} -->`

describe("PublishPullRequest.title", () => {
  it("names the dist-tag and flags an unready release", () => {
    assert.strictEqual(PublishPullRequest.title(manifest, ready()), "Publish Packages (rc)")
    assert.strictEqual(PublishPullRequest.title(manifest, notReady()), "Publish Packages (rc) [not ready]")
    assert.strictEqual(PublishPullRequest.title({ ...manifest, tag: "latest" }, ready()), "Publish Packages")
  })
})

describe("PublishPullRequest.body", () => {
  it("pins the identity(), the source commit and every package with its stage id", () => {
    const body = PublishPullRequest.body(manifest, ready())
    assert.isTrue(body.startsWith(PublishPullRequest.BODY_INTRO))
    assert.include(body, marker())
    assert.include(body, "## Release")
    assert.include(body, identity())
    assert.include(body, LEDGER_SHA)
    assert.include(body, "`rc`")
    assert.include(body, "## Packages")
    for (const pkg of manifest.packages) {
      assert.include(body, pkg.name)
      assert.include(body, pkg.version)
      assert.include(body, pkg.stageId)
    }
    assert.include(body, "approvable")
    assert.notInclude(body, "## Blockers")
    assert.strictEqual(body, PublishPullRequest.body(manifest, ready()))
    assert.deepStrictEqual(PublishPullRequest.identityFromBody(body), Option.some(identity()))
  })

  it("lists blockers when the release is not ready", () => {
    const body = PublishPullRequest.body(manifest, notReady())
    assert.include(body, marker())
    assert.include(body, "## Blockers")
    assert.include(body, "effect")
    assert.include(body, "validating")
  })

  it("finds no identity in a body without the marker", () => {
    assert.deepStrictEqual(PublishPullRequest.identityFromBody("old body"), Option.none())
    assert.deepStrictEqual(PublishPullRequest.identityFromBody(`<!-- release-manifest: -->`), Option.none())
  })
})

const environment = (calls: ReturnType<typeof makeCalls>, files?: Map<string, string>) =>
  Layer.mergeAll(fileSystemLayer(calls, files), Path.layer)

describe("PublishPullRequest.sync", () => {
  it.effect("commits the manifest on the publish branch and opens the PR when none exists", () =>
    Effect.gen(function*() {
      const calls = makeCalls()
      const files = new Map<string, string>()
      const result = yield* PublishPullRequest.sync(manifest, ready()).pipe(
        Effect.provide(
          Layer.mergeAll(gitLayer(calls, { headSha: "abc123" }), githubLayer(calls), environment(calls, files))
        )
      )
      assert.strictEqual(result._tag, "Created")

      const names = callNames(calls)
      const order = [
        "git.resetBranch",
        "fs.writeFileString",
        "git.commitAll",
        "git.pushForce",
        "github.createPullRequest"
      ]
      const positions = order.map((name) => names.indexOf(name))
      assert.deepStrictEqual([...positions].sort((a, b) => a - b), positions, names.join(","))
      assert.isTrue(positions.every((index) => index !== -1), names.join(","))
      assert.strictEqual(names.at(-1), "git.checkout")

      assert.deepStrictEqual(callsTo(calls, "git.resetBranch")[0].args, ["publish-release/main", "main"])
      assert.deepStrictEqual(callsTo(calls, "fs.writeFileString")[0].args, [
        ReleaseManifest.MANIFEST_PATH,
        ReleaseManifest.encode(manifest)
      ])
      assert.deepStrictEqual(callsTo(calls, "git.commitAll")[0].args, ["Publish Packages"])
      assert.deepStrictEqual(callsTo(calls, "git.pushForce")[0].args, ["publish-release/main"])
      assert.deepStrictEqual(callsTo(calls, "git.checkout")[0].args, ["abc123"])
      assert.deepStrictEqual(callsTo(calls, "github.findPullRequest")[0].args, [{
        head: "publish-release/main",
        base: "main"
      }])
      const [input] = callsTo(calls, "github.createPullRequest")[0].args as [
        { head: string; base: string; title: string; body: string }
      ]
      assert.strictEqual(input.head, "publish-release/main")
      assert.strictEqual(input.base, "main")
      assert.strictEqual(input.title, "Publish Packages (rc)")
      assert.include(input.body, marker())
      assert.strictEqual(files.get(ReleaseManifest.MANIFEST_PATH), ReleaseManifest.encode(manifest))
    }))

  it.effect("is a no-op when the open PR already carries this identity", () =>
    Effect.gen(function*() {
      const calls = makeCalls()
      const existing = pullRequest({
        headRef: "publish-release/main",
        title: "Publish Packages (rc)",
        body: PublishPullRequest.body(manifest, ready())
      })
      const result = yield* PublishPullRequest.sync(manifest, ready()).pipe(
        Effect.provide(Layer.mergeAll(gitLayer(calls), githubLayer(calls, { existing }), environment(calls)))
      )
      assert.strictEqual(result._tag, "NoChanges")
      assert.deepStrictEqual(callNames(calls).filter((name) => !name.startsWith("github.findPullRequest")), [])
    }))

  it.effect("refreshes the branch and the PR when the open PR describes another manifest", () =>
    Effect.gen(function*() {
      const calls = makeCalls()
      const stale = {
        ...manifest,
        packages: [manifest.packages[0], { ...manifest.packages[1], version: "4.0.0-rc.116" }]
      }
      const existing = pullRequest({
        number: 8500,
        headRef: "publish-release/main",
        title: "Publish Packages (rc)",
        body: PublishPullRequest.body(stale, Readiness.assess({ manifest: stale, staged: [], published: new Set() }))
      })
      const result = yield* PublishPullRequest.sync(manifest, ready()).pipe(
        Effect.provide(Layer.mergeAll(gitLayer(calls), githubLayer(calls, { existing }), environment(calls)))
      )
      assert.strictEqual(result._tag, "Updated")
      assert.lengthOf(callsTo(calls, "git.pushForce"), 1)
      assert.deepStrictEqual(callsTo(calls, "github.createPullRequest"), [])
      const [number, input] = callsTo(calls, "github.updatePullRequest")[0].args as [
        number,
        { title: string; body: string }
      ]
      assert.strictEqual(number, 8500)
      assert.strictEqual(input.title, "Publish Packages (rc)")
      assert.include(input.body, marker())
    }))

  it.effect("re-marks a previously unready PR as ready()", () =>
    Effect.gen(function*() {
      const calls = makeCalls()
      const existing = pullRequest({
        headRef: "publish-release/main",
        title: "Publish Packages (rc) [not ready]",
        body: PublishPullRequest.body(manifest, notReady())
      })
      const result = yield* PublishPullRequest.sync(manifest, ready()).pipe(
        Effect.provide(Layer.mergeAll(gitLayer(calls), githubLayer(calls, { existing }), environment(calls)))
      )
      assert.strictEqual(result._tag, "Updated")
      const [, input] = callsTo(calls, "github.updatePullRequest")[0].args as [number, { title: string; body: string }]
      assert.strictEqual(input.title, "Publish Packages (rc)")
      assert.notInclude(input.body, "## Blockers")
    }))

  it.effect("marks an open PR as not ready without touching git", () =>
    Effect.gen(function*() {
      const calls = makeCalls()
      const existing = pullRequest({
        number: 8500,
        headRef: "publish-release/main",
        title: "Publish Packages (rc)",
        body: PublishPullRequest.body(manifest, ready())
      })
      const result = yield* PublishPullRequest.sync(manifest, notReady()).pipe(
        Effect.provide(Layer.mergeAll(gitLayer(calls), githubLayer(calls, { existing }), environment(calls)))
      )
      assert.strictEqual(result._tag, "Marked")
      if (result._tag === "Marked") {
        assert.deepStrictEqual(result.blockers.map((pkg) => pkg.name), ["effect"])
      }
      assert.deepStrictEqual(callNames(calls).filter((name) => name.startsWith("git.") || name.startsWith("fs.")), [])
      const [number, input] = callsTo(calls, "github.updatePullRequest")[0].args as [
        number,
        { title: string; body: string }
      ]
      assert.strictEqual(number, 8500)
      assert.strictEqual(input.title, "Publish Packages (rc) [not ready]")
      assert.include(input.body, "## Blockers")
      assert.include(input.body, "validating")
    }))

  it.effect("creates nothing while the release is not ready", () =>
    Effect.gen(function*() {
      const calls = makeCalls()
      const result = yield* PublishPullRequest.sync(manifest, notReady()).pipe(
        Effect.provide(Layer.mergeAll(gitLayer(calls), githubLayer(calls), environment(calls)))
      )
      assert.strictEqual(result._tag, "Skipped")
      assert.deepStrictEqual(callNames(calls), ["github.findPullRequest"])
    }))

  it.effect("checks the original commit back out when the push fails", () =>
    Effect.gen(function*() {
      const calls = makeCalls()
      const error = yield* Effect.flip(
        PublishPullRequest.sync(manifest, ready()).pipe(
          Effect.provide(Layer.mergeAll(
            gitLayer(calls, { headSha: "abc123", pushFailure: Effect.fail(new Error("push rejected")) }),
            githubLayer(calls),
            environment(calls)
          ))
        )
      )
      assert.exists(error)
      assert.deepStrictEqual(callsTo(calls, "git.checkout")[0].args, ["abc123"])
      assert.deepStrictEqual(callsTo(calls, "github.createPullRequest"), [])
      assert.strictEqual(callNames(calls).at(-1), "git.checkout")
    }))
})
