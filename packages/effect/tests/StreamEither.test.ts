import * as assert from "assert";
import { expect } from "chai";
import { FunctionN, identity } from "fp-ts/lib/function";
import { pipe } from "fp-ts/lib/pipeable";
import * as ex from "../src/original/exit";
import { effect as T, streameither as S } from "../src";
import { none, some } from "fp-ts/lib/Option";

export async function expectExitIn<E, A, B>(
  ioa: T.Effect<T.NoEnv, E, A>,
  f: FunctionN<[ex.Exit<E, A>], B>,
  expected: B
): Promise<void> {
  const result = await T.runToPromiseExit(ioa);
  expect(assert.deepEqual(f(result), expected));
}

export function expectExit<E, A>(
  ioa: T.Effect<T.NoEnv, E, A>,
  expected: ex.Exit<E, A>
): Promise<void> {
  return expectExitIn(ioa, identity, expected);
}

describe("StreamEither", () => {
  it("use chainError", async () => {
    const stream = pipe(
      S.encaseEffect(T.raiseError<string, number>("error")),
      S.chainError(_ => S.encaseEffect(T.pure(100)))
    );

    const program = S.collectArray(stream);

    const res = await T.runToPromise(program);

    assert.deepEqual(res, [100]);
  });

  it("should use fromArray", async () => {
    const s = S.fromArray([0, 1, 2]);

    const res = await T.runToPromise(S.collectArray(s));

    assert.deepEqual(res, [0, 1, 2]);
  });

  it("should use fromRange", async () => {
    const s = S.fromRange(0);

    const res = await T.runToPromise(S.collectArray(S.take(s, 3)));

    assert.deepEqual(res, [0, 1, 2]);
  });

  it("should use filterRefineWith", async () => {
    const s = S.fromRange(0);

    type Even = number & { _brand: "even" };

    function isEven(x: number): x is Even {
      return x % 2 === 0;
    }

    // $ExpectType Even[]
    const res = await T.runToPromise(
      S.collectArray(S.take(pipe(s, S.filterRefineWith(isEven)), 3))
    );

    assert.deepEqual(res, [0, 2, 4]);
  });

  it("should use once", async () => {
    const s = S.once(0);

    const res = await T.runToPromise(S.collectArray(s));

    assert.deepEqual(res, [0]);
  });

  it("should use repeatedly", async () => {
    const s = S.repeatedly(0);

    const res = await T.runToPromise(S.collectArray(S.take(s, 3)));

    assert.deepEqual(res, [0, 0, 0]);
  });

  it("should use periodically", async () => {
    const s = S.periodically(10);

    const res = await T.runToPromise(
      S.collectArray(S.takeWhile(s, n => n < 10))
    );

    assert.deepEqual(res, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("should use empty", async () => {
    const s = S.empty;

    const res = await T.runToPromise(S.collectArray(s));

    assert.deepEqual(res, []);
  });

  it("should use raised", async () => {
    const s = S.raised("message");

    const res = await T.runToPromiseExit(S.collectArray(s));

    assert.deepEqual(res, ex.raise("message"));
  });

  it("should use aborted", async () => {
    const s = S.aborted("message");

    const res = await T.runToPromiseExit(S.collectArray(s));

    assert.deepEqual(res, ex.abort("message"));
  });

  it("should use fromOption - none", async () => {
    const s = S.fromOption(none);

    const res = await T.runToPromise(S.collectArray(s));

    assert.deepEqual(res, []);
  });

  it("should use fromOption - some", async () => {
    const s = S.fromOption(some(1));

    const res = await T.runToPromise(S.collectArray(s));

    assert.deepEqual(res, [1]);
  });

  it("should use zipWithIndex", async () => {
    const s = S.zipWithIndex(S.fromArray([0, 1]));

    const res = await T.runToPromise(S.collectArray(s));

    assert.deepEqual(res, [
      [0, 0],
      [1, 1]
    ]);
  });

  it("should use map", async () => {
    const s = pipe(
      S.fromArray([0, 1, 2]),
      S.map(n => n + 1)
    );

    const res = await T.runToPromise(S.collectArray(s));

    assert.deepEqual(res, [1, 2, 3]);
  });

  it("should use as", async () => {
    const s = S.as(S.fromArray([0]), 1);

    const res = await T.runToPromise(S.collectArray(s));

    assert.deepEqual(res, [1]);
  });
});
