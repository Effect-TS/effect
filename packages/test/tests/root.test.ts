import { assert, testM, customRun, testEff } from "../src";
import { effect as T, eff as EFF } from "@matechs/effect";

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
    T.sync(() => assert.deepEqual(2, 2))
  ),
  testEff(
    "simple root eff",
    EFF.sync(() => assert.deepEqual(2, 2))
  )
)();
