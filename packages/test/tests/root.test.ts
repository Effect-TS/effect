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
    T.access((_: { n: number }) => assert.deepEqual(2, _.n))
  )
)(
  T.provide({
    n: 2
  })
);
