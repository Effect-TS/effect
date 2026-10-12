// The test config. It only optimises: every test file still provides everything it needs.
// `shared` layers are built lazily, once per run, the first time any file provides that same
// Layer value; a file opts out with `Test.provide(Layer.fresh(layer))`.
// For now: "once per run" is once per executor (worker); the real design is coordinator-owned.
import { Database } from "./examples/shared.ts"
import * as Test from "./src/Test.ts"

export default Test.config({
  shared: [Database.layer]
})
