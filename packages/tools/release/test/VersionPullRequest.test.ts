import { ReleaseError } from "@effect/release/Errors"
import * as VersionPullRequest from "@effect/release/VersionPullRequest"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { callNames, callsTo, githubLayer, gitLayer, makeCalls, pnpmLayer, pullRequest, rcPlan } from "./utils.ts"

const applied = [
  { name: "effect", currentVersion: "4.0.0-rc.117", newVersion: "4.0.0-rc.118" },
  { name: "@effect/vitest", currentVersion: "4.0.0-rc.117", newVersion: "4.0.0-rc.118" }
]

describe("VersionPullRequest.title / body", () => {
  it("titles a prerelease plan with its tag", () => {
    assert.strictEqual(VersionPullRequest.title(rcPlan), "Version Packages (rc)")
    assert.strictEqual(
      VersionPullRequest.title({
        releases: [
          { name: "effect", currentVersion: "4.0.0", newVersion: "4.0.1", bumpType: "patch", causes: ["intent"] }
        ]
      }),
      "Version Packages"
    )
  })

  it("renders the intro, one line per effective release, and no no-op lines", () => {
    const body = VersionPullRequest.body(rcPlan)
    assert.isTrue(body.startsWith(VersionPullRequest.BODY_INTRO))
    assert.include(body, "## Releases")
    assert.include(body, "- `effect`: 4.0.0-rc.117 → 4.0.0-rc.118 (patch)")
    assert.include(body, "- `@effect/vitest`: 4.0.0-rc.117 → 4.0.0-rc.118 (patch)")
    assert.notInclude(body, "scratchpad")
    assert.strictEqual(body, VersionPullRequest.body(rcPlan))
  })
})

describe("VersionPullRequest.sync", () => {
  it.effect("creates the PR when none is open, in the documented order", () =>
    Effect.gen(function*() {
      const calls = makeCalls()
      const result = yield* VersionPullRequest.sync(rcPlan).pipe(
        Effect.provide(Layer.mergeAll(
          gitLayer(calls, { headSha: "1111111111111111" }),
          pnpmLayer(calls, { plan: rcPlan, applied }),
          githubLayer(calls)
        ))
      )

      assert.deepStrictEqual(callNames(calls), [
        "git.headSha",
        "git.resetBranch",
        "pnpm.applyVersions",
        "git.commitAll",
        "git.pushForce",
        "github.findPullRequest",
        "github.createPullRequest",
        "git.checkout"
      ])
      assert.deepStrictEqual(callsTo(calls, "git.resetBranch")[0].args, [
        VersionPullRequest.RELEASE_BRANCH,
        VersionPullRequest.BASE_BRANCH
      ])
      assert.deepStrictEqual(callsTo(calls, "git.commitAll")[0].args, [VersionPullRequest.COMMIT_MESSAGE])
      assert.deepStrictEqual(callsTo(calls, "git.pushForce")[0].args, [VersionPullRequest.RELEASE_BRANCH])
      assert.deepStrictEqual(callsTo(calls, "github.findPullRequest")[0].args, [
        { head: VersionPullRequest.RELEASE_BRANCH, base: VersionPullRequest.BASE_BRANCH }
      ])
      const created = callsTo(calls, "github.createPullRequest")[0].args[0] as {
        head: string
        base: string
        title: string
        body: string
      }
      assert.strictEqual(created.head, VersionPullRequest.RELEASE_BRANCH)
      assert.strictEqual(created.base, VersionPullRequest.BASE_BRANCH)
      assert.strictEqual(created.title, "Version Packages (rc)")
      assert.isTrue(created.body.startsWith(VersionPullRequest.BODY_INTRO))
      assert.include(created.body, "- `effect`: 4.0.0-rc.117 → 4.0.0-rc.118 (patch)")
      assert.deepStrictEqual(callsTo(calls, "git.checkout")[0].args, ["1111111111111111"])

      assert.strictEqual(result._tag, "Created")
      if (result._tag === "Created") {
        assert.strictEqual(result.pullRequest.number, 8401)
      }
    }))

  it.effect("updates the open PR in place instead of creating a second one", () =>
    Effect.gen(function*() {
      const calls = makeCalls()
      const existing = pullRequest({ number: 8400, body: "stale body" })
      const result = yield* VersionPullRequest.sync(rcPlan).pipe(
        Effect.provide(Layer.mergeAll(
          gitLayer(calls),
          pnpmLayer(calls, { plan: rcPlan, applied }),
          githubLayer(calls, { existing })
        ))
      )

      assert.deepStrictEqual(callsTo(calls, "github.createPullRequest"), [])
      const [number, input] = callsTo(calls, "github.updatePullRequest")[0].args as [
        number,
        { title: string; body: string }
      ]
      assert.strictEqual(number, 8400)
      assert.strictEqual(input.title, "Version Packages (rc)")
      assert.include(input.body, "- `effect`: 4.0.0-rc.117 → 4.0.0-rc.118 (patch)")
      assert.strictEqual(result._tag, "Updated")
      if (result._tag === "Updated") {
        assert.strictEqual(result.pullRequest.number, 8400)
      }
    }))

  it.effect("does not push or touch GitHub when applying the plan changes nothing", () =>
    Effect.gen(function*() {
      const calls = makeCalls()
      const result = yield* VersionPullRequest.sync(rcPlan).pipe(
        Effect.provide(Layer.mergeAll(
          gitLayer(calls, { commitSha: Option.none() }),
          pnpmLayer(calls, { plan: rcPlan, applied: [] }),
          githubLayer(calls)
        ))
      )

      assert.deepStrictEqual(result, { _tag: "NoChanges" })
      assert.deepStrictEqual(callNames(calls), [
        "git.headSha",
        "git.resetBranch",
        "pnpm.applyVersions",
        "git.commitAll",
        "git.checkout"
      ])
    }))

  it.effect("returns to the original commit even when applying the plan fails", () =>
    Effect.gen(function*() {
      const calls = makeCalls()
      const error = yield* Effect.flip(
        VersionPullRequest.sync(rcPlan).pipe(
          Effect.provide(Layer.mergeAll(
            gitLayer(calls, { headSha: "2222222222222222" }),
            pnpmLayer(calls, {
              plan: rcPlan,
              applyFailure: Effect.fail(new ReleaseError({ message: "pnpm version -r exited 1" }))
            }),
            githubLayer(calls)
          ))
        )
      )

      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "pnpm version -r exited 1")
      assert.deepStrictEqual(callNames(calls).at(-1), "git.checkout")
      assert.deepStrictEqual(callsTo(calls, "git.checkout")[0].args, ["2222222222222222"])
      assert.deepStrictEqual(callsTo(calls, "git.pushForce"), [])
      assert.deepStrictEqual(callsTo(calls, "github.findPullRequest"), [])
    }))
})
