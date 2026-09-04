import { Rollup, RollupError } from "@effect/bundle/Rollup"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as PlatformError from "effect/PlatformError"
import * as Result from "effect/Result"
import * as Sink from "effect/Sink"
import { execFile } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { gzipSync } from "node:zlib"
import type * as RollupModule from "rollup"
import { afterAll, vi } from "vitest"

const lifecycle = vi.hoisted(() => ({
  closed: new Map<string, number>(),
  generateFailure: new Error("generate sentinel")
}))

vi.mock("rollup", async (importOriginal) => {
  const actual = await importOriginal<typeof RollupModule>()
  return {
    ...actual,
    rollup: async (options: RollupModule.RollupOptions) => {
      const input = String(options.input)
      const bundle = await actual.rollup(
        input.endsWith("generate-failure.ts")
          ? {
            ...options,
            plugins: [options.plugins, {
              name: "generate-failure",
              generateBundle() {
                throw lifecycle.generateFailure
              }
            }]
          }
          : options
      )
      const close = bundle.close.bind(bundle)
      bundle.close = async () => {
        lifecycle.closed.set(input, (lifecycle.closed.get(input) ?? 0) + 1)
        await close()
      }
      return bundle
    }
  }
})

const root = mkdtempSync(join(tmpdir(), "effect-bundle-rollup-test-"))
const cli = fileURLToPath(new URL("../src/bin.ts", import.meta.url))
afterAll(() => rmSync(root, { recursive: true, force: true }))
const fixture = (name = "entry.ts") => {
  const directory = mkdtempSync(join(root, "case-"))
  const input = join(directory, name)
  writeFileSync(input, "console.log(\"bundle write contract\")\n")
  const outputDirectory = join(directory, "output")
  mkdirSync(outputDirectory)
  return { input, outputDirectory, output: join(outputDirectory, name.replace(/\.ts$/, ".min.js")) }
}

describe("Rollup output contract", () => {
  it.effect("native output obstruction rejects and closes the acquired bundle", () =>
    Effect.gen(function*() {
      const { input, output, outputDirectory } = fixture()
      mkdirSync(output)
      const bundler = yield* Rollup.make
      const result = yield* Effect.result(bundler.bundle({ path: input, outputDirectory }))
      assert.strictEqual(lifecycle.closed.get(input), 1)
      assert.isTrue(statSync(output).isDirectory())
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) {
        assert.instanceOf(result.failure, RollupError)
        assert.instanceOf(result.failure.cause, PlatformError.PlatformError)
        assert.nestedPropertyVal(result.failure.cause, "reason.cause.code", "EISDIR")
      }
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("writable output completes and matches gzip measurement; no-output never opens a sink", () =>
    Effect.gen(function*() {
      const { input, output, outputDirectory } = fixture()
      const fs = yield* FileSystem.FileSystem
      let sinks = 0
      const bundler = yield* Rollup.make.pipe(Effect.provideService(FileSystem.FileSystem, {
        ...fs,
        sink: (...args) => {
          sinks++
          return fs.sink(...args)
        }
      }))
      const written = yield* bundler.bundle({ path: input, outputDirectory })
      const bytes = readFileSync(output)
      assert.isAbove(bytes.length, 0)
      assert.strictEqual(gzipSync(bytes, { level: 9 }).length, written.sizeInBytes)
      assert.strictEqual(sinks, 1)
      assert.strictEqual(lifecycle.closed.get(input), 1)
      const measured = yield* bundler.bundle({ path: input })
      assert.strictEqual(measured.sizeInBytes, written.sizeInBytes)
      assert.strictEqual(sinks, 1)
      assert.strictEqual(lifecycle.closed.get(input), 2)
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a typed writer failure after consuming bytes propagates and closes", () =>
    Effect.gen(function*() {
      const { input, outputDirectory } = fixture()
      const fs = yield* FileSystem.FileSystem
      const failure = PlatformError.systemError({
        module: "FileSystem",
        method: "writeAll",
        _tag: "Unknown",
        description: "writer sentinel"
      })
      let consumed = 0
      const bundler = yield* Rollup.make.pipe(Effect.provideService(FileSystem.FileSystem, {
        ...fs,
        sink: () =>
          Sink.forEach((bytes: Uint8Array) =>
            Effect.sync(() => {
              consumed += bytes.length
            }).pipe(
              Effect.andThen(Effect.fail(failure))
            )
          )
      }))
      const result = yield* Effect.result(bundler.bundle({ path: input, outputDirectory }))
      assert.isAbove(consumed, 0)
      assert.strictEqual(lifecycle.closed.get(input), 1)
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) {
        assert.instanceOf(result.failure, RollupError)
        assert.strictEqual(result.failure.cause, failure)
      }
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("real generate failure preserves error mapping and acquired bundle closure", () =>
    Effect.gen(function*() {
      const { input } = fixture("generate-failure.ts")
      const bundler = yield* Rollup.make
      const result = yield* Effect.result(bundler.bundle({ path: input }))
      assert.strictEqual(lifecycle.closed.get(input), 1)
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) {
        assert.instanceOf(result.failure, RollupError)
        assert.include(String(result.failure.cause), "generate sentinel")
      }
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("native CLI reports writable artifacts but never a false-success table", () =>
    Effect.gen(function*() {
      const good = fixture()
      const blocked = fixture()
      mkdirSync(blocked.output)
      const run = (input: string, outputDirectory: string) =>
        Effect.promise(async () => {
          try {
            const value = await promisify(execFile)(process.execPath, [
              cli,
              "visualize-selected",
              "--output-dir",
              outputDirectory,
              input
            ], { timeout: 20_000 })
            return { code: 0, ...value }
          } catch (error) {
            const failure = error as Error & { code: number; stdout: string; stderr: string }
            return { code: failure.code, stdout: failure.stdout, stderr: failure.stderr }
          }
        })
      const success = yield* run(good.input, good.outputDirectory)
      const failure = yield* run(blocked.input, blocked.outputDirectory)
      assert.strictEqual(success.code, 0)
      assert.include(success.stdout, "Generated Bundle")
      assert.isAbove(statSync(good.output).size, 0)
      assert.isAbove(statSync(join(good.outputDirectory, "entry.treemap.html")).size, 0)
      assert.isAbove(statSync(join(good.outputDirectory, "entry.raw-data.json")).size, 0)
      assert.notStrictEqual(failure.code, 0)
      assert.notInclude(failure.stdout, "Generated Bundle")
      assert.include(failure.stdout + failure.stderr, "EISDIR")
    }), 45_000)
})
