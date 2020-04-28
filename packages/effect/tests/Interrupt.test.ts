import { effect as T } from "../src";
import * as assert from "assert";
import { interruptWithError, interruptWithErrorAndOthers } from "../src/original/exit";
import { sequenceT } from "fp-ts/lib/Apply";
import { array } from "fp-ts/lib/Array";

describe("Interrupt", () => {
  it("should interrupt with error", async () => {
    let exit: any = null;

    const program = T.async(() => (cb) => {
      setTimeout(() => {
        cb(new Error("test error"));
      }, 100);
    });

    const canceller = T.run(program, (ex) => {
      exit = ex;
    });

    canceller();

    await T.runToPromise(T.delay(T.unit, 110));

    assert.deepStrictEqual(exit, interruptWithError(new Error("test error")));
  });

  it("should interrupt with error parallel", async () => {
    let exit: any = null;

    const program = sequenceT(T.parEffect)(
      T.async(() => (cb) => {
        setTimeout(() => {
          cb(new Error("test error"));
        }, 100);
      }),
      T.async(() => (cb) => {
        setTimeout(() => {
          cb(new Error("test error 2"));
        }, 100);
      })
    );

    const canceller = T.run(program, (ex) => {
      exit = ex;
    });

    canceller();

    await T.runToPromise(T.delay(T.unit, 250));

    assert.deepStrictEqual(
      exit,
      interruptWithErrorAndOthers(new Error("test error"), [new Error("test error 2")])
    );
  });

  it("parallel interrupt", async () => {
    let counter = 0;

    const program = T.asyncTotal((x) => {
      const timer = setTimeout(() => {
        x(undefined);
      }, 3000);
      return (cb) => {
        counter++;
        clearTimeout(timer);
        cb();
      };
    });

    const par = array.sequence(T.parEffect)([program, program, program]);

    const fiber = await T.runToPromise(T.fork(par));

    await T.runToPromise(fiber.interrupt);

    expect(counter).toBe(3);
  });
});
