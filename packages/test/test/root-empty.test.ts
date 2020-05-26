import { assert, testM, customRun } from "../src"

import * as T from "@matechs/core/Effect"

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
