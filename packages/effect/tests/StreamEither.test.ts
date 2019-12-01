import * as assert from "assert";
import { expect } from "chai";
import { FunctionN, identity } from "fp-ts/lib/function";
import { pipe } from "fp-ts/lib/pipeable";
import * as ex from "../src/original/exit";
import { effect as T, streameither as S } from "../src";

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
});
