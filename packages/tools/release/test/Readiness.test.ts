import * as Readiness from "@effect/release/Readiness"
import { versionKey } from "@effect/release/Routing"
import { assert, describe, it } from "@effect/vitest"
import * as Option from "effect/Option"
import {
  EFFECT_STAGE_ID,
  effectManifestPackage,
  manifest,
  manifestQueue,
  stagedWithId,
  VITEST_STAGE_ID,
  vitestManifestPackage
} from "./utils.ts"

const states = (readiness: Readiness.Readiness) => readiness.packages.map((pkg) => [pkg.name, pkg.state] as const)

describe("Readiness.assess", () => {
  it("is Ready when every pinned stage id is approvable", () => {
    const readiness = Readiness.assess({ manifest, staged: manifestQueue, published: new Set() })
    assert.strictEqual(readiness._tag, "Ready")
    assert.deepStrictEqual(states(readiness), [["@effect/vitest", "approvable"], ["effect", "approvable"]])
  })

  it("treats every documented approvable status as approvable and nothing else", () => {
    for (const status of Readiness.APPROVABLE_STATUSES) {
      const readiness = Readiness.assess({
        manifest,
        staged: [
          stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", status),
          stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117", status)
        ],
        published: new Set()
      })
      assert.strictEqual(readiness._tag, "Ready", status)
    }
    assert.isFalse(Readiness.APPROVABLE_STATUSES.has("validating"))
    assert.isFalse(Readiness.APPROVABLE_STATUSES.has("published"))
  })

  it("is Ready when a package is already public, even without a queue item", () => {
    const readiness = Readiness.assess({
      manifest,
      staged: [stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")],
      published: new Set([versionKey("effect", "4.0.0-rc.117")])
    })
    assert.strictEqual(readiness._tag, "Ready")
    assert.deepStrictEqual(states(readiness), [["@effect/vitest", "approvable"], ["effect", "public"]])
  })

  it("is Ready with every package public after a completed publication", () => {
    const readiness = Readiness.assess({
      manifest,
      staged: [],
      published: new Set([versionKey("effect", "4.0.0-rc.117"), versionKey("@effect/vitest", "4.0.0-rc.117")])
    })
    assert.strictEqual(readiness._tag, "Ready")
    assert.deepStrictEqual(states(readiness), [["@effect/vitest", "public"], ["effect", "public"]])
  })

  it("is NotReady while a pinned item is still validating", () => {
    const readiness = Readiness.assess({
      manifest,
      staged: [
        stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "validating"),
        stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
      ],
      published: new Set()
    })
    assert.strictEqual(readiness._tag, "NotReady")
    if (readiness._tag === "NotReady") {
      assert.deepStrictEqual(readiness.blockers.map((pkg) => [pkg.name, pkg.state]), [["effect", "pending"]])
      assert.include(readiness.blockers[0].detail, "validating")
      assert.lengthOf(readiness.packages, 2)
    }
  })

  it("is NotReady when a pinned stage id is missing from the queue", () => {
    const readiness = Readiness.assess({
      manifest,
      staged: [stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")],
      published: new Set()
    })
    assert.strictEqual(readiness._tag, "NotReady")
    if (readiness._tag === "NotReady") {
      assert.deepStrictEqual(readiness.blockers.map((pkg) => [pkg.name, pkg.state]), [["effect", "missing"]])
    }
  })

  it("is NotReady, naming the newer id, when the version was staged again under another id", () => {
    const restaged = "3b2a1908-7f6e-4d5c-9b4a-3f2e1d0c9b8a"
    const readiness = Readiness.assess({
      manifest,
      staged: [
        stagedWithId(restaged, "effect", "4.0.0-rc.117"),
        stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
      ],
      published: new Set()
    })
    assert.strictEqual(readiness._tag, "NotReady")
    if (readiness._tag === "NotReady") {
      assert.lengthOf(readiness.blockers, 1)
      assert.strictEqual(readiness.blockers[0].state, "missing")
      assert.include(readiness.blockers[0].detail, restaged)
    }
  })

  it("is NotReady when the pinned id now belongs to a different package or version", () => {
    const readiness = Readiness.assess({
      manifest,
      staged: [
        stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.118"),
        stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
      ],
      published: new Set()
    })
    assert.strictEqual(readiness._tag, "NotReady")
    if (readiness._tag === "NotReady") {
      assert.deepStrictEqual(readiness.blockers.map((pkg) => [pkg.name, pkg.state]), [["effect", "missing"]])
      assert.include(readiness.blockers[0].detail, "4.0.0-rc.118")
    }
  })

  it("is NotReady when a pinned item was blocked, rejected or deleted", () => {
    for (const status of Readiness.BLOCKED_STATUSES) {
      const readiness = Readiness.assess({
        manifest,
        staged: [
          stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", status),
          stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
        ],
        published: new Set()
      })
      assert.strictEqual(readiness._tag, "NotReady", status)
      if (readiness._tag === "NotReady") {
        assert.deepStrictEqual(readiness.blockers.map((pkg) => [pkg.name, pkg.state]), [["effect", "blocked"]])
        assert.include(readiness.blockers[0].detail, status)
      }
    }
  })

  it("fails closed on a status word it does not know, or no status at all", () => {
    const unknown = Readiness.assess({
      manifest,
      staged: [
        stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "quarantined"),
        stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
      ],
      published: new Set()
    })
    assert.strictEqual(unknown._tag, "NotReady")
    if (unknown._tag === "NotReady") {
      assert.deepStrictEqual(unknown.blockers.map((pkg) => [pkg.name, pkg.state]), [["effect", "unknown"]])
      assert.include(unknown.blockers[0].detail, "quarantined")
    }

    const absent = Readiness.assess({
      manifest,
      staged: [
        { ...stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117"), status: Option.none() },
        stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
      ],
      published: new Set()
    })
    assert.strictEqual(absent._tag, "NotReady")
    if (absent._tag === "NotReady") {
      assert.strictEqual(absent.blockers[0].state, "unknown")
    }
  })

  it("lists every blocker in manifest order and ignores queue items outside the manifest", () => {
    const readiness = Readiness.assess({
      manifest,
      staged: [
        stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "validating"),
        stagedWithId(
          "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a",
          "@effect/release-spike-fixture",
          "0.0.0-spike.1",
          "blocked"
        )
      ],
      published: new Set()
    })
    assert.strictEqual(readiness._tag, "NotReady")
    if (readiness._tag === "NotReady") {
      assert.deepStrictEqual(readiness.blockers.map((pkg) => [pkg.name, pkg.state]), [
        ["@effect/vitest", "missing"],
        ["effect", "pending"]
      ])
      assert.deepStrictEqual(readiness.packages.map((pkg) => pkg.stageId), [
        vitestManifestPackage.stageId,
        effectManifestPackage.stageId
      ])
    }
  })
})
