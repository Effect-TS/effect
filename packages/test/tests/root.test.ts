import { assert, run, testM } from "../src";
import { effect as T } from "@matechs/effect";

run(testM("simple root")(T.sync(() => assert.deepEqual(2, 2))))();
