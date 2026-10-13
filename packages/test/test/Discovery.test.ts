import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as path from "node:path"
import * as Assert from "../src/Assert.ts"
import * as Config from "../src/cli/Config.ts"
import { discover, globToRegExp } from "../src/Coordinator.ts"
import * as Matcher from "../src/Matcher.ts"
import * as Test from "../src/Test.ts"

const tree = "test/fixtures/tree"
const found = (paths: ReadonlyArray<string>, exclude?: ReadonlyArray<string>) => {
  const { empty, files, missing } = discover(paths, exclude)
  return { files: files.map((f) => path.relative(process.cwd(), f)), missing, empty }
}
const configs = path.join(import.meta.dirname, "fixtures/configs")
const load = (name: string) => Effect.exit(Config.load(path.join(configs, name), configs))

export default Test.suite("discovery and config", [
  Test.test("globs: * within a segment, ** across segments", () => {
    Assert.isTrue(globToRegExp("**/fixtures/**").test("test/fixtures/a.test.ts"))
    Assert.isTrue(globToRegExp("**/fixtures/**").test("fixtures/a.test.ts"))
    Assert.isFalse(globToRegExp("**/fixtures/**").test("test/myfixtures/a.test.ts"))
    Assert.isTrue(globToRegExp("test/*.test.ts").test("test/a.test.ts"))
    Assert.isFalse(globToRegExp("test/*.test.ts").test("test/sub/a.test.ts"))
    Assert.isTrue(globToRegExp("a.b?").test("a.bc"))
    Assert.isFalse(globToRegExp("a.b").test("axb"))
  }),
  Test.test("directories are searched, skipping node_modules and dot-directories", () => {
    Assert.equal(found([tree]).files, [`${tree}/a.test.ts`, `${tree}/sub/b.test.ts`, `${tree}/sub/fixtures/c.test.ts`])
  }),
  Test.test("exclude skips what it matches while searching", () => {
    Assert.equal(found([tree], ["**/sub/fixtures/**"]).files, [`${tree}/a.test.ts`, `${tree}/sub/b.test.ts`])
    Assert.equal(found(["test"], ["**/fixtures/**"]).files.filter((f) => f.includes("fixtures")), [])
  }),
  Test.test("a directory that is itself excluded is searched in full when named", () => {
    Assert.equal(found([tree], ["**/fixtures/**"]).files, [
      `${tree}/a.test.ts`,
      `${tree}/sub/b.test.ts`,
      `${tree}/sub/fixtures/c.test.ts`
    ])
  }),
  Test.test("a file named directly is never excluded", () => {
    Assert.equal(found([`${tree}/sub/fixtures/c.test.ts`], ["**/fixtures/**"]).files, [
      `${tree}/sub/fixtures/c.test.ts`
    ])
  }),
  Test.test("overlapping paths find a file once", () => {
    Assert.equal(found([tree, `${tree}/a.test.ts`]).files.filter((f) => f.endsWith("a.test.ts")).length, 1)
  }),
  Test.test("a path that yields no test file is reported, never ignored", () => {
    Assert.equal(found([`${tree}/notes.ts`, `${tree}/empty`, `${tree}/a.test.ts`, "nope"]), {
      files: [`${tree}/a.test.ts`],
      missing: ["nope"],
      empty: [`${tree}/notes.ts`, `${tree}/empty`]
    })
  }),
  Test.test(
    "a valid config",
    Effect.gen(function*() {
      const config = Assert.success(yield* load("valid.ts"))
      Assert.equal(
        config,
        Matcher.partial({
          paths: ["test"],
          exclude: ["**/fixtures/**"],
          workers: 3,
          defaults: { timeoutMs: 30_000, retries: 1 },
          shared: 1
        })
      )
      Assert.includes(Config.describe(config), "workers: 3 (valid.ts; --workers overrides)")
    })
  ),
  Test.test(
    "an unknown key is an error, with a hint",
    Effect.gen(function*() {
      const error = Assert.failure(yield* load("unknown-key.ts"))
      Assert.match(
        error.message,
        /^unknown-key\.ts: unknown key "timeout" \(did you mean `defaults: \{ timeout: \.\.\. \}`\?\)/
      )
    })
  ),
  Test.test(
    "a bad value is an error",
    Effect.gen(function*() {
      const error = Assert.failure(yield* load("bad-retries.ts"))
      Assert.equal(error.message, "bad-retries.ts: `defaults.retries` must be a whole number, at least 0")
    })
  ),
  Test.test(
    "a config that throws fails to load, with the reason",
    Effect.gen(function*() {
      const error = Assert.failure(yield* load("throws.ts"))
      Assert.match(error.message, /^throws\.ts: failed to load\nError: broken config/)
    })
  ),
  Test.test(
    "--config and --no-config together are an error",
    Effect.gen(function*() {
      const exit = yield* Effect.exit(
        Config.locate(".", { config: { _tag: "Some", value: "x" } as any, noConfig: true })
      )
      Assert.match(Assert.failure(exit).message, /contradict/)
      Assert.isTrue(Exit.isFailure(exit))
    })
  )
])
