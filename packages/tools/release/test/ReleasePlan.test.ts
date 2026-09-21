import * as ReleasePlan from "@effect/release/ReleasePlan"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { noOpPlan, rcPlan } from "./utils.ts"

// Captured verbatim from `pnpm version -r --dry-run` on this repository
// (pnpm 11.20.0), plus one line with a compound cause.
const dryRun = [
  "Release plan:",
  "  @effect/ai-openai-compat: 4.0.0-rc.117 → 4.0.0-rc.118 (patch, via intent)",
  "  ai-docs: 0.0.0 → 0.0.0 (patch, via dependencies)",
  "  effect: 4.0.0-rc.117 → 4.0.0-rc.118 (minor, via intent+fixed)",
  ""
].join("\n")

describe("ReleasePlan.parseDryRun", () => {
  it.effect("ignores pnpm warnings printed before the release plan", () =>
    Effect.gen(function*() {
      const plan = yield* ReleasePlan.parseDryRun([
        "WARN  The current working tree has uncommitted changes",
        "WARN  Proceeding because this is a dry run",
        dryRun
      ].join("\n"))
      assert.deepStrictEqual(plan.releases.map((release) => release.name), [
        "@effect/ai-openai-compat",
        "ai-docs",
        "effect"
      ])
    }))

  it.effect("parses every line of a release plan", () =>
    Effect.gen(function*() {
      const plan = yield* ReleasePlan.parseDryRun(dryRun)
      assert.deepStrictEqual(plan.releases, [
        {
          name: "@effect/ai-openai-compat",
          currentVersion: "4.0.0-rc.117",
          newVersion: "4.0.0-rc.118",
          bumpType: "patch",
          causes: ["intent"]
        },
        { name: "ai-docs", currentVersion: "0.0.0", newVersion: "0.0.0", bumpType: "patch", causes: ["dependencies"] },
        {
          name: "effect",
          currentVersion: "4.0.0-rc.117",
          newVersion: "4.0.0-rc.118",
          bumpType: "minor",
          causes: ["intent", "fixed"]
        }
      ])
    }))

  it.effect("treats the no-pending-changes line as an empty plan", () =>
    Effect.gen(function*() {
      const plan = yield* ReleasePlan.parseDryRun(`${ReleasePlan.NO_PENDING_CHANGES}\n`)
      assert.deepStrictEqual(plan, ReleasePlan.empty)
    }))

  it.effect("fails on text that is neither a plan nor the empty marker", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(
        ReleasePlan.parseDryRun("ERR_PNPM_UNCLEAN_WORKING_TREE  Working tree is not clean.")
      )
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "Working tree is not clean")
    }))

  it.effect("fails when a plan line does not match the expected shape", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(
        ReleasePlan.parseDryRun("Release plan:\n  effect: 4.0.0-rc.117 -> 4.0.0-rc.118\n")
      )
      assert.strictEqual(error._tag, "ReleaseError")
    }))
})

describe("ReleasePlan helpers", () => {
  it("effectiveReleases drops releases whose version does not change", () => {
    assert.deepStrictEqual(
      ReleasePlan.effectiveReleases(rcPlan).map((release) => release.name),
      ["effect", "@effect/vitest"]
    )
    assert.deepStrictEqual(ReleasePlan.effectiveReleases(noOpPlan), [])
  })

  it("isEmpty is true for an empty plan and for a plan of only no-op releases", () => {
    assert.isTrue(ReleasePlan.isEmpty(ReleasePlan.empty))
    assert.isTrue(ReleasePlan.isEmpty(noOpPlan))
    assert.isFalse(ReleasePlan.isEmpty(rcPlan))
  })

  it("prereleaseTag is the identifier shared by every effective release", () => {
    assert.deepStrictEqual(ReleasePlan.prereleaseTag(rcPlan), Option.some("rc"))
    assert.deepStrictEqual(ReleasePlan.prereleaseTag(noOpPlan), Option.none())
    assert.deepStrictEqual(
      ReleasePlan.prereleaseTag({
        releases: [
          { name: "effect", currentVersion: "4.0.0-rc.118", newVersion: "4.0.0", bumpType: "major", causes: ["intent"] }
        ]
      }),
      Option.none()
    )
    assert.deepStrictEqual(
      ReleasePlan.prereleaseTag({
        releases: [
          {
            name: "effect",
            currentVersion: "4.0.0-rc.117",
            newVersion: "4.0.0-rc.118",
            bumpType: "patch",
            causes: ["intent"]
          },
          {
            name: "@effect/x",
            currentVersion: "1.0.0",
            newVersion: "1.0.1-next.0",
            bumpType: "patch",
            causes: ["intent"]
          }
        ]
      }),
      Option.none()
    )
  })
})

describe("ReleasePlan.parseApplied", () => {
  it.effect("parses the JSON printed by pnpm version -r --json", () =>
    Effect.gen(function*() {
      const applied = yield* ReleasePlan.parseApplied(
        JSON.stringify([
          { name: "effect", currentVersion: "4.0.0-rc.117", newVersion: "4.0.0-rc.118" },
          { name: "@effect/vitest", currentVersion: "4.0.0-rc.117", newVersion: "4.0.0-rc.118", extra: true }
        ])
      )
      assert.deepStrictEqual(applied, [
        { name: "effect", currentVersion: "4.0.0-rc.117", newVersion: "4.0.0-rc.118" },
        { name: "@effect/vitest", currentVersion: "4.0.0-rc.117", newVersion: "4.0.0-rc.118" }
      ])
    }))

  it.effect("fails on output that is not a JSON array of versions", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(ReleasePlan.parseApplied("Versions applied:\neffect: a → b\n"))
      assert.strictEqual(error._tag, "ReleaseError")
    }))
})
