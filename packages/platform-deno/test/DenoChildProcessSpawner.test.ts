import * as DenoChildProcessSpawner from "@effect/platform-deno/DenoChildProcessSpawner"
import * as DenoPath from "@effect/platform-deno/DenoPath"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as PlatformError from "effect/PlatformError"
import * as Stream from "effect/Stream"
import { ChildProcess } from "effect/unstable/process"
import * as ChildProcessSpawnerTest from "../../effect/test/unstable/process/ChildProcessSpawnerTest.ts"

const platformError = (method: string, path: string, cause: unknown) =>
  PlatformError.systemError({
    _tag: cause instanceof Deno.errors.NotFound ? "NotFound" : "Unknown",
    module: "FileSystem",
    method,
    pathOrDescriptor: path,
    cause
  })

const fileSystem = FileSystem.layerNoop({
  access: (path) =>
    Effect.tryPromise({
      try: () => Deno.stat(path),
      catch: (cause) => platformError("access", path, cause)
    }).pipe(Effect.asVoid),
  exists: (path) =>
    Effect.tryPromise({
      try: () => Deno.stat(path).then(() => true),
      catch: (cause) => platformError("exists", path, cause)
    }).pipe(Effect.catchTag("PlatformError", (error) =>
      error.reason._tag === "NotFound" ? Effect.succeed(false) : Effect.fail(error))),
  makeTempDirectoryScoped: (options) =>
    Effect.acquireRelease(
      Effect.tryPromise({
        try: () => Deno.makeTempDir(options),
        catch: (cause) => platformError("makeTempDirectoryScoped", options?.directory ?? "", cause)
      }),
      (path) => Effect.promise(() => Deno.remove(path, { recursive: true })).pipe(Effect.ignore)
    ),
  writeFile: (path, data) =>
    Effect.tryPromise({
      try: () => Deno.writeFile(path, data),
      catch: (cause) => platformError("writeFile", path, cause)
    })
})

const layer = DenoChildProcessSpawner.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(DenoPath.layer, fileSystem))
)

const output = (command: ChildProcess.Command) =>
  Effect.gen(function*() {
    const handle = yield* command
    return yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString)
  }).pipe(Effect.scoped, Effect.provide(layer))

ChildProcessSpawnerTest.suite("DenoChildProcessSpawner", layer, {
  processGroups: false,
  additionalFds: false
})

describe("DenoChildProcessSpawner options", () => {
  it.effect("rejects detached", () =>
    Effect.gen(function*() {
      const error = yield* ChildProcess.make("echo", ["test"], { detached: false }).pipe(Effect.flip)
      assert.deepStrictEqual(
        error.reason,
        new PlatformError.BadArgument({
          module: "ChildProcessSpawner",
          method: "spawn",
          description: "The detached option is unsupported because Deno has no equivalent"
        })
      )
    }).pipe(Effect.scoped, Effect.provide(layer)))

  it.effect("rejects additionalFds", () =>
    Effect.gen(function*() {
      const error = yield* ChildProcess.make("echo", ["test"], {
        additionalFds: { fd3: { type: "output" } }
      }).pipe(Effect.flip)
      assert.deepStrictEqual(
        error.reason,
        new PlatformError.BadArgument({
          module: "ChildProcessSpawner",
          method: "spawn",
          description: "The additionalFds option is unsupported because Deno has no equivalent"
        })
      )
    }).pipe(Effect.scoped, Effect.provide(layer)))

  it.effect("emulates shell true without escaping joined arguments", () =>
    Effect.gen(function*() {
      const result = yield* output(ChildProcess.make("printf", ["[%s]", "a b"], { shell: true }))
      assert.strictEqual(result, "[a][b]")
    }))

  it.effect("uses a custom shell", () =>
    Effect.gen(function*() {
      const result = yield* output(ChildProcess.make("printf", ["custom-shell"], { shell: "/bin/sh" }))
      assert.strictEqual(result, "custom-shell")
    }))
})
