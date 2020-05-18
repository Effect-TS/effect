import { effect as T } from "@matechs/effect"

import { assert, testM, customRun } from "../src"

customRun({
  describe,
  it: {
    run: it,
    skip: it.skip,
    todo: it.todo
  }
})(
  testM("simple root", T.sync(() => assert.deepStrictEqual(2, 2)) as T.SyncR<{}, void>)
)()
