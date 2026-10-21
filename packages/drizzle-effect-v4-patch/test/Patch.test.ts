import { configure } from "@effect/drizzle-effect-v4-patch/internal/patch"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as ChildProcess from "effect/process/ChildProcess"
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner"
import * as Result from "effect/Result"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

const dependency = "drizzle-orm@1.0.0-rc.4"
const patchPath = `patches/${dependency}.patch`
const assets = new URL("../patches/", import.meta.url)
const TestLayer = Layer.merge(NodeFileSystem.layer, Path.layer)

const fixture = Effect.fnUntraced(function*(options: {
  readonly packageManager?: string
  readonly version?: string
  readonly patches?: Readonly<Record<string, string>>
  readonly lockfile?: "bun.lock" | "bun.lockb"
} = {}) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "effect-drizzle-patch-" })
  const directory = path.join(root, "packages", "app")
  const manifestPath = path.join(root, "package.json")
  const destination = path.join(root, patchPath)
  const expected = yield* fs.readFileString(yield* path.fromFileUrl(new URL(`${dependency}.patch`, assets)))
  const manifest = {
    name: "consumer",
    private: true,
    packageManager: options.packageManager ?? "bun@1.3.0",
    scripts: { test: "bun test" },
    ...(options.patches === undefined ? {} : { patchedDependencies: options.patches })
  }
  const original = `${JSON.stringify(manifest, null, 2)}\n`
  yield* fs.makeDirectory(path.join(directory, "node_modules", "drizzle-orm"), { recursive: true })
  yield* fs.writeFileString(manifestPath, original)
  yield* fs.writeFileString(path.join(root, options.lockfile ?? "bun.lock"), "{}")
  yield* fs.writeFileString(
    path.join(directory, "node_modules", "drizzle-orm", "package.json"),
    JSON.stringify({
      name: "drizzle-orm",
      version: options.version ?? "1.0.0-rc.4"
    })
  )
  const commands: Array<ChildProcess.StandardCommand> = []
  const exitCodes: Array<number> = []
  const spawner = ChildProcessSpawner.make((command) =>
    Effect.sync(() => {
      assert.isTrue(ChildProcess.isStandardCommand(command))
      if (!ChildProcess.isStandardCommand(command)) throw new Error("Expected a standard command")
      commands.push(command)
      return ChildProcessSpawner.makeHandle({
        pid: ChildProcessSpawner.ProcessId(1),
        stdin: Sink.drain,
        stdout: Stream.empty,
        stderr: Stream.empty,
        all: Stream.empty,
        exitCode: Effect.sync(() => ChildProcessSpawner.ExitCode(exitCodes.shift() ?? 0)),
        isRunning: Effect.succeed(false),
        kill: () => Effect.void,
        getInputFd: () => Sink.drain,
        getOutputFd: () => Stream.empty,
        unref: Effect.succeed(Effect.void)
      })
    })
  )
  const run = (action: "patch" | "unpatch") =>
    configure(directory, assets, action).pipe(
      Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner)
    )
  return { fs, path, root, directory, manifestPath, destination, expected, original, commands, exitCodes, run }
})

it.effect("finds the Bun workspace root, preserves other fields, and patches idempotently", () =>
  Effect.gen(function*() {
    const f = yield* fixture({ lockfile: "bun.lockb", patches: { "other@1.0.0": "patches/other.patch" } })
    yield* f.run("patch")
    const first = yield* f.fs.readFileString(f.manifestPath)
    assert.deepStrictEqual(JSON.parse(first), {
      name: "consumer",
      private: true,
      packageManager: "bun@1.3.0",
      scripts: { test: "bun test" },
      patchedDependencies: { "other@1.0.0": "patches/other.patch", [dependency]: patchPath }
    })
    assert.strictEqual(yield* f.fs.readFileString(f.destination), f.expected)
    yield* f.run("patch")
    assert.strictEqual(yield* f.fs.readFileString(f.manifestPath), first)
    assert.strictEqual(f.commands.length, 2)
    for (const command of f.commands) {
      assert.strictEqual(command.command, "bun")
      assert.deepStrictEqual(command.args, ["install"])
      assert.strictEqual(command.options.cwd, f.root)
      assert.strictEqual(command.options.stdout, "inherit")
      assert.strictEqual(command.options.stderr, "inherit")
    }
  }).pipe(Effect.provide(TestLayer)))

it.effect.each(["patch", "unpatch"] as const)(
  "rejects conflicting patch registrations during %s",
  (action) =>
    Effect.gen(function*() {
      const f = yield* fixture({ patches: { [dependency]: "patches/custom.patch" } })
      const result = yield* f.run(action).pipe(Effect.result)
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) assert.include(result.failure.message, "existing patch")
      assert.strictEqual(yield* f.fs.readFileString(f.manifestPath), f.original)
      assert.isFalse(yield* f.fs.exists(f.destination))
      assert.strictEqual(f.commands.length, 0)
    }).pipe(Effect.provide(TestLayer))
)

it.effect.each(["patch", "unpatch"] as const)(
  "preserves a modified patch during %s",
  (action) =>
    Effect.gen(function*() {
      const f = yield* fixture({ patches: { [dependency]: patchPath } })
      yield* f.fs.makeDirectory(f.path.dirname(f.destination), { recursive: true })
      yield* f.fs.writeFileString(f.destination, "consumer changes")
      const result = yield* f.run(action).pipe(Effect.result)
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) assert.include(result.failure.message, "different contents")
      assert.strictEqual(yield* f.fs.readFileString(f.manifestPath), f.original)
      assert.strictEqual(yield* f.fs.readFileString(f.destination), "consumer changes")
      assert.strictEqual(f.commands.length, 0)
    }).pipe(Effect.provide(TestLayer))
)

it.effect("rejects unsupported Drizzle versions before writing configuration", () =>
  Effect.gen(function*() {
    const f = yield* fixture({ version: "1.0.0-rc.5" })
    const result = yield* f.run("patch").pipe(Effect.result)
    assert.isTrue(Result.isFailure(result))
    if (Result.isFailure(result)) assert.include(result.failure.message, "Unsupported drizzle-orm 1.0.0-rc.5")
    assert.strictEqual(yield* f.fs.readFileString(f.manifestPath), f.original)
    assert.isFalse(yield* f.fs.exists(f.destination))
    assert.strictEqual(f.commands.length, 0)
  }).pipe(Effect.provide(TestLayer)))

it.effect("rejects a non-Bun package manager before writing configuration", () =>
  Effect.gen(function*() {
    const f = yield* fixture({ packageManager: "pnpm@11.20.0" })
    const result = yield* f.run("patch").pipe(Effect.result)
    assert.isTrue(Result.isFailure(result))
    if (Result.isFailure(result)) assert.include(result.failure.message, "Only Bun projects")
    assert.strictEqual(yield* f.fs.readFileString(f.manifestPath), f.original)
    assert.isFalse(yield* f.fs.exists(f.destination))
    assert.strictEqual(f.commands.length, 0)
  }).pipe(Effect.provide(TestLayer)))

it.effect("keeps configuration and patch assets available across failed installs and unpatch retries", () =>
  Effect.gen(function*() {
    const f = yield* fixture({ patches: { "other@1.0.0": "patches/other.patch" } })
    f.exitCodes.push(1)
    const failedPatch = yield* f.run("patch").pipe(Effect.result)
    assert.isTrue(Result.isFailure(failedPatch))
    if (Result.isFailure(failedPatch)) assert.include(failedPatch.failure.message, "rerun")
    assert.strictEqual(
      JSON.parse(yield* f.fs.readFileString(f.manifestPath)).patchedDependencies[dependency],
      patchPath
    )
    assert.strictEqual(yield* f.fs.readFileString(f.destination), f.expected)
    yield* f.run("patch")
    f.exitCodes.push(2)
    const failedUnpatch = yield* f.run("unpatch").pipe(Effect.result)
    assert.isTrue(Result.isFailure(failedUnpatch))
    assert.deepStrictEqual(JSON.parse(yield* f.fs.readFileString(f.manifestPath)).patchedDependencies, {
      "other@1.0.0": "patches/other.patch"
    })
    assert.isTrue(yield* f.fs.exists(f.destination))
    yield* f.run("unpatch")
    assert.isFalse(yield* f.fs.exists(f.destination))
    assert.strictEqual(f.commands.length, 4)
  }).pipe(Effect.provide(TestLayer)))

it.effect("removes its final patch registration and tolerates repeated removal", () =>
  Effect.gen(function*() {
    const f = yield* fixture()
    yield* f.run("patch")
    yield* f.run("unpatch")
    assert.deepStrictEqual(JSON.parse(yield* f.fs.readFileString(f.manifestPath)), JSON.parse(f.original))
    assert.isFalse(yield* f.fs.exists(f.destination))
    yield* f.run("unpatch")
    assert.deepStrictEqual(JSON.parse(yield* f.fs.readFileString(f.manifestPath)), JSON.parse(f.original))
    assert.strictEqual(f.commands.length, 3)
  }).pipe(Effect.provide(TestLayer)))
