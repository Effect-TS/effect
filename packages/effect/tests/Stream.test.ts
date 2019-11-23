import * as S from "../src/stream/stream";
import * as T from "../src";
import * as assert from "assert";

describe("Stream", () => {
  it("should use stream with environment", async () => {
    type Config = { initial: number };

    const a = S.encaseEffect(T.access(({ initial }: Config) => initial));
    const s = S.chain(a, n => S.fromRange(n, 1, 10));
    const m = S.map(s, n => n + 1);
    const g = S.chain(m, n => S.fromRange(0, 1, n));
    const r = S.collectArray(g);

    const res = await T.promise(
      T.provide<Config>({ initial: 1 })(r)
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
