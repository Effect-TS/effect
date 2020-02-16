import { effect as T } from "../src";
import * as assert from "assert";
import { sequenceT } from "fp-ts/lib/Apply";

describe("Interrupt", () => {
  it("interrupt", async () => {
    const program = T.delay(
      T.asyncTotal(() => cb => {
        setTimeout(() => {
          cb(T.interruptSuccess());
        }, 200);
      }),
      10
    );

    const cancel = T.run(program);
    let done = 0;
    const er: Error[] = [];

    await T.runToPromise(T.delay(T.unit, 200));

    cancel(({ errors }) => {
      done = done + 1;
      er.push(...errors);
    });

    assert.deepEqual(done, 0);
    await T.runToPromise(T.delay(T.unit, 200));
    assert.deepEqual(done, 1);
    assert.deepEqual(er, []);
  });

  it("interrupt error", async () => {
    const program = sequenceT(T.parEffect)(
      T.asyncTotal(() => cb => {
        setTimeout(() => {
          cb(T.interruptError(new Error("err")));
        }, 200);
      }),
      T.asyncTotal(() => cb => {
        setTimeout(() => {
          cb(T.interruptError(new Error("err")));
        }, 200);
      }),
      T.asyncTotal(() => cb => {
        setTimeout(() => {
          cb(T.interruptError(new Error("err")));
        }, 200);
      })
    );

    const cancel = T.run(program);
    let done = 0;
    const er: Error[] = [];

    await T.runToPromise(T.delay(T.unit, 100));
    cancel(({ errors }) => {
      done = done + 1;
      er.push(...errors);
    });

    assert.deepEqual(done, 0);
    await T.runToPromise(T.delay(T.unit, 2000));
    assert.deepEqual(done, 1);
    assert.deepEqual(er, [
      new Error("err"),
      new Error("err"),
      new Error("err")
    ]);
  });
});
