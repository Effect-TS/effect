import { effect as T } from "../src";
import { deepEqual } from "assert";
import { done } from "../src/original/exit";

describe("Fluent", () => {
  it("chain", async () => {
    deepEqual(
      await T.runToPromiseExit(T.pure(10).chain(n => T.pure(n + 1))),
      done(11)
    );
  });
});
