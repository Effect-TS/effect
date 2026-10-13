// The test config. It only optimises: every test file still provides everything it needs.
// `shared` layers are built lazily, once per run, the first time any file provides that same
// Layer value; a file opts out with `Test.provide(Layer.fresh(layer))`.
// For now: "once per run" is once per executor (worker); the real design is coordinator-owned.
import { Database } from "./examples/shared.ts"
import * as Test from "./src/Test.ts"

export default Test.config({
  // `etest` alone runs the self-tests; the examples (with their intentional failures) run with `etest examples`
  paths: ["test"],
  // files that the self-tests load or search themselves
  exclude: ["**/fixtures/**"],
  shared: [Database.layer]
})
