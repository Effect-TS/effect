import { T, pipe, Ex, F } from "@matechs/aio";
import * as assert from "assert";

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
const canceller: F.Lazy<void> = T.run(addAndMul, (result) => {
  assert.deepStrictEqual(result, Ex.done(6));
});
