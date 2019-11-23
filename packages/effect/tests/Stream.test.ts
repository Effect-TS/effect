import * as S from "../src/stream/stream";
import * as T from "../src";
import * as assert from "assert";

import { none, some } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { eqNumber } from "fp-ts/lib/Eq";

describe("Stream", () => {
  it("should use fromArray", async () => {
    const s = S.fromArray([0, 1, 2]);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0, 1, 2]);
  });

  it("should use fromRange", async () => {
    const s = S.fromRange(0);

    const res = await T.promise(S.collectArray(S.take(s, 3)));

    assert.deepEqual(res, [0, 1, 2]);
  });

  it("should use once", async () => {
    const s = S.once(0);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0]);
  });

  it("should use repeatedly", async () => {
    const s = S.repeatedly(0);

    const res = await T.promise(S.collectArray(S.take(s, 3)));

    assert.deepEqual(res, [0, 0, 0]);
  });

  it("should use periodically", async () => {
    const s = S.periodically(10);

    const res = await T.promise(S.collectArray(S.takeWhile(s, n => n < 10)));

    assert.deepEqual(res, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("should use empty", async () => {
    const s = S.empty;

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, []);
  });

  it("should use raised", async () => {
    const s = S.raised("message");

    const res = await T.run(S.collectArray(s))();

    assert.deepEqual(res, T.raise("message"));
  });

  it("should use aborted", async () => {
    const s = S.aborted("message");

    const res = await T.run(S.collectArray(s))();

    assert.deepEqual(res, T.abort("message"));
  });

  it("should use fromOption - none", async () => {
    const s = S.fromOption(none);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, []);
  });

  it("should use fromOption - some", async () => {
    const s = S.fromOption(some(1));

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [1]);
  });

  it("should use zipWithIndex", async () => {
    const s = S.zipWithIndex(S.fromArray([0, 1]));

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [
      [0, 0],
      [1, 1]
    ]);
  });

  it("should use mapWith", async () => {
    const s = pipe(
      S.fromArray([0, 1, 2]),
      S.mapWith(n => n + 1)
    );

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [1, 2, 3]);
  });

  it("should use as", async () => {
    const s = S.as(S.fromArray([0]), 1);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [1]);
  });

  it("should use filter", async () => {
    const s = S.filter(S.fromArray([0]), n => n > 0);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, []);
  });

  it("should use filter - 2", async () => {
    const s = S.filter(S.fromArray([1]), n => n > 0);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [1]);
  });

  it("should use distinctAdjacent", async () => {
    const s = pipe(
      S.fromArray([0, 0, 1, 2, 2, 3]),
      S.distinctAdjacent(eqNumber)
    );

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0, 1, 2, 3]);
  });

  it("should use filterWith", async () => {
    const s = pipe(
      S.fromArray([0]),
      S.filterWith(n => n > 0)
    );

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, []);
  });

  it("should use fold", async () => {
    const s = S.fold(S.fromArray([1, 1, 1]), (n, e) => n + e, 0);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [3]);
  });

  it("should use fold - 2", async () => {
    const s = S.fold(S.fromArray([]), (n, e) => n + e, 0);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0]);
  });

  it("should use scan", async () => {
    const s = S.scan(S.fromArray([1, 1, 1]), (n, e) => n + e, 0);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0, 1, 2, 3]);
  });

  it("should use concat", async () => {
    const s = S.concat(S.fromArray([0]), S.fromOption(some(1)));

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0, 1]);
  });

  it("should use fromIteratorUnsafe", async () => {
    function makeRangeIterator(start = 0, end = Infinity, step = 1) {
      let nextIndex = start;
      let iterationCount = 0;

      const rangeIterator = {
        next: function() {
          let result: any;
          if (nextIndex < end) {
            result = { value: nextIndex, done: false };
            nextIndex += step;
            iterationCount++;
            return result;
          }
          return { value: iterationCount, done: true };
        }
      };
      return rangeIterator;
    }

    const s = S.fromIteratorUnsafe(makeRangeIterator(1, 10, 2));

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [1, 3, 5, 7, 9]);
  });

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
