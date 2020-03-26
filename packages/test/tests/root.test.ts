import { assert, run, testM } from "../src";
import { effect as T } from "@matechs/effect";
import { identity } from "fp-ts/lib/function";

run(testM("simple root")(T.sync(() => assert.deepEqual(2, 2))))(identity);
