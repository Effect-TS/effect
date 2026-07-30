import * as Runtime from "@effect/doctest/Runtime"
import { assert } from "@effect/vitest"

const log = console.log
const dir = console.dir

Runtime.test(
  "asserts formatted console output",
  () => {
    console.log("Hello")
    console.dir({ value: 1 })
    console.warn("Warning")
  },
  "Hello\n{ value: 1 }\nWarning"
)

Runtime.test("runs examples without expected output", () => {
  assert.strictEqual(1 + 1, 2)
  assert.strictEqual(console.log, log)
  assert.strictEqual(console.dir, dir)
})
