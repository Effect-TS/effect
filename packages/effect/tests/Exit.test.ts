import * as assert from "assert";

import { fold, exit, isDone, isAbort, isRaise, isInterrupt } from "../src/exit";
import { done, abort, raise, interrupt } from "../src/original/exit";
import { identity } from "fp-ts/lib/function";

describe("Exit", () => {
  const e1 = done(1);
  const a2 = abort(2);
  const r3 = raise(3);
  const ipt = interrupt;

  describe("refinements", () => {
    it("isDone", () => {
      assert.equal(isDone(e1), true);
      assert.equal(isDone(a2), false);
      assert.equal(isDone(r3), false);
      assert.equal(isDone(ipt), false);
    });
    it("isAbort", () => {
      assert.equal(isAbort(e1), false);
      assert.equal(isAbort(a2), true);
      assert.equal(isAbort(r3), false);
      assert.equal(isAbort(ipt), false);
    });
    it("isRaise", () => {
      assert.equal(isRaise(e1), false);
      assert.equal(isRaise(a2), false);
      assert.equal(isRaise(r3), true);
      assert.equal(isRaise(ipt), false);
    });
    it("isInterrupt", () => {
      assert.equal(isInterrupt(e1), false);
      assert.equal(isInterrupt(a2), false);
      assert.equal(isInterrupt(r3), false);
      assert.equal(isInterrupt(ipt), true);
    });
  });
  describe("fold", () => {
    it("fold curried", () => {
      assert.deepEqual(fold(identity, identity, identity, () => "ipt")(e1), 1);
      assert.deepEqual(fold(identity, identity, identity, () => "ipt")(a2), 2);
      assert.deepEqual(fold(identity, identity, identity, () => "ipt")(r3), 3);
      assert.deepEqual(
        fold(identity, identity, identity, () => "ipt")(ipt),
        "ipt"
      );
    });
    it("fold", () => {
      const e1 = done(1);
      const a2 = abort(2);
      const r3 = raise(3);
      const ipt = interrupt;

      assert.deepEqual(
        exit.fold(e1, identity, identity, identity, () => "ipt"),
        1
      );
      assert.deepEqual(
        exit.fold(a2, identity, identity, identity, () => "ipt"),
        2
      );
      assert.deepEqual(
        exit.fold(r3, identity, identity, identity, () => "ipt"),
        3
      );
      assert.deepEqual(
        exit.fold(ipt, identity, identity, identity, () => "ipt"),
        "ipt"
      );
    });
  });
});
