import { effect as T } from "../src";
import * as assert from "assert";
import { right, left } from "fp-ts/lib/Either";
import { done } from "../src/original/exit";
import { pipe } from "fp-ts/lib/pipeable";

describe("Sync", () => {
  it("should exec sync", () => {
    const program = T.sync(() => 10);
    const res = T.runSync(program);

    assert.deepEqual(res, right(done(10)));
  });

  it("should chain exec sync", () => {
    const program = pipe(
      T.sync(() => 10),
      T.chain((n) => T.sync(() => n + 1))
    );
    const res = T.runSync(program);

    assert.deepEqual(res, right(done(11)));
  });

  it("should chain access exec sync", () => {
    const program = pipe(
      T.access((_: { n: number }) => _.n),
      T.chain((n) => T.sync(() => n + 1))
    );

    const provide = T.provideSW<{ n: number }>()(T.pure(10))((n) => ({ n }));

    const res = T.runSync(pipe(program, provide));

    assert.deepEqual(res, right(done(11)));
  });

  it("should fail exec sync", () => {
    const program = pipe(
      T.sync(() => 10),
      T.chain((n) => T.sync(() => n + 1)),
      (x) => T.delay(x, 100)
    );
    const res = T.runSync(program);

    assert.deepEqual(res, left(new Error("async operations running")));
  });
});
