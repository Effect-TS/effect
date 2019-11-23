import * as S from "../src/stream/stream";
import * as T from "../src";
import * as assert from "assert";

describe("Stream", () => {
  it("should zip two streams", async () => {
    type EnvA = { a: number };
    type EnvB = { b: number };

    const streamA = S.repeat(S.encaseEffect(T.access(({ a }: EnvA) => a)));
    const streamB = S.repeat(S.encaseEffect(T.access(({ b }: EnvB) => b)));

    // $ExpectType Managed<EnvA & EnvB, never, Fold<EnvA & EnvB, never, readonly [number, number]>>
    const zip = S.zip(streamA, streamB);

    const res = await T.promise(
      T.provide<EnvA & EnvB>({ a: 1, b: 1 })(
        // $ExpectType Effect<EnvA & EnvB, never, (readonly [number, number])[]>
        S.collectArray(S.take(zip, 3))
      )
    );

    assert.deepEqual(res, [
      [1, 1],
      [1, 1],
      [1, 1]
    ]);
  });

  it("should use stream with environment", async () => {
    type Config = { initial: number };
    type ConfigB = { second: number };

    const a = S.encaseEffect(T.access(({ initial }: Config) => initial)); // $ExpectType Managed<Config, never, Fold<Config, never, number>>
    const s = S.chain(a, n => S.fromRange(n, 1, 10)); // $ExpectType Managed<Config, never, Fold<Config, never, number>>

    // $ExpectType Managed<Config & ConfigB, never, Fold<Config & ConfigB, never, number>>
    const m = S.chain(s, n =>
      S.encaseEffect(T.access(({ second }: ConfigB) => n + second))
    );

    const g = S.chain(m, n => S.fromRange(0, 1, n)); // $ExpectType Managed<Config & ConfigB, never, Fold<Config & ConfigB, never, number>>
    const r = S.collectArray(g); // $ExpectType Effect<Config & ConfigB, never, number[]>

    const res = await T.promise(
      T.provide<Config & ConfigB>({ initial: 1, second: 1 })(r)
    );

    assert.deepEqual(
      res,
      // prettier-ignore
      [ 0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2
      , 3, 4, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3
      , 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 7, 0
      , 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3
      , 4, 5, 6, 7, 8, 9]
    );
  });
});
