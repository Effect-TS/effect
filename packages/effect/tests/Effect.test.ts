import * as _ from "../src";

import * as E from "fp-ts/lib/Either";
import * as assert from "assert";
import * as W from "waveguide/lib/wave";

import { toError } from "fp-ts/lib/Either";
import { none, some } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { identity } from "fp-ts/lib/function";
import { ExitTag } from "waveguide/lib/exit";

describe("Effect", () => {
  describe("Extra", () => {
    it("fromFuture", async () => {
      const a = await _.run(_.fromFuture(W.wave.of(1)))();

      assert.deepEqual(a, _.done(1));
    });

    it("liftPromise", async () => {
      const a = await _.run(_.tryCatch(() => Promise.reject(1), identity))();

      assert.deepEqual(a, _.raise(1));
    });

    it("tryCatchIO", async () => {
      const a = await _.run(
        _.tryCatchIO(() => {
          throw 100;
        }, toError)
      )();

      assert.deepEqual(a, _.raise(_.error("100")));
    });

    it("chainLeft", async () => {
      const a = await _.run(
        pipe(
          _.tryCatchIO(() => {
            throw 100;
          }, toError),
          x => _.chainLeft(x, e => _.right(1))
        )
      )();

      assert.deepEqual(a, _.done(1));
    });

    it("when", async () => {
      const a = await _.run(_.when(true)(_.right(1)))();
      const b = await _.run(_.when(false)(_.right(1)))();

      assert.deepEqual(a, _.done(some(1)));
      assert.deepEqual(b, _.done(none));
    });

    it("or", async () => {
      const a = await _.run(_.or(true)(_.right(1))(_.right(2)))();
      const b = await _.run(_.or(false)(_.right(1))(_.right(2)))();

      assert.deepEqual(a, _.done(E.left(1)));
      assert.deepEqual(b, _.done(E.right(2)));
    });

    it("alt", async () => {
      const a = await _.run(_.alt(true)(_.right(1))(_.right(2)))();
      const b = await _.run(_.alt(false)(_.right(1))(_.right(2)))();

      assert.deepEqual(a, _.done(1));
      assert.deepEqual(b, _.done(2));
    });

    it("provide & access env", async () => {
      const env = {
        value: "ok"
      };

      const module = pipe(_.noEnv, _.mergeEnv(env));

      const a = await _.run(
        _.provide(module)(_.accessM(({ value }: typeof env) => _.right(value)))
      )();

      const b = await _.run(
        _.provide(module)(_.access(({ value }: typeof env) => value))
      )();

      assert.deepEqual(a, _.done("ok"));
      assert.deepEqual(b, _.done("ok"));
    });

    it("promise", async () => {
      const a = await _.promise(_.right(1));

      assert.deepEqual(a, 1);
    });

    it("fromNullableM", async () => {
      const a = await _.run(_.fromNullableM(_.right(null)))();
      const b = await _.run(_.fromNullableM(_.right(1)))();

      assert.deepEqual(a, _.done(none));
      assert.deepEqual(b, _.done(some(1)));
    });

    it("fromNullableM", async () => {
      const a = await _.run(
        _.fromTaskLike(_.right(E.left(_.error("error"))))
      )();
      const b = await _.run(_.fromTaskLike(_.right(E.right("ok"))))();

      assert.deepEqual(a, _.raise(_.error("error")));
      assert.deepEqual(b, _.done("ok"));
    });
  });

  describe("Concurrent", () => {
    it("ap", async () => {
      const double = (n: number): number => n * 2;
      const mab = _.right(double);
      const ma = _.right(1);
      const x = await _.run(_.concurrentEffectMonad.ap(mab, ma))();
      assert.deepStrictEqual(x, _.done(2));
    });

    it("sequenceP", async () => {
      const res = await _.run(_.sequenceP(1, [_.right(1), _.right(2)]))();

      assert.deepEqual(res, _.done([1, 2]));
    });
  });

  describe("Monad", () => {
    it("map", async () => {
      const double = (n: number): number => n * 2;
      const x = await _.run(_.effectMonad.map(_.right(1), double))();
      assert.deepStrictEqual(x, _.done(2));
    });

    it("ap", async () => {
      const double = (n: number): number => n * 2;
      const mab = _.right(double);
      const ma = _.right(1);
      const x = await _.run(_.effectMonad.ap(mab, ma))();
      assert.deepStrictEqual(x, _.done(2));
    });

    it("chain", async () => {
      const e1 = await _.run(
        _.effectMonad.chain(_.right("foo"), a =>
          a.length > 2 ? _.right(a.length) : _.left("foo")
        )
      )();
      assert.deepStrictEqual(e1, _.done(3));
      const e2 = await _.run(
        _.effectMonad.chain(_.right("a"), a =>
          a.length > 2 ? _.right(a.length) : _.left("foo")
        )
      )();
      assert.deepStrictEqual(e2, _.raise("foo"));
    });
  });

  describe("Bifunctor", () => {
    it("bimap", async () => {
      const f = (s: string): number => s.length;
      const g = (n: number): boolean => n > 2;

      const e1 = await _.run(_.effectMonad.bimap(_.right(1), f, g))();
      assert.deepStrictEqual(e1, _.done(false));
      const e2 = await _.run(_.effectMonad.bimap(_.left("foo"), f, g))();
      assert.deepStrictEqual(e2, _.raise(3));
    });

    it("mapLeft", async () => {
      const e = await _.run(_.effectMonad.mapLeft(_.left("1"), _.error))();
      assert.deepStrictEqual(e, _.raise(new Error("1")));
    });
  });

  it("tryCatch", async () => {
    const e1 = await _.run(
      _.tryCatch(
        () => Promise.resolve(1),
        () => "error"
      )
    )();

    assert.deepStrictEqual(e1, _.done(1));
    const e2 = await _.run(
      _.tryCatch(
        () => Promise.reject(undefined),
        () => "error"
      )
    )();
    assert.deepStrictEqual(e2, _.raise("error"));
  });

  it("fromPredicate", async () => {
    const gt2 = _.fromPredicate(
      (n: number) => n >= 2,
      n => `Invalid number ${n}`
    );
    const e1 = await _.run(gt2(3))();
    assert.deepStrictEqual(e1, _.done(3));
    const e2 = await _.run(gt2(1))();
    assert.deepStrictEqual(e2, _.raise("Invalid number 1"));

    // refinements
    const isNumber = (u: string | number): u is number => typeof u === "number";
    const e3 = await _.run(
      _.fromPredicate(isNumber, () => "not a number")(4)
    )();
    assert.deepStrictEqual(e3, _.done(4));
  });

  describe("bracket", () => {
    let log: Array<string> = [];

    const acquireFailure = _.left("acquire failure");
    const acquireSuccess = _.right({ res: "acquire success" });
    const useSuccess = () => _.right("use success");
    const useFailure = () => _.left("use failure");
    const releaseSuccess = () =>
      _.syncTotal(() => {
        log.push("release success");
      });
    const releaseFailure = () => _.left("release failure");

    beforeEach(() => {
      log = [];
    });

    it("should return the acquire error if acquire fails", async () => {
      const e = await _.run(
        _.bracket(acquireFailure, useSuccess, releaseSuccess)
      )();

      assert.deepStrictEqual(e, _.raise("acquire failure"));
    });

    it("body and release must not be called if acquire fails", async () => {
      await _.run(_.bracket(acquireFailure, useSuccess, releaseSuccess))();
      assert.deepStrictEqual(log, []);
    });

    it("should return the use error if use fails and release does not", async () => {
      const e = await _.run(
        _.bracket(acquireSuccess, useFailure, releaseSuccess)
      )();
      assert.deepStrictEqual(e, _.raise("use failure"));
    });

    it("should return the release error if both use and release fail", async () => {
      const e = await _.run(
        _.bracket(acquireSuccess, useFailure, releaseFailure)
      )();
      assert.deepStrictEqual(e, _.raise("release failure"));
    });

    it("release must be called if the body returns", async () => {
      await _.run(_.bracket(acquireSuccess, useSuccess, releaseSuccess))();
      assert.deepStrictEqual(log, ["release success"]);
    });

    it("release must be called if the body throws", async () => {
      await _.run(_.bracket(acquireSuccess, useFailure, releaseSuccess))();
      assert.deepStrictEqual(log, ["release success"]);
    });

    it("should return the release error if release fails", async () => {
      const e = await _.run(
        _.bracket(acquireSuccess, useSuccess, releaseFailure)
      )();
      assert.deepStrictEqual(e, _.raise("release failure"));
    });
  });
});
