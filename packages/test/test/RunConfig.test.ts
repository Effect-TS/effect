// The coordinator's input is plain data, decoded with the `RunConfig` Schema before anything runs.
import * as Schema from "effect/Schema"
import * as Assert from "../src/Assert.ts"
import { builtinDefaults, RunConfig, TESTS_PER_FILE } from "../src/Coordinator.ts"
import * as Matcher from "../src/Matcher.ts"
import * as Test from "../src/Test.ts"

const decode = Schema.decodeUnknownExit(RunConfig, { onExcessProperty: "error", errors: "all" })
const minimal = {
  root: "/ws",
  projects: [{ key: ".", dir: "/ws" }],
  files: [{ file: "/ws/a.test.ts", project: "." }],
  seed: 1
}

export default Test.suite("run config", [
  Test.test("what isn't set gets its default", () => {
    Assert.equal(
      Assert.success(decode(minimal)),
      Matcher.partial({
        projects: [{ key: ".", dir: "/ws", configs: [], defaults: builtinDefaults }],
        filter: {},
        description: { paths: [], filters: [] },
        testsPerFile: TESTS_PER_FILE,
        bail: false,
        history: {}
      })
    )
  }),
  Test.test("a file in a project that isn't listed is an error", () => {
    const error = Assert.failure(decode({ ...minimal, files: [{ file: "/ws/a.test.ts", project: "pkg" }] }))
    Assert.includes(error.message, "/ws/a.test.ts is in project \"pkg\", which is not in `projects`")
  }),
  Test.test("paths are absolute, and unknown keys are errors", () => {
    const error = Assert.failure(decode({ ...minimal, root: "ws", workers: 2 }))
    Assert.includes(error.message, "Expected an absolute path\n  at [\"root\"]")
    Assert.includes(error.message, "Expected no excess property\n  at [\"workers\"]")
  })
])
