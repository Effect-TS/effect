/** Watch-loop regressions use injected events and TestClock; the CLI smoke test uses real watchers. */
import * as Generator from "@effect/graphql-generator/Generator"
import * as Watch from "@effect/graphql-generator/internal/Watch"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import { CliOutput } from "effect/cli"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type * as Fiber from "effect/Fiber"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import * as PubSub from "effect/PubSub"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import { TestClock, TestConsole } from "effect/testing"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const schemaSdl = `type User {
  id: ID!
  name: String!
}

type Query {
  viewer: User!
}
`

const query = (name: string, ...fields: ReadonlyArray<string>): string =>
  `query ${name} {\n  viewer {\n${fields.map((field) => `    ${field}\n`).join("")}  }\n}\n`

const config = {
  schema: "./schema.graphql",
  documents: ["src/**/*.graphql"]
}

const configSource = (value: unknown): string =>
  `import { defineConfig } from "@effect/graphql-generator/Config"\n\nexport default defineConfig(${
    JSON.stringify(value, null, 2)
  })\n`

const tmpRoot = fileURLToPath(new URL("./.tmp", import.meta.url))

const project = Effect.fnUntraced(function*(documents: Readonly<Record<string, string>>) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  yield* fs.makeDirectory(tmpRoot, { recursive: true })
  const dir = yield* fs.makeTempDirectoryScoped({ directory: tmpRoot, prefix: "watch-" })
  yield* write(dir, { "graphql.config.ts": configSource(config), "schema.graphql": schemaSdl, ...documents })
  return {
    dir,
    configPath: path.join(dir, "graphql.config.ts"),
    file: (relative: string) => path.join(dir, relative)
  }
})

const write = Effect.fnUntraced(function*(dir: string, files: Readonly<Record<string, string>>) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  for (const [relative, body] of Object.entries(files)) {
    const file = path.join(dir, relative)
    yield* fs.makeDirectory(path.dirname(file), { recursive: true })
    yield* fs.writeFileString(file, body)
  }
})

const exists = Effect.fnUntraced(function*(file: string) {
  const fs = yield* FileSystem.FileSystem
  return yield* fs.exists(file)
})

const read = Effect.fnUntraced(function*(file: string) {
  const fs = yield* FileSystem.FileSystem
  return yield* fs.readFileString(file)
})

/** Backdates `files` so a later write shows up as a changed mtime. */
const backdate = Effect.fnUntraced(function*(files: ReadonlyArray<string>) {
  const fs = yield* FileSystem.FileSystem
  for (const file of files) yield* fs.utimes(file, 0, 0)
})

const mtime = Effect.fnUntraced(function*(file: string) {
  const fs = yield* FileSystem.FileSystem
  const info = yield* fs.stat(file)
  return Option.getOrThrow(info.mtime).getTime()
})

const liveSleep = (millis: number) => Effect.sleep(millis).pipe(TestClock.withLive)

interface Output {
  readonly stdout: ReadonlyArray<string>
  readonly stderr: ReadonlyArray<string>
}

const output: Effect.Effect<Output> = Effect.gen(function*() {
  return {
    stdout: (yield* TestConsole.logLines).map(String),
    stderr: (yield* TestConsole.errorLines).map(String)
  }
})

const cycles = (out: Output): ReadonlyArray<string> => out.stdout.filter((line) => line.startsWith("regenerated "))

const show = (out: Output): string => `stdout:\n${out.stdout.join("\n")}\nstderr:\n${out.stderr.join("\n")}`

/**
 * Polls the console until `done` holds, failing if the loop exits first.
 * Each poll moves the TestClock past the debounce.
 */
const waitFor = Effect.fnUntraced(function*(
  fiber: Fiber.Fiber<unknown, unknown>,
  description: string,
  done: (out: Output) => boolean
) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const exit = fiber.pollUnsafe()
    if (exit !== undefined) {
      const reason = Exit.isFailure(exit) ? Cause.pretty(exit.cause) : "it completed"
      return assert.fail(`the watch loop exited while waiting for ${description}: ${reason}\n${show(yield* output)}`)
    }
    const out = yield* output
    if (done(out)) return out
    yield* TestClock.adjust("50 millis")
    yield* liveSleep(25)
  }
  return assert.fail(`timed out waiting for ${description}\n${show(yield* output)}`)
})

/** Starts `Watch.run` over a fake `FileSystem.watch` and returns a handle to drive it. */
const start = Effect.fnUntraced(function*(configPath: string, onWatch?: (watched: string) => void) {
  const path = yield* Path.Path
  const events = yield* PubSub.unbounded<{ readonly file: string; readonly tag: "Create" | "Update" }>()
  const watch = (watched: string): Stream.Stream<FileSystem.WatchEvent> => {
    onWatch?.(watched)
    return Stream.fromPubSub(events).pipe(
      Stream.map(({ file, tag }): FileSystem.WatchEvent | undefined => {
        if (file === watched) return { _tag: tag, path: path.basename(watched) }
        const relative = path.relative(watched, file)
        return relative.startsWith("..") || path.isAbsolute(relative) ? undefined : { _tag: tag, path: relative }
      }),
      Stream.filter((event): event is FileSystem.WatchEvent => event !== undefined)
    )
  }
  const fiber = yield* Watch.run({ configPath, watch }).pipe(Effect.forkScoped)
  return {
    emit: (file: string, tag: "Create" | "Update" = "Update") => PubSub.publish(events, { file, tag }),
    waitFor: (
      description: string,
      done: (out: Output) => boolean
    ) => waitFor(fiber, description, done),
    waitForCycle: (count: number) =>
      waitFor(fiber, `cycle ${count}`, (out) => cycles(out).length >= count).pipe(
        Effect.map((out) => {
          assert.strictEqual(cycles(out).length, count, show(out))
          return cycles(out)[count - 1]
        })
      )
  }
})

describe("graphqlgen --watch", () => {
  it.effect("a document root created during watch installation stays watched", () =>
    Effect.gen(function*() {
      const p = yield* project({})
      let created = false
      const loop = yield* start(p.configPath, (watched) => {
        if (watched !== p.file("src") || created) return
        created = true
        // Appear after target selection, before installation, without emitting an event.
        mkdirSync(p.file("src"))
        writeFileSync(p.file("src/a.graphql"), query("A", "id"))
      })
      const initial = yield* loop.waitFor(
        "the initial document output",
        (out) => cycles(out).length > 0 && existsSync(p.file("src/a.graphql.ts"))
      )

      yield* write(p.dir, { "src/a.graphql": query("A", "id", "name") })
      yield* loop.emit(p.file("src/a.graphql"))
      yield* loop.waitFor("the document edit", (out) => cycles(out).length > cycles(initial).length)
      const expected = yield* Generator.generate(config, { cwd: p.dir })
      const output = expected.files.find((file) => file.path === p.file("src/a.graphql.ts"))!
      assert.strictEqual(yield* read(output.path), output.contents)
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("a document root created after startup is watched", () =>
    Effect.gen(function*() {
      const p = yield* project({})
      assert.isFalse(yield* exists(p.file("src")))
      const loop = yield* start(p.configPath)
      yield* loop.waitForCycle(1)

      yield* write(p.dir, { "src/a.graphql": query("A", "id") })
      yield* loop.emit(p.file("src"), "Create")
      yield* loop.waitForCycle(2)
      const expected = yield* Generator.generate(config, { cwd: p.dir })
      const output = expected.files.find((file) => file.path === p.file("src/a.graphql.ts"))!
      assert.strictEqual(yield* read(output.path), output.contents)
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("a document edit leaves unchanged outputs unwritten", () =>
    Effect.gen(function*() {
      const p = yield* project({ "src/a.graphql": query("A", "id"), "src/b.graphql": query("B", "id") })
      const loop = yield* start(p.configPath)
      yield* loop.waitForCycle(1)
      yield* backdate(["src/a.graphql.ts", "src/b.graphql.ts", "schema.graphql.ts"].map(p.file))
      const before = yield* read(p.file("src/a.graphql.ts"))

      yield* write(p.dir, { "src/a.graphql": query("A", "id", "name") })
      yield* loop.emit(p.file("src/a.graphql"))
      assert.strictEqual(yield* loop.waitForCycle(2), "regenerated 1 file, deleted 0")
      assert.notStrictEqual(yield* read(p.file("src/a.graphql.ts")), before)
      assert.strictEqual(yield* mtime(p.file("src/b.graphql.ts")), 0)
      assert.strictEqual(yield* mtime(p.file("schema.graphql.ts")), 0)
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("an error cycle reports diagnostics without replacing the last good output", () =>
    Effect.gen(function*() {
      const p = yield* project({ "src/a.graphql": query("A", "id") })
      const loop = yield* start(p.configPath)
      yield* loop.waitForCycle(1)
      const good = yield* read(p.file("src/a.graphql.ts"))

      yield* write(p.dir, { "src/a.graphql": query("A", "nope") })
      yield* loop.emit(p.file("src/a.graphql"))
      const failed = yield* loop.waitFor(
        "the error diagnostic",
        (out) => out.stderr.some((line) => line.includes(`src/a.graphql:3:5: error: Cannot query field "nope"`))
      )
      assert.strictEqual(cycles(failed).length, 1, show(failed))
      assert.strictEqual(yield* read(p.file("src/a.graphql.ts")), good)
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("an invalid config edit keeps the previous config active", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const p = yield* project({ "src/a.graphql": query("A", "id") })
      const loop = yield* start(p.configPath)
      yield* loop.waitForCycle(1)
      const before = yield* read(p.file("src/a.graphql.ts"))

      yield* write(p.dir, { "graphql.config.ts": configSource({ ...config, documents: "src/**/*.graphql" }) })
      yield* fs.utimes(p.configPath, 1_000, 1_000)
      yield* loop.emit(p.configPath)
      yield* loop.waitFor("the config error", (out) => out.stderr.some((line) => line.includes("not a valid config")))

      yield* write(p.dir, { "src/a.graphql": query("A", "id", "name") })
      yield* loop.emit(p.file("src/a.graphql"))
      assert.strictEqual(yield* loop.waitForCycle(2), "regenerated 1 file, deleted 0")
      assert.notStrictEqual(yield* read(p.file("src/a.graphql.ts")), before)
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("a burst of document events runs one debounced cycle", () =>
    Effect.gen(function*() {
      const p = yield* project({ "src/a.graphql": query("A", "id") })
      const loop = yield* start(p.configPath)
      yield* loop.waitForCycle(1)

      yield* write(p.dir, { "src/a.graphql": query("A", "id", "name") })
      for (let i = 0; i < 3; i++) {
        yield* loop.emit(p.file("src/a.graphql"))
        yield* liveSleep(25)
        yield* TestClock.adjust("20 millis")
      }
      yield* liveSleep(100)
      assert.strictEqual(cycles(yield* output).length, 1, "a cycle ran within 20 ms of the last event")

      yield* loop.waitForCycle(2)
      yield* TestClock.adjust("200 millis")
      yield* liveSleep(100)
      assert.deepStrictEqual(cycles(yield* output), ["regenerated 2 files, deleted 0", "regenerated 1 file, deleted 0"])
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.live(
    "real watchers survive rename-over and in-place saves",
    () =>
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const p = yield* project({ "src/a.graphql": query("A", "id") })
        const main = (yield* Effect.promise(
          () => import(new URL("../src/main.ts", import.meta.url).href)
        )) as { readonly run: Effect.Effect<void, unknown, never> }
        const fiber = yield* main.run.pipe(
          Effect.provide(Layer.mergeAll(
            TestConsole.layer,
            CliOutput.layer(CliOutput.defaultFormatter({ colors: false })),
            Stdio.layerTest({ args: Effect.succeed(["--config", p.configPath, "--watch"]) })
          )),
          Effect.forkScoped
        )
        const until = Effect.fnUntraced(
          function*(description: string, done: Effect.Effect<boolean, unknown, FileSystem.FileSystem>) {
            for (let attempt = 0; attempt < 300; attempt++) {
              const exit = fiber.pollUnsafe()
              if (exit !== undefined) {
                const reason = Exit.isFailure(exit) ? Cause.pretty(exit.cause) : "it completed"
                return assert.fail(`graphqlgen --watch exited while waiting for ${description}: ${reason}`)
              }
              if (yield* done) return
              yield* Effect.sleep("50 millis")
            }
            return assert.fail(`timed out waiting for ${description}`)
          }
        )

        yield* until("the first run", exists(p.file("src/a.graphql.ts")))
        const untilOutput = Effect.fnUntraced(function*(description: string) {
          const expected = yield* Generator.generate(config, { cwd: p.dir })
          const output = expected.files.find((file) => file.path === p.file("src/a.graphql.ts"))!
          yield* until(description, read(output.path).pipe(Effect.map((contents) => contents === output.contents)))
        })

        yield* write(p.dir, { "src/a.tmp": query("A", "id", "name") })
        yield* fs.rename(p.file("src/a.tmp"), p.file("src/a.graphql"))
        yield* untilOutput("the rename-over output")

        yield* write(p.dir, { "src/a.graphql": query("A", "id") })
        yield* untilOutput("the in-place edited output")
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
    30_000
  )
})
