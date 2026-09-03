import { diffSnapshots } from "@effect/api-diff/Diff"
import { fingerprint } from "@effect/api-diff/Json"
import type { ApiSnapshot } from "@effect/api-diff/Model"
import { snapshotCacheKey, Snapshotter } from "@effect/api-diff/Snapshot"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import ts from "typescript-compiler"
import { writeFixturePackage } from "./utils.ts"

export const MainLayer = Snapshotter.layer.pipe(Layer.provideMerge(NodeServices.layer))
export const sha = "0".repeat(40)
export const modules = ["@fixture/sample/Api"]

export const extract = Effect.fnUntraced(function*(source: string) {
  const fs = yield* FileSystem.FileSystem
  const snapshotter = yield* Snapshotter
  const repoRoot = yield* fs.makeTempDirectoryScoped({ prefix: "api-diff-fixture-" })
  yield* writeFixturePackage(repoRoot, { "Api.d.ts": source }, { "./Api": { types: "./Api.d.ts" } })
  return yield* snapshotter.extract({ repoRoot, ref: "fixture", sha, modules })
})

export const pair = Effect.fnUntraced(function*(before: string, after: string) {
  const base = yield* extract(before)
  const head = yield* extract(after)
  const diff = diffSnapshots(base, head)
  assert.strictEqual(base.compiler.version, ts.version)
  assert.deepStrictEqual(base.diagnostics, [])
  assert.deepStrictEqual(head.diagnostics, [])
  return { base, head, diff }
})

export const entity = (snapshot: ApiSnapshot, name: string, bucket = "type") => {
  const result = snapshot.entities.find((entity) => entity.id === `@fixture/sample/Api#${name}#${bucket}`)
  assert(result !== undefined)
  return result
}

// Exercise real public cache keys against scoped on-disk snapshots, never Worktrees.
export const cacheProof = Effect.fnUntraced(function*(salt: string, siblingSalt: string, source: string) {
  const fs = yield* FileSystem.FileSystem
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "api-diff-cache-" })
  const snapshot = yield* extract(source)
  // Seed the legacy key locally, not with historical lossy extraction bytes.
  // Distinct metadata makes an accidental overwrite observable.
  const oldContents = JSON.stringify({ ...snapshot, ref: "legacy-cache-fixture" })
  const staleSnapshot = JSON.parse(oldContents)
  const oldKey = fingerprint(["snapshot-v4", sha, ts.version, modules])
  const currentKey = snapshotCacheKey(sha, modules)
  const siblingKey = fingerprint(["snapshot-v4", siblingSalt, sha, ts.version, modules])
  const composedKey = fingerprint([
    "snapshot-v4",
    "literal-type-category-v1",
    "class-member-optionality-v1",
    sha,
    ts.version,
    modules
  ])
  const oldLocation = `${root}/${oldKey}/snapshot.json`
  yield* fs.makeDirectory(`${root}/${oldKey}`, { recursive: true })
  yield* fs.writeFileString(oldLocation, oldContents)
  const currentLocation = `${root}/${currentKey}/snapshot.json`
  const currentHitBeforeWrite = yield* fs.exists(currentLocation)
  yield* fs.makeDirectory(`${root}/${currentKey}`, { recursive: true })
  yield* fs.writeFileString(currentLocation, JSON.stringify(snapshot))
  const currentReadback = JSON.parse(yield* fs.readFileString(currentLocation))
  assert.strictEqual(currentHitBeforeWrite, false)
  assert.strictEqual(currentKey, fingerprint(["snapshot-v4", salt, sha, ts.version, modules]))
  assert.strictEqual(new Set([oldKey, currentKey, siblingKey, composedKey]).size, 4)
  assert.deepStrictEqual(currentReadback, JSON.parse(JSON.stringify(snapshot)))
  assert.strictEqual(yield* fs.exists(oldLocation), true)
  assert.strictEqual(yield* fs.readFileString(oldLocation), oldContents)
  assert.deepStrictEqual(JSON.parse(yield* fs.readFileString(oldLocation)), staleSnapshot)
  assert.strictEqual(snapshotCacheKey(sha, ["b", "a"]), snapshotCacheKey(sha, ["a", "b"]))
  assert.notStrictEqual(snapshotCacheKey(sha), snapshotCacheKey(sha, []))
})
