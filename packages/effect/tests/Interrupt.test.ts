import { effect as T } from "../src";
import * as assert from "assert";
import {
  interruptWithError,
  interruptWithErrorAndOthers
} from "../src/original/exit";
import { sequenceT } from "fp-ts/lib/Apply";

describe("Interrupt", () => {
  it("should interrupt with error", async () => {
    let exit: any = null;

    const program = T.async(() => cb => {
      setTimeout(() => {
        cb(new Error("test error"));
      }, 100);
    });

    const canceller = T.run(program, ex => {
      exit = ex;
    });

    canceller();

    await T.runToPromise(T.delay(T.unit, 110));

    assert.deepEqual(exit, interruptWithError(new Error("test error")));
  });

  it("should interrupt with error parallel", async () => {
    let exit: any = null;

    const program = sequenceT(T.parEffect)(
      T.async(() => cb => {
        setTimeout(() => {
          cb(new Error("test error"));
        }, 100);
      }),
      T.async(() => cb => {
        setTimeout(() => {
          cb(new Error("test error 2"));
        }, 100);
      })
    );

    const canceller = T.run(program, ex => {
      exit = ex;
    });

    canceller();

    await T.runToPromise(T.delay(T.unit, 250));

    assert.deepEqual(
      exit,
      interruptWithErrorAndOthers(new Error("test error"), [
        new Error("test error 2")
      ])
    );
  });
});
