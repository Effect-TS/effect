import { effect as T, retry as R, exit as E } from "../src";
import * as assert from "assert";
import { limitRetries } from "retry-ts";

describe("Retry", () => {
  it("should retry", async () => {
    const program = R.retrying(
      limitRetries(2),
      ({ iterNumber }) =>
        iterNumber > 1 ? T.pure(0) : T.raiseError(undefined),
      E.isRaise
    );

    assert.deepEqual(await T.runToPromise(program), 0);
  });
});
