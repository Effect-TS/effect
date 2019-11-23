import * as S from "../src/stream/stream";
import * as T from "../src";
import * as assert from "assert";

describe("Stream", () => {
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
