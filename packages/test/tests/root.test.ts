import { assert, testM, customRun } from "../src";
import { effect as T } from "@matechs/effect";

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
    T.accessM(({ n }: { n: number }) => T.access((_: { k?: string }) => assert.deepEqual(2, n)))
  )
)(
  T.provide({
    n: 2
  })
);
