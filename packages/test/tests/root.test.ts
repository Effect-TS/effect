import { assert, testM, customRun } from "../src";
import { effect as T } from "@matechs/effect";

customRun({
  describe,
  it
})(testM("simple root")(T.sync(() => assert.deepEqual(2, 2))))();
