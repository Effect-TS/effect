import * as ReleaseManifest from "@effect/release/ReleaseManifest"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { createHash } from "node:crypto"
import {
  EFFECT_STAGE_ID,
  effectPackage,
  LEDGER_SHA,
  manifest,
  manifestQueue,
  packages,
  scratchpadPackage,
  stagedWithId,
  VITEST_STAGE_ID,
  vitestPackage
} from "./utils.ts"

const expectedEncoding = `{
  "schema": 1,
  "tag": "rc",
  "sourceSha": "${LEDGER_SHA}",
  "packages": [
    {
      "name": "@effect/vitest",
      "version": "4.0.0-rc.117",
      "stageId": "${VITEST_STAGE_ID}"
    },
    {
      "name": "effect",
      "version": "4.0.0-rc.117",
      "stageId": "${EFFECT_STAGE_ID}"
    }
  ]
}
`

describe("ReleaseManifest", () => {
  it("encodes canonically: fixed key order, two spaces, packages sorted by name, trailing newline", () => {
    assert.strictEqual(ReleaseManifest.encode(manifest), expectedEncoding)
    const reversed = { ...manifest, packages: [...manifest.packages].reverse() }
    assert.strictEqual(ReleaseManifest.encode(reversed), expectedEncoding)
  })

  it("derives the identity from the SHA-256 of the canonical encoding", () => {
    const expected = createHash("sha256").update(expectedEncoding).digest("hex").slice(
      0,
      ReleaseManifest.IDENTITY_LENGTH
    )
    assert.strictEqual(ReleaseManifest.identity(manifest), expected)
    assert.lengthOf(ReleaseManifest.identity(manifest), 16)
    assert.match(ReleaseManifest.identity(manifest), /^[0-9a-f]{16}$/)
  })

  it("changes the identity when any pinned fact changes, and not when package order changes", () => {
    const base = ReleaseManifest.identity(manifest)
    const [vitest, effect] = manifest.packages
    const variants = [
      { ...manifest, tag: "latest" },
      { ...manifest, sourceSha: "deadbeef".repeat(5) },
      { ...manifest, packages: [vitest, { ...effect, version: "4.0.0-rc.118" }] },
      { ...manifest, packages: [vitest, { ...effect, stageId: "00000000-0000-4000-8000-000000000000" }] },
      { ...manifest, packages: [effect] }
    ]
    for (const variant of variants) {
      assert.notStrictEqual(ReleaseManifest.identity(variant), base)
    }
    assert.strictEqual(ReleaseManifest.identity({ ...manifest, packages: [effect, vitest] }), base)
  })

  it.effect("round-trips through decode", () =>
    Effect.gen(function*() {
      const decoded = yield* ReleaseManifest.decode(ReleaseManifest.encode(manifest))
      assert.deepStrictEqual(decoded, manifest)
    }))

  it.effect("rejects malformed, foreign-schema, incomplete and unsorted manifests", () =>
    Effect.gen(function*() {
      const cases: ReadonlyArray<[string, string]> = [
        ["malformed", "{"],
        ["schema", expectedEncoding.replace("\"schema\": 1", "\"schema\": 2")],
        [
          "stageId",
          expectedEncoding.replace(`      "stageId": "${EFFECT_STAGE_ID}"\n`, "").replace(",\n    }", "\n    }")
        ],
        [
          "unsorted",
          JSON.stringify({ ...manifest, packages: [...manifest.packages].reverse() }, null, 2) + "\n"
        ]
      ]
      for (const [label, text] of cases) {
        const error = yield* Effect.flip(ReleaseManifest.decode(text))
        assert.strictEqual(error._tag, "ReleaseError", label)
      }
    }))

  it.effect("builds a sorted manifest from the workspace and the queue, ignoring private and foreign items", () =>
    Effect.gen(function*() {
      const built = yield* ReleaseManifest.fromStaged({
        tag: "rc",
        sourceSha: LEDGER_SHA,
        packages: [effectPackage, scratchpadPackage, vitestPackage],
        staged: [
          ...manifestQueue,
          stagedWithId("9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a", "@effect/release-spike-fixture", "0.0.0-spike.1"),
          stagedWithId("0a1b2c3d-4e5f-4a6b-9c7d-8e9f0a1b2c3d", "scratchpad", "0.0.0")
        ]
      })
      assert.deepStrictEqual(built, manifest)
    }))

  it.effect("accepts a staged item without a tag", () =>
    Effect.gen(function*() {
      const built = yield* ReleaseManifest.fromStaged({
        tag: "rc",
        sourceSha: LEDGER_SHA,
        packages,
        staged: [
          stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "staged", Option.none()),
          stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
        ]
      })
      assert.deepStrictEqual(built, manifest)
    }))

  it.effect("fails naming the package when a public package is not staged", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(ReleaseManifest.fromStaged({
        tag: "rc",
        sourceSha: LEDGER_SHA,
        packages,
        staged: [stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")]
      }))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "effect")
      assert.notInclude(error.message, "@effect/vitest")
    }))

  it.effect("fails when a staged item carries a different dist-tag", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(ReleaseManifest.fromStaged({
        tag: "rc",
        sourceSha: LEDGER_SHA,
        packages,
        staged: [
          stagedWithId(EFFECT_STAGE_ID, "effect", "4.0.0-rc.117", "staged", Option.some("latest")),
          stagedWithId(VITEST_STAGE_ID, "@effect/vitest", "4.0.0-rc.117")
        ]
      }))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "effect")
    }))

  it.effect("fails naming both ids when the same version is staged twice", () =>
    Effect.gen(function*() {
      const duplicate = "5e4d3c2b-1a09-4f8e-8d7c-6b5a4f3e2d1c"
      const error = yield* Effect.flip(ReleaseManifest.fromStaged({
        tag: "rc",
        sourceSha: LEDGER_SHA,
        packages,
        staged: [...manifestQueue, stagedWithId(duplicate, "effect", "4.0.0-rc.117")]
      }))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, EFFECT_STAGE_ID)
      assert.include(error.message, duplicate)
    }))

  it.effect("fails naming both versions when a public package has a stale staged version", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(ReleaseManifest.fromStaged({
        tag: "rc",
        sourceSha: LEDGER_SHA,
        packages,
        staged: [...manifestQueue, stagedWithId("7c6b5a49-3827-4165-9f0e-1d2c3b4a5968", "effect", "4.0.0-rc.116")]
      }))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "4.0.0-rc.116")
      assert.include(error.message, "4.0.0-rc.117")
    }))
})
