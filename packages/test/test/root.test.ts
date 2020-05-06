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
  testM(
    "simple root",
    T.accessM(({ n }: { n: number }) =>
      T.access((_: { k?: string }) => assert.deepStrictEqual(2, n))
    )
  )
)(
  T.provide({
    n: 2
  })
)
