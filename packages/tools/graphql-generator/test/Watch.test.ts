/**
 * `graphqlgen --watch` (EFF-1834 points 14 to 17).
 *
 * The loop tests drive `Watch.run` with injected events under `TestClock`
 * against a scratch project under `test/.tmp`. `watch` fakes
 * `FileSystem.watch`: an event published for an absolute path reaches every
 * subscription on that path or a directory above it, relative to the
 * subscribed path as Node reports it. The smoke test runs `graphqlgen --watch`
 * with the real `FileSystem.watch`.
 */
import type * as Config from "@effect/graphql-generator/Config"
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
import * as Runtime from "effect/Runtime"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import { TestClock, TestConsole } from "effect/testing"
import { fileURLToPath } from "node:url"

const schemaSdl = (name = "String!") =>
  `scalar Url
scalar Date

enum Role {
  ADMIN
  MEMBER
}

type User {
  id: ID!
  name: ${name}
  avatar: Url
  born: Date
  role: Role!
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
  yield* write(dir, { "graphql.config.ts": configSource(config), "schema.graphql": schemaSdl(), ...documents })
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

/** Asserts that every generated file on disk matches a fresh `generate` with `value`. */
const assertUpToDate = Effect.fnUntraced(function*(dir: string, value: Config.Config = config) {
  const expected = yield* Generator.generate(value, { cwd: dir })
  assert.deepStrictEqual(expected.diagnostics.filter((diagnostic) => diagnostic.severity === "error"), [])
  for (const file of expected.files) {
    assert.strictEqual(yield* read(file.path), file.contents, file.path)
  }
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

const unmappedWarnings = (out: Output): ReadonlyArray<string> =>
  out.stderr.filter((line) => line.includes("warning: Custom scalars without a mapping"))

const show = (out: Output): string => `stdout:\n${out.stdout.join("\n")}\nstderr:\n${out.stderr.join("\n")}`

/**
 * Polls the console until `done` holds, failing if the loop exits first.
 * With `advance`, each poll also moves the `TestClock` past the debounce.
 */
const waitFor = Effect.fnUntraced(function*(
  fiber: Fiber.Fiber<unknown, unknown>,
  description: string,
  done: (out: Output) => boolean,
  options: { readonly advance: boolean } = { advance: true }
) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const exit = fiber.pollUnsafe()
    if (exit !== undefined) {
      const reason = Exit.isFailure(exit) ? Cause.pretty(exit.cause) : "it completed"
      return assert.fail(`the watch loop exited while waiting for ${description}: ${reason}\n${show(yield* output)}`)
    }
    const out = yield* output
    if (done(out)) return out
    if (options.advance) yield* TestClock.adjust("50 millis")
    yield* liveSleep(25)
  }
  return assert.fail(`timed out waiting for ${description}\n${show(yield* output)}`)
})

/** Starts `Watch.run` over a fake `FileSystem.watch` and returns a handle to drive it. */
const start = Effect.fnUntraced(function*(configPath: string) {
  const path = yield* Path.Path
  const events = yield* PubSub.unbounded<{ readonly _tag: FileSystem.WatchEvent["_tag"]; readonly file: string }>()
  const watch = (watched: string): Stream.Stream<FileSystem.WatchEvent> =>
    Stream.fromPubSub(events).pipe(
      Stream.map((event): FileSystem.WatchEvent | undefined => {
        if (event.file === watched) return { _tag: event._tag, path: path.basename(watched) }
        const relative = path.relative(watched, event.file)
        return relative.startsWith("..") || path.isAbsolute(relative) ? undefined : { _tag: event._tag, path: relative }
      }),
      Stream.filter((event): event is FileSystem.WatchEvent => event !== undefined)
    )
  const fiber = yield* Watch.run({ configPath, watch }).pipe(Effect.forkScoped)
  const handle = {
    fiber,
    emit: (tag: FileSystem.WatchEvent["_tag"], file: string) => PubSub.publish(events, { _tag: tag, file }),
    waitFor: (
      description: string,
      done: (out: Output) => boolean,
      options?: { readonly advance: boolean }
    ) => waitFor(fiber, description, done, options),
    waitForCycle: (count: number) =>
      waitFor(fiber, `cycle ${count}`, (out) => cycles(out).length >= count).pipe(
        Effect.map((out) => {
          assert.strictEqual(cycles(out).length, count, show(out))
          return cycles(out)[count - 1]
        })
      )
  }
  return handle
})

describe("graphqlgen --watch", () => {
  it.effect("a document edit regenerates only its file, plus the shared module when the types it reaches change", () =>
    Effect.gen(function*() {
      const p = yield* project({ "src/a.graphql": query("A", "id"), "src/b.graphql": query("B", "id") })
      const outputs = ["src/a.graphql.ts", "src/b.graphql.ts", "schema.graphql.ts"].map(p.file)
      const loop = yield* start(p.configPath)
      assert.strictEqual(yield* loop.waitForCycle(1), "regenerated 3 files, deleted 0")
      yield* assertUpToDate(p.dir)

      yield* backdate(outputs)
      yield* write(p.dir, { "src/a.graphql": query("A", "id", "name") })
      yield* loop.emit("Update", p.file("src/a.graphql"))
      assert.strictEqual(yield* loop.waitForCycle(2), "regenerated 1 file, deleted 0")
      yield* assertUpToDate(p.dir)
      assert.notStrictEqual(yield* mtime(p.file("src/a.graphql.ts")), 0)
      assert.strictEqual(yield* mtime(p.file("src/b.graphql.ts")), 0, "b.graphql.ts was rewritten")
      assert.strictEqual(yield* mtime(p.file("schema.graphql.ts")), 0, "the shared module was rewritten")

      // `role` reaches the `Role` enum, which the shared module now has to hold.
      yield* backdate(outputs)
      yield* write(p.dir, { "src/a.graphql": query("A", "id", "name", "role") })
      yield* loop.emit("Update", p.file("src/a.graphql"))
      assert.strictEqual(yield* loop.waitForCycle(3), "regenerated 2 files, deleted 0")
      yield* assertUpToDate(p.dir)
      assert.notStrictEqual(yield* mtime(p.file("schema.graphql.ts")), 0)
      assert.strictEqual(yield* mtime(p.file("src/b.graphql.ts")), 0, "b.graphql.ts was rewritten")
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("a schema edit is picked up by every output, and only changed bytes are written", () =>
    Effect.gen(function*() {
      const p = yield* project({ "src/a.graphql": query("A", "id", "name"), "src/b.graphql": query("B", "id") })
      const loop = yield* start(p.configPath)
      yield* loop.waitForCycle(1)
      yield* backdate(["src/a.graphql.ts", "src/b.graphql.ts", "schema.graphql.ts"].map(p.file))

      yield* write(p.dir, { "schema.graphql": schemaSdl("String") })
      yield* loop.emit("Update", p.file("schema.graphql"))
      assert.strictEqual(yield* loop.waitForCycle(2), "regenerated 1 file, deleted 0")
      yield* assertUpToDate(p.dir)
      assert.notStrictEqual(yield* mtime(p.file("src/a.graphql.ts")), 0)
      assert.strictEqual(yield* mtime(p.file("src/b.graphql.ts")), 0, "b.graphql.ts was rewritten")
      assert.strictEqual(yield* mtime(p.file("schema.graphql.ts")), 0, "the shared module was rewritten")
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("an error cycle prints diagnostics and keeps the last good output; the next good edit recovers", () =>
    Effect.gen(function*() {
      const p = yield* project({ "src/a.graphql": query("A", "id") })
      const loop = yield* start(p.configPath)
      yield* loop.waitForCycle(1)
      const good = yield* read(p.file("src/a.graphql.ts"))

      yield* write(p.dir, { "src/a.graphql": query("A", "nope") })
      yield* loop.emit("Update", p.file("src/a.graphql"))
      const failed = yield* loop.waitFor(
        "the error diagnostic",
        (out) => out.stderr.some((line) => line.includes(`src/a.graphql:3:5: error: Cannot query field "nope"`))
      )
      assert.strictEqual(cycles(failed).length, 1, show(failed))
      assert.strictEqual(yield* read(p.file("src/a.graphql.ts")), good)

      yield* write(p.dir, { "src/a.graphql": query("A", "id", "name") })
      yield* loop.emit("Update", p.file("src/a.graphql"))
      assert.strictEqual(yield* loop.waitForCycle(2), "regenerated 1 file, deleted 0")
      yield* assertUpToDate(p.dir)
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("a failing first run keeps watching", () =>
    Effect.gen(function*() {
      const p = yield* project({ "src/a.graphql": query("A", "nope") })
      const loop = yield* start(p.configPath)
      yield* loop.waitFor("the error diagnostic", (out) => out.stderr.some((line) => line.includes("error:")))
      assert.isFalse(yield* exists(p.file("src/a.graphql.ts")))

      yield* write(p.dir, { "src/a.graphql": query("A", "id") })
      yield* loop.emit("Update", p.file("src/a.graphql"))
      assert.strictEqual(yield* loop.waitForCycle(1), "regenerated 2 files, deleted 0")
      yield* assertUpToDate(p.dir)
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("a config that fails to load at startup exits with code 2", () =>
    Effect.gen(function*() {
      const p = yield* project({ "src/a.graphql": query("A", "id") })
      yield* write(p.dir, { "graphql.config.ts": configSource({ ...config, documents: "src/**/*.graphql" }) })

      const exit = yield* Effect.exit(Watch.run({ configPath: p.configPath, watch: () => Stream.never }))
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) {
        assert.strictEqual(Runtime.getErrorExitCode(Cause.squash(exit.cause)), 2, Cause.pretty(exit.cause))
      }
      assert.isFalse(yield* exists(p.file("src/a.graphql.ts")))
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("the unmapped-scalars warning prints only when its set changes", () =>
    Effect.gen(function*() {
      const p = yield* project({ "src/a.graphql": query("A", "avatar"), "src/b.graphql": query("B", "id") })
      const loop = yield* start(p.configPath)
      yield* loop.waitFor("the first warning", (out) => cycles(out).length === 1 && unmappedWarnings(out).length === 1)

      yield* write(p.dir, { "src/b.graphql": query("B", "id", "name") })
      yield* loop.emit("Update", p.file("src/b.graphql"))
      yield* loop.waitForCycle(2)
      const unrelated = yield* output
      assert.strictEqual(unmappedWarnings(unrelated).length, 1, show(unrelated))

      yield* write(p.dir, { "src/a.graphql": query("A", "avatar", "born") })
      yield* loop.emit("Update", p.file("src/a.graphql"))
      const changed = yield* loop.waitFor(
        "the second warning",
        (out) => cycles(out).length === 3 && unmappedWarnings(out).length === 2
      )
      assert.include(unmappedWarnings(changed)[1], "Date")
      assert.include(unmappedWarnings(changed)[1], "Url")
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("a config edit that fails to decode keeps the old config; a valid edit takes effect", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const p = yield* project({ "src/a.graphql": query("A", "id") })
      const loop = yield* start(p.configPath)
      yield* loop.waitForCycle(1)

      yield* write(p.dir, { "graphql.config.ts": configSource({ ...config, documents: "src/**/*.graphql" }) })
      yield* fs.utimes(p.configPath, 1_000, 1_000)
      yield* loop.emit("Update", p.configPath)
      yield* loop.waitFor("the config error", (out) => out.stderr.some((line) => line.includes("not a valid config")))

      // The documents edit still regenerates under the previous config.
      yield* write(p.dir, { "src/a.graphql": query("A", "id", "name") })
      yield* loop.emit("Update", p.file("src/a.graphql"))
      yield* loop.waitForCycle(2)
      yield* assertUpToDate(p.dir)

      const moved = { ...config, shared: "./src/shared.graphql.ts" }
      yield* write(p.dir, { "graphql.config.ts": configSource(moved) })
      yield* fs.utimes(p.configPath, 2_000, 2_000)
      yield* loop.emit("Update", p.configPath)
      yield* loop.waitForCycle(3)
      assert.isTrue(yield* exists(p.file("src/shared.graphql.ts")))
      yield* assertUpToDate(p.dir, moved)
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("deleting a .graphql file removes its generated output", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const p = yield* project({ "src/a.graphql": query("A", "id"), "src/b.graphql": query("B", "id") })
      const loop = yield* start(p.configPath)
      yield* loop.waitForCycle(1)
      assert.isTrue(yield* exists(p.file("src/b.graphql.ts")))

      yield* fs.remove(p.file("src/b.graphql"))
      yield* loop.emit("Remove", p.file("src/b.graphql"))
      assert.strictEqual(yield* loop.waitForCycle(2), "regenerated 0 files, deleted 1")
      assert.isFalse(yield* exists(p.file("src/b.graphql.ts")))
      assert.isTrue(yield* exists(p.file("src/a.graphql.ts")))
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.effect("events for generated or unmatched files are ignored, and a burst of edits runs one cycle", () =>
    Effect.gen(function*() {
      const p = yield* project({ "src/a.graphql": query("A", "id"), "notes.md": "notes\n" })
      const loop = yield* start(p.configPath)
      yield* loop.waitForCycle(1)
      const quiet = (description: string) =>
        Effect.gen(function*() {
          yield* liveSleep(100)
          const out = yield* output
          assert.strictEqual(cycles(out).length, 1, `${description}\n${show(out)}`)
        })

      yield* loop.emit("Update", p.file("src/a.graphql.ts"))
      yield* loop.emit("Update", p.file("notes.md"))
      yield* liveSleep(25)
      yield* TestClock.adjust("200 millis")
      yield* quiet("an event for a generated or unmatched file ran a cycle")

      yield* write(p.dir, { "src/a.graphql": query("A", "id", "name") })
      for (const tag of ["Update", "Update", "Update"] as const) {
        yield* loop.emit(tag, p.file("src/a.graphql"))
        yield* liveSleep(25)
        yield* TestClock.adjust("20 millis")
      }
      yield* quiet("a cycle ran within 20 ms of the last event")

      yield* TestClock.adjust("100 millis")
      yield* loop.waitFor("the debounced cycle", (out) => cycles(out).length >= 2, { advance: false })
      yield* TestClock.adjust("200 millis")
      yield* liveSleep(100)
      const out = yield* output
      assert.deepStrictEqual(
        cycles(out),
        ["regenerated 2 files, deleted 0", "regenerated 1 file, deleted 0"],
        show(out)
      )
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))

  it.live("graphqlgen --watch regenerates after a real .graphql edit", () =>
    Effect.gen(function*() {
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
      yield* write(p.dir, { "src/a.graphql": query("A", "id", "name") })
      const expected = yield* Generator.generate(config, { cwd: p.dir })
      const output = expected.files.find((file) => file.path === p.file("src/a.graphql.ts"))!
      yield* until(
        "the edited output",
        read(output.path).pipe(Effect.map((contents) => contents === output.contents))
      )
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)), 30_000)
})
