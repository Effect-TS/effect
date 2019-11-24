import * as _ from "../src";

import * as E from "fp-ts/lib/Either";
import * as assert from "assert";
import * as W from "waveguide/lib/wave";

import { toError } from "fp-ts/lib/Either";
import { none, some } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { identity } from "fp-ts/lib/function";
import { semigroupString } from "fp-ts/lib/Semigroup";

describe("Effect", () => {
  describe("Extra", () => {
    it("fromFuture", async () => {
      const a = await _.run(_.fromWave(W.wave.of(1)))();

      assert.deepEqual(a, _.done(1));
    });

    it("fromAsync", async () => {
      const a = await _.run(
        _.fromAsync(res => {
          setImmediate(() => {
            res(1);
          });

          return () => {};
        })
      )();

      assert.deepEqual(a, _.done(1));
    });

    it("raised", async () => {
      const a = await _.run(_.raised(_.raise(1)))();

      assert.deepEqual(a, _.raise(1));
    });

    it("completed", async () => {
      const a = await _.run(_.completed(_.done(1)))();

      assert.deepEqual(a, _.done(1));
    });

    it("raiseAbort", async () => {
      const a = await _.run(_.raiseAbort(1))();

      assert.deepEqual(a, _.abort(1));
    });

    it("result", async () => {
      const a = await _.run(_.result(_.right(1)))();

      assert.deepEqual(a, _.done(_.done(1)));
    });

    it("uninterruptible", async () => {
      const a = await _.run(_.uninterruptible(_.right(1)))();

      assert.deepEqual(a, _.done(1));
    });

    it("interruptible", async () => {
      const a = await _.run(_.interruptible(_.right(1)))();

      assert.deepEqual(a, _.done(1));
    });

    it("onInterrupted", async () => {
      let called = false;

      const a = await _.run(
        _.onInterrupted(
          _.raiseInterrupt,
          _.fromIO(() => {
            called = true;
          })
        )
      )();

      assert.deepEqual(a, _.interrupt);
      assert.deepEqual(called, true);
    });

    it("toTaskLike", async () => {
      const a = await _.run(_.toTaskLike(_.right(1)))();
      const b = await _.run(_.toTaskLike(_.left(1)))();

      assert.deepEqual(a, _.done(E.right(1)));
      assert.deepEqual(b, _.done(E.left(1)));
    });

    it("liftPromise", async () => {
      const a = await _.run(_.tryPromise(identity)(() => Promise.reject(1)))();

      assert.deepEqual(a, _.raise(1));
    });

    it("tryCatchIO", async () => {
      const a = await _.run(
        _.tryIO(toError)(() => {
          throw 100;
        })
      )();

      assert.deepEqual(a, _.raise(_.error("100")));
    });

    it("chainLeft", async () => {
      const a = await _.run(
        pipe(
          _.tryIO(toError)(() => {
            throw 100;
          }),
          _.chainLeft(e => _.right(1))
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
      const a = await _.run(_.or(_.right(1))(_.right(2))(true))();
      const b = await _.run(_.or(_.right(1))(_.right(2))(false))();

      assert.deepEqual(a, _.done(E.left(1)));
      assert.deepEqual(b, _.done(E.right(2)));
    });

    it("or_", async () => {
      const a = await _.run(_.or_(true)(_.right(1))(_.right(2)))();
      const b = await _.run(_.or_(false)(_.right(1))(_.right(2)))();

      assert.deepEqual(a, _.done(E.left(1)));
      assert.deepEqual(b, _.done(E.right(2)));
    });

    it("alt", async () => {
      const a = await _.run(_.alt(_.right(1))(_.right(2))(true))();
      const b = await _.run(_.alt(_.right(1))(_.right(2))(false))();

      assert.deepEqual(a, _.done(1));
      assert.deepEqual(b, _.done(2));
    });

    it("alt_", async () => {
      const a = await _.run(_.alt_(true)(_.right(1))(_.right(2)))();
      const b = await _.run(_.alt_(false)(_.right(1))(_.right(2)))();

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

    it("foldExitWith", async () => {
      const a = await _.promise(
        pipe(
          _.right(1),
          _.foldExitWith(
            () => null,
            n => _.right(n + 1)
          )
        )
      );

      assert.deepEqual(a, 2);
    });

    it("foldExitWith - error", async () => {
      const a = await _.promise(
        pipe(
          _.left(1),
          _.foldExitWith(
            () => _.right(1),
            n => _.right(n + 1)
          )
        )
      );

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
      const res = await _.run(_.sequenceP(1)([_.right(1), _.right(2)]))();

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
      _.tryPromise(() => "error")(() => Promise.resolve(1))
    )();

    assert.deepStrictEqual(e1, _.done(1));
    const e2 = await _.run(
      _.tryPromise(() => "error")(() => Promise.reject(undefined))
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
      _.fromIO(() => {
        log.push("release success");
      });
    const releaseFailure = () => _.left("release failure");

    beforeEach(() => {
      log = [];
    });

    it("should return the acquire error if acquire fails", async () => {
      const e = await _.run(
        _.bracket(acquireFailure, releaseSuccess, useSuccess)
      )();

      assert.deepStrictEqual(e, _.raise("acquire failure"));
    });

    it("body and release must not be called if acquire fails", async () => {
      await _.run(_.bracket(acquireFailure, releaseSuccess, useSuccess))();
      assert.deepStrictEqual(log, []);
    });

    it("should return the use error if use fails and release does not", async () => {
      const e = await _.run(
        _.bracket(acquireSuccess, releaseSuccess, useFailure)
      )();
      assert.deepStrictEqual(e, _.raise("use failure"));
    });

    it("should return the use error if both use and release fail", async () => {
      const e = await _.run(
        _.bracket(acquireSuccess, releaseFailure, useFailure)
      )();
      assert.deepStrictEqual(e, _.raise("use failure"));
    });

    it("release must be called if the body returns", async () => {
      await _.run(_.bracket(acquireSuccess, releaseSuccess, useSuccess))();
      assert.deepStrictEqual(log, ["release success"]);
    });

    it("release must be called if the body throws", async () => {
      await _.run(_.bracket(acquireSuccess, releaseSuccess, useFailure))();
      assert.deepStrictEqual(log, ["release success"]);
    });

    it("should return the release error if release fails", async () => {
      const e = await _.run(
        _.bracket(acquireSuccess, releaseFailure, useSuccess)
      )();
      assert.deepStrictEqual(e, _.raise("release failure"));
    });
  });

  describe("bracketExit", () => {
    let log: Array<string> = [];

    const acquireFailure = _.left("acquire failure");
    const acquireSuccess = _.right({ res: "acquire success" });
    const useSuccess = () => _.right("use success");
    const useFailure = () => _.left("use failure");
    const releaseSuccess = () =>
      _.fromIO(() => {
        log.push("release success");
      });
    const releaseFailure = () => _.left("release failure");

    beforeEach(() => {
      log = [];
    });

    it("should return the acquire error if acquire fails", async () => {
      const e = await _.run(
        _.bracketExit(acquireFailure, releaseSuccess, useSuccess)
      )();

      assert.deepStrictEqual(e, _.raise("acquire failure"));
    });

    it("body and release must not be called if acquire fails", async () => {
      await _.run(_.bracketExit(acquireFailure, releaseSuccess, useSuccess))();
      assert.deepStrictEqual(log, []);
    });

    it("should return the use error if use fails and release does not", async () => {
      const e = await _.run(
        _.bracketExit(acquireSuccess, releaseSuccess, useFailure)
      )();
      assert.deepStrictEqual(e, _.raise("use failure"));
    });

    it("should return the use error if both use and release fail", async () => {
      const e = await _.run(
        _.bracketExit(acquireSuccess, releaseFailure, useFailure)
      )();
      assert.deepStrictEqual(e, _.raise("use failure"));
    });

    it("release must be called if the body returns", async () => {
      await _.run(_.bracketExit(acquireSuccess, releaseSuccess, useSuccess))();
      assert.deepStrictEqual(log, ["release success"]);
    });

    it("release must be called if the body throws", async () => {
      await _.run(_.bracketExit(acquireSuccess, releaseSuccess, useFailure))();
      assert.deepStrictEqual(log, ["release success"]);
    });

    it("should return the release error if release fails", async () => {
      const e = await _.run(
        _.bracketExit(acquireSuccess, releaseFailure, useSuccess)
      )();
      assert.deepStrictEqual(e, _.raise("release failure"));
    });
  });

  it("getCauseValidationM", async () => {
    const M = _.getValidationM(semigroupString);

    const f = (s: string) => _.right(s.length);

    assert.deepStrictEqual(
      await _.run(M.chain(_.right("abc"), f))(),
      await _.run(_.right(3))()
    );
    assert.deepStrictEqual(
      await _.run(M.chain(_.left("a"), f))(),
      await _.run(_.left("a"))()
    );
    assert.deepStrictEqual(
      await _.run(M.chain(_.left("a"), () => _.left("b")))(),
      await _.run(_.left("a"))()
    );
    assert.deepStrictEqual(await _.run(M.of(1))(), await _.run(_.right(1))());

    const double = (n: number) => n * 2;

    assert.deepStrictEqual(
      await _.run(M.ap(_.right(double), _.right(1)))(),
      await _.run(_.right(2))()
    );
    assert.deepStrictEqual(
      await _.run(M.ap(_.right(double), _.left("foo")))(),
      await _.run(_.left("foo"))()
    );
    assert.deepStrictEqual(
      await _.run(
        M.ap(_.left<string, (n: number) => number>("foo"), _.right(1))
      )(),
      await _.run(_.left("foo"))()
    );
    assert.deepStrictEqual(
      await _.run(M.ap(_.left("foo"), _.left("bar")))(),
      await _.run(_.left("foobar"))()
    );
    assert.deepStrictEqual(
      await _.run(M.alt(_.left("a"), () => _.right(1)))(),
      await _.run(_.right(1))()
    );
    assert.deepStrictEqual(
      await _.run(M.alt(_.right(1), () => _.left("a")))(),
      await _.run(_.right(1))()
    );
    assert.deepStrictEqual(
      await _.run(M.alt(_.left("a"), () => _.left("b")))(),
      await _.run(_.left("ab"))()
    );
  });
});
