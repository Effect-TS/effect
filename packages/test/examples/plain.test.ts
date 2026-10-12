// Plain (sync / Promise) tests run one at a time per executor, so an assertion after an
// `await` is attributed to the right test without AsyncLocalStorage. Effect tests keep
// running concurrently alongside them.
import { Effect } from "effect"
import { assertEquals, assertTrue } from "../src/Assert.ts"
import * as Test from "../src/Test.ts"

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

let running = 0
const plain = (n: number) =>
  Test.test(`plain test ${n} asserts after awaits`, async () => {
    running++
    await sleep(10)
    assertEquals(running, 1) // never overlaps another plain test
    await sleep(10)
    running--
    assertTrue(true) // counted after an await: without this the test would fail "zero assertions"
  })

export default Test.suite("plain tests", [
  plain(1),
  plain(2),
  plain(3),
  Test.test("an Effect test runs alongside them", Effect.gen(function*() {
    yield* Effect.promise(() => sleep(15))
    assertTrue(true)
  }))
])
