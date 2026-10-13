// Projects: a test file belongs to the nearest etest.config.ts above it; the outermost one is the
// workspace root, whose defaults and shared layers every project inherits. Uses the fixture
// workspace in test/fixtures/workspace (see its configs).
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as path from "node:path"
import * as Assert from "../src/Assert.ts"
import { findConfig } from "../src/cli/root.ts"
import * as Workspace from "../src/cli/Workspace.ts"
import { dispatchOrder, shortId, testKey } from "../src/Coordinator.ts"
import * as Executor from "../src/Executor.ts"
import * as Matcher from "../src/Matcher.ts"
import type { TestFinished } from "../src/Protocol.ts"
import * as Test from "../src/Test.ts"
import { seen } from "./fixtures/workspace/shared.ts"

const fixtures = path.join(import.meta.dirname, "fixtures")
const root = path.join(fixtures, "workspace")
/** The fixture workspace, as `etest --config test/fixtures/workspace/etest.config.ts` would see it. */
const workspace = Workspace.workspaceAt(path.join(root, "etest.config.ts"), root)

/** Where each test file was found (paths relative to the fixture workspace's root), and in which project. */
const found = (paths: ReadonlyArray<string>) =>
  Effect.gen(function*() {
    const discovered = yield* Workspace.discover(yield* workspace, paths)
    return {
      files: discovered.files.map((f) => [path.relative(root, f.file), f.project.key]),
      projects: discovered.projects.map((p) => p.key),
      missing: discovered.missing,
      empty: discovered.empty
    }
  })

export default Test.suite("projects", [
  Test.test("the workspace root is the outermost etest.config.ts up to the repository root", () => {
    // from inside the fixture's nested project, past the fixture's own root, up to this package's config
    Assert.equal(findConfig(path.join(root, "pkg", "test")), path.join(import.meta.dirname, "..", "etest.config.ts"))
  }),
  Test.test(
    "a search crosses into nested projects; each file belongs to the nearest project above it",
    Effect.gen(function*() {
      Assert.equal(yield* found([]), {
        // pkg is searched with its own `paths` (test/), so pkg/src is not; ignored/ is excluded by the
        // workspace, so its config (which throws) is never loaded
        files: [["a.test.ts", "."], ["pkg/test/c.test.ts", "pkg"], ["pkg/test/d.test.ts", "pkg"], [
          "plain/b.test.ts",
          "."
        ]],
        projects: [".", "pkg"],
        missing: [],
        empty: []
      })
    })
  ),
  Test.test(
    "a path inside a project runs with that project, whatever its `paths` say",
    Effect.gen(function*() {
      const { files, projects } = yield* found(["pkg"])
      Assert.equal(files, [["pkg/src/e.test.ts", "pkg"], ["pkg/test/c.test.ts", "pkg"], ["pkg/test/d.test.ts", "pkg"]])
      Assert.equal(projects, ["pkg"])
      Assert.equal((yield* found(["pkg/src/e.test.ts"])).files, [["pkg/src/e.test.ts", "pkg"]])
    })
  ),
  Test.test(
    "defaults: a project's own value, else the workspace's, else built-in, one key at a time",
    Effect.gen(function*() {
      const ws = yield* workspace
      Assert.equal(ws.root.defaults, { timeoutMs: 30_000, retries: 1 })
      const pkg = Assert.defined(yield* ws.at(path.join(root, "pkg")))
      Assert.equal(pkg.defaults, { timeoutMs: 30_000, retries: 2 })
      Assert.equal(pkg.configs, [path.join(root, "etest.config.ts"), path.join(root, "pkg", "etest.config.ts")])
      const described = Workspace.describe(ws, pkg)
      Assert.includes(described, "timeout: 30s (etest.config.ts; a suite or test can set its own)")
      Assert.includes(described, "retries: 2 (pkg/etest.config.ts; a suite or test can set its own)")
      Assert.includes(
        described,
        "paths: [\"test\"] (pkg/etest.config.ts; paths given on the command line replace them)"
      )
    })
  ),
  Test.test(
    "`workers` in a nested config is an error: a run has one set of executors",
    Effect.gen(function*() {
      const dir = path.join(fixtures, "workspace-workers")
      const ws = yield* Workspace.workspaceAt(path.join(dir, "etest.config.ts"), dir)
      const error = Assert.failure(yield* Effect.exit(ws.at(path.join(dir, "sub"))))
      Assert.match(error.message, /^sub\/etest\.config\.ts: `workers` can only be set in the workspace root's config/)
    })
  ),
  Test.test("a test's key is its id, prefixed with its project; short ids hash the key", () => {
    Assert.equal(testKey(".", "a.test.ts > x"), "a.test.ts > x")
    Assert.equal(testKey("pkg", "test/c.test.ts > x"), "pkg/test/c.test.ts > x")
    Assert.isFalse(shortId(testKey("pkg", "a.test.ts > x")) === shortId(testKey("other", "a.test.ts > x")))
  }),
  Test.test("dispatch order: no history first, then failed, then the slowest", () => {
    const history = new Map([
      ["fast > t", { status: "passed" as const, durationMs: 10 }],
      ["slow > t", { status: "passed" as const, durationMs: 900 }],
      ["failed > t", { status: "failed" as const, durationMs: 5 }]
    ])
    Assert.equal(
      dispatchOrder(
        [["fast", ["fast > t"]], ["slow", ["slow > t"]], ["new", ["new > t"]], ["failed", ["failed > t"]]],
        (key) => history.get(key)
      ),
      ["new", "failed", "slow", "fast"]
    )
  }),
  Test.test(
    "shared layers nest: the workspace's are shared by every project, a project's by its files only",
    Effect.gen(function*() {
      const ws = yield* workspace
      const run = (file: string) =>
        Effect.gen(function*() {
          const project = yield* ws.of(file)
          const { nodes } = yield* Executor.listFile(file, project.dir)
          const tests = nodes.filter((n) => n.kind === "test").map((n) => ({
            id: n.id,
            seed: 1,
            timeoutMs: 5_000,
            retries: 0
          }))
          const events = yield* Stream.runCollect(
            Executor.runFile(file, {
              root: project.dir,
              project: project.key,
              configs: project.configs,
              concurrency: 4
            }, tests)
          )
          return events.filter((e): e is TestFinished => e._tag === "TestFinished")
        })
      const [a, c, d] = yield* Effect.all([
        run(path.join(root, "a.test.ts")),
        run(path.join(root, "pkg/test/c.test.ts")),
        run(path.join(root, "pkg/test/d.test.ts"))
      ]).pipe(Effect.provide(Executor.ExecutorState.layer))
      // ids are relative to the file's project; every event names it
      Assert.equal(a, [Matcher.partial({ project: ".", id: "a.test.ts > records", status: "passed" })])
      Assert.equal(c, [Matcher.partial({ project: "pkg", id: "test/c.test.ts > records", status: "passed" })])
      Assert.equal(d.length, 1)
      const { a: sa, c: sc, d: sd } = seen
      Assert.equal(sa.workspace, sc.workspace)
      Assert.equal(sc.workspace, sd.workspace)
      Assert.equal(sc.project, sd.project)
      // the root project's files don't list pkg's shared layer: they build their own
      Assert.isFalse(sa.project === sc.project)
    })
  )
])
