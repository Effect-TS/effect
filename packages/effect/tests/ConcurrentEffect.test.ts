import * as _ from "../src";
import * as E from "fp-ts/lib/Either";
import * as assert from "assert";

describe("ConcurrentEffect", () => {
  describe("Monad", () => {
    it("of", async () => {
      const x = await _.run(_.seq(_.concurrentEffectMonad.of(1)))();
      assert.deepStrictEqual(x, E.right(1));
    });

    it("throwError", async () => {
      const x = await _.run(
        _.seq(_.concurrentEffectMonad.throwError(_.error("error")))
      )();
      assert.deepStrictEqual(x, E.left(new Error("error")));
    });

    it("map", async () => {
      const double = (n: number): number => n * 2;
      const x = await _.run(
        _.seq(_.concurrentEffectMonad.map(_.par(_.right(1)), double))
      )();
      assert.deepStrictEqual(x, E.right(2));
    });

    it("ap", async () => {
      const double = (n: number): number => n * 2;
      const mab = _.par(_.right(double));
      const ma = _.par(_.right(1));
      const x = await _.run(_.seq(_.concurrentEffectMonad.ap(mab, ma)))();
      assert.deepStrictEqual(x, E.right(2));
    });

    it("chain", async () => {
      const e1 = await _.run(
        _.seq(
          _.concurrentEffectMonad.chain(_.par(_.right("foo")), a =>
            a.length > 2 ? _.par(_.right(a.length)) : _.par(_.left("foo"))
          )
        )
      )();
      assert.deepStrictEqual(e1, E.right(3));
      const e2 = await _.run(
        _.seq(
          _.concurrentEffectMonad.chain(_.par(_.right("a")), a =>
            _.par(a.length > 2 ? _.right(a.length) : _.left("foo"))
          )
        )
      )();
      assert.deepStrictEqual(e2, E.left("foo"));
    });
  });

  describe("Bifunctor", () => {
    it("bimap", async () => {
      const f = (s: string): number => s.length;
      const g = (n: number): boolean => n > 2;

      const e1 = await _.run(
        _.seq(_.concurrentEffectMonad.bimap(_.par(_.right(1)), f, g))
      )();
      assert.deepStrictEqual(e1, E.right(false));
      const e2 = await _.run(
        _.seq(_.concurrentEffectMonad.bimap(_.par(_.left("foo")), f, g))
      )();
      assert.deepStrictEqual(e2, E.left(3));
    });

    it("mapLeft", async () => {
      const double = (n: number): number => n * 2;
      const e = await _.run(
        _.seq(_.concurrentEffectMonad.mapLeft(_.par(_.left(1)), double))
      )();
      assert.deepStrictEqual(e, E.left(2));
    });
  });
});
