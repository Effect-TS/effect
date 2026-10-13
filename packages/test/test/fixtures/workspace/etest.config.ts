// The workspace root of test/Projects.test.ts: run-wide settings, and defaults for every project.
import * as Test from "../../../src/Test.ts"
import { WorkspaceThing } from "./shared.ts"

export default Test.config({
  workers: 1,
  exclude: ["**/ignored/**"],
  defaults: { timeout: "30 seconds", retries: 1 },
  shared: [WorkspaceThing.layer]
})
