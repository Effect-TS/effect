import * as assert from "assert";

import * as T from "@matechs/core/Effect";
import * as Ex from "@matechs/core/Exit";
import { pipe } from "@matechs/core/Function";

const add = (x: number, y: number): T.Sync<number> => T.sync(() => x + y);
const mul = (x: number, y: number): T.Sync<number> => T.sync(() => x * y);

const addAndMul = pipe(
  add(1, 2),
  T.chain((n) => mul(n, 2)),
  T.liftDelay(100)
);

// run as non failable promise returning Exit
T.runToPromiseExit(addAndMul).then((result) => {
  assert.deepStrictEqual(result, Ex.done(6));
});

// run as failable promise returning result
T.runToPromise(addAndMul)
  .then((result) => {
    assert.deepStrictEqual(result, 6);
  })
  .catch((error) => {
    console.error(error);
  });

// invoking canceller cancel the computation (not in this case because all sync)
export const canceller = T.run(addAndMul, (result) => {
  assert.deepStrictEqual(result, Ex.done(6));
});
