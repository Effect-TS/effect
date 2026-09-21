import * as Routing from "@effect/release/Routing"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { effectPackage, emptyPlan, noOpPlan, packages, rcPlan, stagedItem } from "./utils.ts"

const key = Routing.versionKey

describe("Routing.decide", () => {
  it.effect("routes to Version when the plan has an effective release, whatever the registry state", () =>
    Effect.gen(function*() {
      const route = yield* Routing.decide({
        plan: rcPlan,
        packages,
        // effect@rc.117 is unpublished here; pending intents still win.
        published: new Set([key("@effect/vitest", "4.0.0-rc.117")]),
        staged: []
      })
      assert.strictEqual(route._tag, "Version")
      if (route._tag === "Version") {
        assert.strictEqual(route.plan, rcPlan)
        assert.deepStrictEqual(route.releases.map((release) => release.name), ["effect", "@effect/vitest"])
      }
    }))

  it.effect("does not open a version PR for a plan made only of no-op releases", () =>
    Effect.gen(function*() {
      const route = yield* Routing.decide({
        plan: noOpPlan,
        packages,
        published: new Set([key("effect", "4.0.0-rc.117"), key("@effect/vitest", "4.0.0-rc.117")]),
        staged: []
      })
      assert.strictEqual(route._tag, "Idle")
    }))

  it.effect("routes to Stage for public packages that are neither published nor staged", () =>
    Effect.gen(function*() {
      const route = yield* Routing.decide({
        plan: emptyPlan,
        packages,
        published: new Set([key("@effect/vitest", "4.0.0-rc.117")]),
        staged: []
      })
      assert.strictEqual(route._tag, "Stage")
      if (route._tag === "Stage") {
        assert.deepStrictEqual(route.toStage, [effectPackage])
        assert.deepStrictEqual(route.skipped, [
          { name: "@effect/vitest", version: "4.0.0-rc.117", reason: "published" }
        ])
      }
    }))

  it.effect("never routes private packages to Stage or lists them as skipped", () =>
    Effect.gen(function*() {
      const route = yield* Routing.decide({ plan: emptyPlan, packages, published: new Set(), staged: [] })
      assert.strictEqual(route._tag, "Stage")
      if (route._tag === "Stage") {
        assert.deepStrictEqual(route.toStage.map((pkg) => pkg.name), ["effect", "@effect/vitest"])
        assert.deepStrictEqual(route.skipped, [])
      }
    }))

  it.effect("skips a package whose manifest version is already staged", () =>
    Effect.gen(function*() {
      const route = yield* Routing.decide({
        plan: emptyPlan,
        packages,
        published: new Set([key("@effect/vitest", "4.0.0-rc.117")]),
        staged: [stagedItem("effect", "4.0.0-rc.117", "validating")]
      })
      assert.strictEqual(route._tag, "Idle")
      if (route._tag === "Idle") {
        assert.deepStrictEqual(route.skipped, [
          { name: "effect", version: "4.0.0-rc.117", reason: "staged" },
          { name: "@effect/vitest", version: "4.0.0-rc.117", reason: "published" }
        ])
      }
    }))

  it.effect("is Idle when every public package is published", () =>
    Effect.gen(function*() {
      const route = yield* Routing.decide({
        plan: emptyPlan,
        packages,
        published: new Set([key("effect", "4.0.0-rc.117"), key("@effect/vitest", "4.0.0-rc.117")]),
        staged: []
      })
      assert.deepStrictEqual(route, {
        _tag: "Idle",
        skipped: [
          { name: "effect", version: "4.0.0-rc.117", reason: "published" },
          { name: "@effect/vitest", version: "4.0.0-rc.117", reason: "published" }
        ]
      })
    }))

  it.effect("fails when a public package has a stale staged version", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(
        Routing.decide({
          plan: emptyPlan,
          packages,
          published: new Set([key("@effect/vitest", "4.0.0-rc.117")]),
          staged: [stagedItem("effect", "4.0.0-rc.116")]
        })
      )
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "effect")
      assert.include(error.message, "4.0.0-rc.116")
      assert.include(error.message, "4.0.0-rc.117")
    }))

  it.effect("ignores staged items for packages outside the workspace", () =>
    Effect.gen(function*() {
      const route = yield* Routing.decide({
        plan: emptyPlan,
        packages,
        published: new Set([key("effect", "4.0.0-rc.117"), key("@effect/vitest", "4.0.0-rc.117")]),
        staged: [stagedItem("@effect/release-spike-fixture", "0.0.0-spike.1")]
      })
      assert.strictEqual(route._tag, "Idle")
    }))
})
