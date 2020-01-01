import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as assert from "assert";

import { toError } from "fp-ts/lib/Either";
import { none, some } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { semigroupString } from "fp-ts/lib/Semigroup";
import { Do } from "fp-ts-contrib/lib/Do";
import { array, range } from "fp-ts/lib/Array";

import * as ex from "../src/original/exit";

import { monoidSum } from "fp-ts/lib/Monoid";
import { identity } from "fp-ts/lib/function";
import { effect, parEffect } from "../src/effect";

import { effect as T, fluent as F } from "../src";

describe("EffectSafe", () => {
  describe("Fluent", () => {
    it("use fluent", async () => {
      const program = F.fluent(T.pure(1))
        .chain(n => T.access((r: { n: number }) => n + r.n))
        .chain(n => T.access((r: { k: number }) => n + r.k))
        .chain(n => T.access((r: { m: number }) => n + r.m))
        .tap(() => T.unit)
        .tap(n => T.raiseError(n))
        .chainError(n => T.pure(n))
        .provideS({ k: 2 })
        .provide({ n: 3, m: 1 })
        .foldExit(_ => T.raiseAbort(10), T.pure)
        .done();

      assert.deepEqual(await T.runToPromiseExit(program), ex.done(7));
    });
  });
  describe("Extra", () => {
    it("encaseEither", async () => {
      assert.deepEqual(
        await T.runToPromiseExit(T.encaseEither(E.right(1))),
        ex.done(1)
      );
      assert.deepEqual(
        await T.runToPromiseExit(T.encaseEither(E.left(1))),
        ex.raise(1)
      );
    });

    it("trySync", async () => {
      assert.deepEqual(
        await T.runToPromiseExit(T.trySync(() => 1)),
        ex.done(1)
      );
      assert.deepEqual(
        await T.runToPromiseExit(
          T.trySync(() => {
            throw 10;
          })
        ),
        ex.raise(10)
      );
    });

    it("abort on throw", async () => {
      assert.deepEqual(
        await T.runToPromiseExit(
          T.sync(() => {
            throw new Error("error");
          })
        ),
        ex.abort(new Error("error"))
      );
    });

    it("encaseOption", async () => {
      assert.deepEqual(
        await T.runToPromiseExit(T.encaseOption(O.some(1), () => "error")),
        ex.done(1)
      );
      assert.deepEqual(
        await T.runToPromiseExit(T.encaseOption(O.none, () => "error")),
        ex.raise("error")
      );
    });

    it("lift", async () => {
      assert.deepEqual(
        await T.runToPromiseExit(T.lift((n: number) => n + 1)(T.pure(1))),
        ex.done(2)
      );
    });

    it("fork", async () => {
      assert.deepEqual(
        await T.runToPromiseExit(
          Do(T.effect)
            .bind("f", T.fork(T.delay(T.pure(10), 100)))
            .bindL("r", ({ f }) => f.join)
            .return(s => s.r)
        ),
        ex.done(10)
      );
    });

    it("fork exit", async () => {
      assert.deepEqual(
        await T.runToPromiseExit(
          Do(T.effect)
            .bind("f", T.fork(T.delay(T.pure(10), 100)))
            .bindL("r", ({ f }) => f.result)
            .return(s => s.r)
        ),
        ex.done(O.none)
      );
    });

    it("fork exit interrupt", async () => {
      assert.deepEqual(
        await T.runToPromiseExit(
          Do(T.effect)
            .bind("f", T.fork(T.delay(T.pure(10), 100)))
            .bindL("r", ({ f }) => f.interrupt)
            .return(s => s.r)
        ),
        ex.done(undefined)
      );
    });

    it("provideR", async () => {
      const http_symbol: unique symbol = Symbol();

      interface HttpEnv {
        [http_symbol]: number;
      }

      assert.deepEqual(
        await T.runToPromiseExit(
          T.provideR(() => ({ [http_symbol]: 10 }))(
            T.access(({ [http_symbol]: n }: HttpEnv) => n)
          )
        ),
        ex.done(10)
      );
    });

    it("provideS", async () => {
      const http_symbol: unique symbol = Symbol();

      interface HttpEnv {
        [http_symbol]: number;
      }

      assert.deepEqual(
        await T.runToPromiseExit(
          T.provideS({ [http_symbol]: 10 })(
            T.access(({ [http_symbol]: n }: HttpEnv) => n)
          )
        ),
        ex.done(10)
      );
    });

    it("provideSM", async () => {
      const http_symbol: unique symbol = Symbol();

      interface HttpEnv {
        [http_symbol]: number;
      }

      assert.deepEqual(
        await T.runToPromiseExit(
          T.provideSM(T.pure({ [http_symbol]: 10 }))(
            T.access(({ [http_symbol]: n }: HttpEnv) => n)
          )
        ),
        ex.done(10)
      );
    });

    it("provideR can be optional", async () => {
      const http_symbol: unique symbol = Symbol();

      interface HttpEnv {
        [http_symbol]?: number;
      }

      assert.deepEqual(
        await T.runToPromiseExit(
          T.provideR(() => ({ [http_symbol]: 10 }))(
            T.access(({ [http_symbol]: n }: HttpEnv) => n)
          )
        ),
        ex.done(10)
      );
      assert.deepEqual(
        await T.runToPromiseExit(
          T.access(({ [http_symbol]: n }: HttpEnv) => n)
        ),
        ex.done(undefined)
      );
    });

    it("stack safe effect", async () => {
      const incrementEnv = Symbol();
      interface ConfigEnv {
        [incrementEnv]: number;
      }
      const config: ConfigEnv = {
        [incrementEnv]: 2
      };

      const program = array.traverse(T.effect)(range(1, 50000), (n: number) =>
        T.accessM(({ [incrementEnv]: increment }: ConfigEnv) =>
          T.sync(() => n + increment)
        )
      );

      const result = (
        await T.runToPromise(T.provideAll(config)(program))
      ).reduce(monoidSum.concat);

      assert.deepEqual(result, 1250125000);
    });

    it("async", async () => {
      const a = await T.runToPromiseExit(
        T.asyncTotal(res => {
          setImmediate(() => {
            res(1);
          });

          // tslint:disable-next-line: no-empty
          return () => {};
        })
      );

      assert.deepEqual(a, ex.done(1));
    });

    it("raised", async () => {
      const a = await T.runToPromiseExit(T.raised(ex.raise(1)));

      assert.deepEqual(a, ex.raise(1));
    });

    it("completed", async () => {
      const a = await T.runToPromiseExit(T.completed(ex.done(1)));

      assert.deepEqual(a, ex.done(1));
    });

    it("raiseAbort", async () => {
      const a = await T.runToPromiseExit(T.raiseAbort(1));

      assert.deepEqual(a, ex.abort(1));
    });

    it("result", async () => {
      const a = await T.runToPromiseExit(T.result(T.pure(1)));

      assert.deepEqual(a, ex.done(ex.done(1)));
    });

    it("uninterruptible", async () => {
      const a = await T.runToPromiseExit(T.uninterruptible(T.pure(1)));

      assert.deepEqual(a, ex.done(1));
    });

    it("interruptible", async () => {
      const a = await T.runToPromiseExit(T.interruptible(T.pure(1)));

      assert.deepEqual(a, ex.done(1));
    });

    it("onInterrupted", async () => {
      let called = false;

      const a = await T.runToPromiseExit(
        T.onInterrupted(
          T.raiseInterrupt,
          T.sync(() => {
            called = true;
          })
        )
      );

      assert.deepEqual(a, ex.interrupt);
      assert.deepEqual(called, true);
    });

    it("fromPromise", async () => {
      const a = await T.runToPromiseExit(
        T.fromPromise(() => Promise.reject(1))
      );

      assert.deepEqual(a, ex.raise(1));
    });

    it("tryCatchIO", async () => {
      const a = await T.runToPromiseExit(
        T.trySyncMap(toError)(() => {
          throw 100;
        })
      );

      assert.deepEqual(a, ex.raise(new Error("100")));
    });

    it("chainLeft", async () => {
      const a = await T.runToPromiseExit(
        pipe(
          T.trySyncMap(toError)(() => {
            throw 100;
          }),
          T.chainError(_ => T.pure(1))
        )
      );

      assert.deepEqual(a, ex.done(1));
    });

    it("when", async () => {
      const a = await T.runToPromiseExit(T.when(true)(T.pure(1)));
      const b = await T.runToPromiseExit(T.when(false)(T.pure(1)));

      assert.deepEqual(a, ex.done(some(1)));
      assert.deepEqual(b, ex.done(none));
    });

    it("or", async () => {
      const a = await T.runToPromiseExit(T.or(T.pure(1))(T.pure(2))(true));
      const b = await T.runToPromiseExit(T.or(T.pure(1))(T.pure(2))(false));

      assert.deepEqual(a, ex.done(E.left(1)));
      assert.deepEqual(b, ex.done(E.right(2)));
    });

    it("or_", async () => {
      const a = await T.runToPromiseExit(T.or_(true)(T.pure(1))(T.pure(2)));
      const b = await T.runToPromiseExit(T.or_(false)(T.pure(1))(T.pure(2)));

      assert.deepEqual(a, ex.done(E.left(1)));
      assert.deepEqual(b, ex.done(E.right(2)));
    });

    it("cond", async () => {
      const a = await T.runToPromiseExit(T.cond(T.pure(1))(T.pure(2))(true));
      const b = await T.runToPromiseExit(T.cond(T.pure(1))(T.pure(2))(false));

      assert.deepEqual(a, ex.done(1));
      assert.deepEqual(b, ex.done(2));
    });

    it("condWith", async () => {
      const a = await T.runToPromiseExit(
        T.condWith(true)(T.pure(1))(T.pure(2))
      );
      const b = await T.runToPromiseExit(
        T.condWith(false)(T.pure(1))(T.pure(2))
      );

      assert.deepEqual(a, ex.done(1));
      assert.deepEqual(b, ex.done(2));
    });

    it("provide & access env", async () => {
      const valueEnv = Symbol();
      interface ValueEnv {
        [valueEnv]: "ok";
      }
      const env: ValueEnv = {
        [valueEnv]: "ok"
      };

      const module = pipe(T.noEnv, T.mergeEnv(env));

      const a = await T.runToPromiseExit(
        T.provide(module)(
          T.accessM(({ [valueEnv]: value }: ValueEnv) => T.pure(value))
        )
      );

      const b = await T.runToPromiseExit(
        T.provide(module)(T.access(({ [valueEnv]: value }: ValueEnv) => value))
      );

      assert.deepStrictEqual(a, ex.done("ok"));
      assert.deepStrictEqual(b, ex.done("ok"));
    });

    it("provideM", async () => {
      const nameEnv = Symbol();
      interface EnvName {
        [nameEnv]: string;
      }
      const nameLengthEnv = Symbol();
      interface EnvNameLength {
        [nameLengthEnv]: number;
      }

      const program = T.accessM(
        ({ [nameLengthEnv]: nameLength }: EnvNameLength) =>
          T.pure(nameLength + 1)
      );

      const provider = T.accessM(({ [nameEnv]: name }: EnvName) =>
        T.pure({
          [nameLengthEnv]: name.length
        } as EnvNameLength)
      );

      const env: EnvName = {
        [nameEnv]: "bob"
      };

      const a = await T.runToPromiseExit(
        pipe(program, T.provideM(provider), T.provide(env))
      );

      assert.deepEqual(a, ex.done(4));
    });

    it("provideSomeM", async () => {
      const nameEnv = Symbol();
      interface EnvName {
        [nameEnv]: string;
      }
      const surNameEnv = Symbol();
      interface EnvSurname {
        [surNameEnv]: string;
      }
      const nameLengthEnv = Symbol();
      interface EnvNameLength {
        [nameLengthEnv]: number;
      }
      const surnameLengthEnv = Symbol();
      interface EnvSurNameLength {
        [surnameLengthEnv]: number;
      }

      const program = T.accessM(
        ({
          [nameLengthEnv]: nameLength,
          [surnameLengthEnv]: surnameLength
        }: EnvNameLength & EnvSurNameLength) =>
          T.pure(nameLength + surnameLength)
      );

      const nameLengthProvider = T.accessM(({ [nameEnv]: name }: EnvName) =>
        T.pure({
          [nameLengthEnv]: name.length
        } as EnvNameLength)
      );
      const surnameLengthProvider = T.accessM(
        ({ [surNameEnv]: surName }: EnvSurname) =>
          T.pure({
            [surnameLengthEnv]: surName.length
          } as EnvSurNameLength)
      );

      const env: EnvName & EnvSurname = {
        [nameEnv]: "bob",
        [surNameEnv]: "sponge"
      };

      const a = await T.runToPromiseExit(
        pipe(
          program,
          T.provideSomeM(nameLengthProvider),
          T.provideSomeM(surnameLengthProvider),
          T.provide(env)
        )
      );

      assert.deepEqual(a, ex.done(9));
    });

    it("promise", async () => {
      const a = await T.runToPromise(T.pure(1));

      assert.deepEqual(a, 1);
    });

    it("foldExit", async () => {
      const a = await T.runToPromise(
        pipe(
          T.pure(1),
          T.foldExit(
            () => T.pure(null),
            (n: number) => T.pure(n + 1)
          )
        )
      );

      assert.deepEqual(a, 2);
    });

    it("foldExit - error", async () => {
      const a = await T.runToPromise(
        pipe(
          T.raiseError(1),
          T.foldExit(
            () => T.pure(1),
            // tslint:disable-next-line: restrict-plus-operands
            n => T.pure(n + 1)
          )
        )
      );

      assert.deepEqual(a, 1);
    });

    it("fromNullableM", async () => {
      const a = await T.runToPromiseExit(T.fromNullableM(T.pure(null)));
      const b = await T.runToPromiseExit(T.fromNullableM(T.pure(1)));

      assert.deepEqual(a, ex.done(none));
      assert.deepEqual(b, ex.done(some(1)));
    });
  });

  describe("Concurrent", () => {
    it("ap", async () => {
      const double = (n: number): number => n * 2;
      const mab = T.pure(double);
      const ma = T.pure(1);
      const x = await T.runToPromiseExit(T.parEffect.ap(mab, ma));
      assert.deepStrictEqual(x, ex.done(2));
    });

    it("sequenceP", async () => {
      const res = await T.runToPromiseExit(
        T.sequenceP(1)([T.pure(1), T.pure(2)])
      );

      assert.deepEqual(res, ex.done([1, 2]));
    });
  });

  describe("Monad", () => {
    it("map", async () => {
      const double = (n: number): number => n * 2;
      const x = await T.runToPromiseExit(effect.map(T.pure(1), double));
      assert.deepStrictEqual(x, ex.done(2));
    });

    it("ap", async () => {
      const double = (n: number): number => n * 2;
      const mab = T.pure(double);
      const ma = T.pure(1);
      const x = await T.runToPromiseExit(effect.ap(mab, ma));
      assert.deepStrictEqual(x, ex.done(2));
    });

    it("chain", async () => {
      const e1 = await T.runToPromiseExit(
        effect.chain(T.pure("foo"), a =>
          a.length > 2 ? T.pure(a.length) : T.raiseError("foo")
        )
      );
      assert.deepStrictEqual(e1, ex.done(3));
      const e2 = await T.runToPromiseExit(
        effect.chain(T.pure("a"), a =>
          a.length > 2 ? T.pure(a.length) : T.raiseError("foo")
        )
      );
      assert.deepStrictEqual(e2, ex.raise("foo"));
    });
  });

  describe("Bifunctor", () => {
    it("bimap", async () => {
      const f = (s: string): number => s.length;
      const g = (n: number): boolean => n > 2;

      const e1 = await T.runToPromiseExit(effect.bimap(T.pure(1), f, g));
      assert.deepStrictEqual(e1, ex.done(false));
      const e2 = await T.runToPromiseExit(
        effect.bimap(T.raiseError("foo"), f, g)
      );
      assert.deepStrictEqual(e2, ex.raise(3));
    });

    it("mapLeft", async () => {
      const e = await T.runToPromiseExit(
        effect.mapLeft(T.raiseError("1"), x => new Error(x))
      );
      assert.deepStrictEqual(e, ex.raise(new Error("1")));
    });
  });

  describe("Alt3", () => {
    it("alt", async () => {
      const a = T.pure("a");
      const a2 = T.pure("a2");
      const err = T.raiseError("e");
      const err2 = T.raiseError("err2");
      assert.deepStrictEqual(
        await T.runToPromiseExit(effect.alt(err, () => a)),
        ex.done("a")
      );
      assert.deepStrictEqual(
        await T.runToPromiseExit(effect.alt(err, () => err2)),
        ex.raise("err2")
      );
      assert.deepStrictEqual(
        await T.runToPromiseExit(effect.alt(a, () => a2)),
        ex.done("a")
      );
      assert.deepStrictEqual(
        await T.runToPromiseExit(effect.alt(a, () => err)),
        ex.done("a")
      );
    });

    it("pipe alt", async () => {
      const a = effect.of("a");
      const a2 = effect.of("a2");
      const err = T.raiseError<string, string>("e");
      const err2 = T.raiseError<string, string>("err2");
      assert.deepStrictEqual(
        await T.runToPromiseExit(
          pipe(
            err,
            T.alt(() => a)
          )
        ),
        ex.done("a")
      );
      assert.deepStrictEqual(
        await T.runToPromiseExit(
          pipe(
            err,
            T.alt(() => err2)
          )
        ),
        ex.raise("err2")
      );
      assert.deepStrictEqual(
        await T.runToPromiseExit(
          pipe(
            a,
            T.alt(() => a2)
          )
        ),
        ex.done("a")
      );
      assert.deepStrictEqual(
        await T.runToPromiseExit(
          pipe(
            a,
            T.alt(() => err)
          )
        ),
        ex.done("a")
      );
    });
  });

  it("fromPromiseMap", async () => {
    const e1 = await T.runToPromiseExit(
      T.fromPromiseMap(() => "error")(() => Promise.resolve(1))
    );

    assert.deepStrictEqual(e1, ex.done(1));
    const e2 = await T.runToPromiseExit(
      T.fromPromiseMap(() => "error")(() => Promise.reject(undefined))
    );
    assert.deepStrictEqual(e2, ex.raise("error"));
  });

  it("fromPredicate", async () => {
    const gt2 = T.fromPredicate(
      (n: number) => n >= 2,
      n => `Invalid number ${n}`
    );
    const e1 = await T.runToPromiseExit(gt2(3));
    assert.deepStrictEqual(e1, ex.done(3));
    const e2 = await T.runToPromiseExit(gt2(1));
    assert.deepStrictEqual(e2, ex.raise("Invalid number 1"));

    // refinements
    const isNumber = (u: string | number): u is number => typeof u === "number";
    const e3 = await T.runToPromiseExit(
      T.fromPredicate(isNumber, () => "not a number")(4)
    );
    assert.deepStrictEqual(e3, ex.done(4));
  });

  describe("bracket", () => {
    let log: Array<string> = [];

    const acquireFailure = T.raiseError("acquire failure");
    const acquireSuccess = T.pure({ res: "acquire success" });
    const useSuccess = () => T.pure("use success");
    const useFailure = () => T.raiseError("use failure");
    const releaseSuccess = () =>
      T.sync(() => {
        log.push("release success");
      });
    const releaseFailure = () => T.raiseError("release failure");

    beforeEach(() => {
      log = [];
    });

    it("should return the acquire error if acquire fails", async () => {
      const e = await T.runToPromiseExit(
        T.bracket(acquireFailure, releaseSuccess, useSuccess)
      );

      assert.deepStrictEqual(e, ex.raise("acquire failure"));
    });

    it("body and release must not be called if acquire fails", async () => {
      await T.runToPromiseExit(
        T.bracket(acquireFailure, releaseSuccess, useSuccess)
      );
      assert.deepStrictEqual(log, []);
    });

    it("should return the use error if use fails and release does not", async () => {
      const e = await T.runToPromiseExit(
        T.bracket(acquireSuccess, releaseSuccess, useFailure)
      );
      assert.deepStrictEqual(e, ex.raise("use failure"));
    });

    it("should return the use error if both use and release fail", async () => {
      const e = await T.runToPromiseExit(
        T.bracket(acquireSuccess, releaseFailure, useFailure)
      );
      assert.deepStrictEqual(e, ex.raise("use failure"));
    });

    it("release must be called if the body returns", async () => {
      await T.runToPromiseExit(
        T.bracket(acquireSuccess, releaseSuccess, useSuccess)
      );
      assert.deepStrictEqual(log, ["release success"]);
    });

    it("release must be called if the body throws", async () => {
      await T.runToPromiseExit(
        T.bracket(acquireSuccess, releaseSuccess, useFailure)
      );
      assert.deepStrictEqual(log, ["release success"]);
    });

    it("should return the release error if release fails", async () => {
      const e = await T.runToPromiseExit(
        T.bracket(acquireSuccess, releaseFailure, useSuccess)
      );
      assert.deepStrictEqual(e, ex.raise("release failure"));
    });
  });

  describe("bracketExit", () => {
    let log: Array<string> = [];

    const acquireFailure = T.raiseError("acquire failure");
    const acquireSuccess = T.pure({ res: "acquire success" });
    const useSuccess = () => T.pure("use success");
    const useFailure = () => T.raiseError("use failure");
    const releaseSuccess = () =>
      T.sync(() => {
        log.push("release success");
      });
    const releaseFailure = () => T.raiseError("release failure");

    beforeEach(() => {
      log = [];
    });

    it("should return the acquire error if acquire fails", async () => {
      const e = await T.runToPromiseExit(
        T.bracketExit(acquireFailure, releaseSuccess, useSuccess)
      );

      assert.deepStrictEqual(e, ex.raise("acquire failure"));
    });

    it("body and release must not be called if acquire fails", async () => {
      await T.runToPromiseExit(
        T.bracketExit(acquireFailure, releaseSuccess, useSuccess)
      );
      assert.deepStrictEqual(log, []);
    });

    it("should return the use error if use fails and release does not", async () => {
      const e = await T.runToPromiseExit(
        T.bracketExit(acquireSuccess, releaseSuccess, useFailure)
      );
      assert.deepStrictEqual(e, ex.raise("use failure"));
    });

    it("should return the use error if both use and release fail", async () => {
      const e = await T.runToPromiseExit(
        T.bracketExit(acquireSuccess, releaseFailure, useFailure)
      );
      assert.deepStrictEqual(e, ex.raise("use failure"));
    });

    it("release must be called if the body returns", async () => {
      await T.runToPromiseExit(
        T.bracketExit(acquireSuccess, releaseSuccess, useSuccess)
      );
      assert.deepStrictEqual(log, ["release success"]);
    });

    it("release must be called if the body throws", async () => {
      await T.runToPromiseExit(
        T.bracketExit(acquireSuccess, releaseSuccess, useFailure)
      );
      assert.deepStrictEqual(log, ["release success"]);
    });

    it("should return the release error if release fails", async () => {
      const e = await T.runToPromiseExit(
        T.bracketExit(acquireSuccess, releaseFailure, useSuccess)
      );
      assert.deepStrictEqual(e, ex.raise("release failure"));
    });
  });

  it("getCauseValidationM", async () => {
    const M = T.getValidationM(semigroupString);

    const f = (s: string) => M.of(s.length);

    assert.deepStrictEqual(
      await T.runToPromiseExit(M.chain(T.pure("abc"), f)),
      await T.runToPromiseExit(T.pure(3))
    );
    assert.deepStrictEqual(
      await T.runToPromiseExit(M.chain(T.raiseError("a"), f)),
      await T.runToPromiseExit(T.raiseError("a"))
    );
    assert.deepStrictEqual(
      await T.runToPromiseExit(
        M.chain(T.raiseError("a"), () => T.raiseError("b"))
      ),
      await T.runToPromiseExit(T.raiseError("a"))
    );
    assert.deepStrictEqual(
      await T.runToPromiseExit(M.of(1)),
      await T.runToPromiseExit(T.pure(1))
    );

    const double = (n: number) => n * 2;

    assert.deepStrictEqual(
      await T.runToPromiseExit(M.ap(T.pure(double), T.pure(1))),
      await T.runToPromiseExit(T.pure(2))
    );
    assert.deepStrictEqual(
      await T.runToPromiseExit(M.ap(T.pure(double), T.raiseError("foo"))),
      await T.runToPromiseExit(T.raiseError("foo"))
    );
    assert.deepStrictEqual(
      await T.runToPromiseExit(
        M.ap(T.raiseError<string, (n: number) => number>("foo"), T.pure(1))
      ),
      await T.runToPromiseExit(T.raiseError("foo"))
    );
    assert.deepStrictEqual(
      await T.runToPromiseExit(M.ap(T.raiseError("foo"), T.raiseError("bar"))),
      await T.runToPromiseExit(T.raiseError("foobar"))
    );
    assert.deepStrictEqual(
      await T.runToPromiseExit(M.alt(T.raiseError("a"), () => T.pure(1))),
      await T.runToPromiseExit(T.pure(1))
    );
    assert.deepStrictEqual(
      await T.runToPromiseExit(M.alt(T.pure(1), () => T.raiseError("a"))),
      await T.runToPromiseExit(T.pure(1))
    );
    assert.deepStrictEqual(
      await T.runToPromiseExit(
        M.alt(T.raiseError("a"), () => T.raiseError("b"))
      ),
      await T.runToPromiseExit(T.raiseError("ab"))
    );
  });

  describe("Do", () => {
    const valueEnv = Symbol();
    interface Env1 {
      [valueEnv]: string;
    }
    const value2Env = Symbol();
    interface Env2 {
      [value2Env]: string;
    }
    const env1: Env1 = { [valueEnv]: "a" };
    const env2: Env2 = { [value2Env]: "b" };
    const env = T.mergeEnv(env2)(env1);

    it("effectMonad", async () => {
      const M = parEffect;
      const p = Do(M)
        .bindL("x", () => M.of("a"))
        .sequenceS({
          a: effect.throwError("a"),
          b: effect.throwError("b")
        })
        .return(identity);
      const e = await T.runToPromiseExit(p);
      assert.deepStrictEqual(e, ex.raise("a"));
    });
    it("effectMonad env", async () => {
      const M = T.effect;
      const p = Do(M)
        .bindL("x", () => T.accessM(({}: Env2) => M.of("a")))
        .sequenceS({
          a: T.accessM(({}: Env1) => M.throwError("a")),
          b: M.throwError("b")
        })
        .return(r => r);
      const e = await T.runToPromiseExit(T.provide(env)(p));
      assert.deepStrictEqual(e, ex.raise("a"));
    });
    it("getCauseValidationM", async () => {
      const M = T.getValidationM(semigroupString);
      const e = await T.runToPromiseExit(
        Do(M)
          .bindL("x", () => M.of("a"))
          .sequenceS({
            a: M.throwError("a"),
            b: M.throwError("b")
          })
          .return(r => r)
      );
      assert.deepStrictEqual(e, ex.raise("ab"));
    });
    it("getCauseValidationM env", async () => {
      const M = T.getValidationM(semigroupString);
      const p = Do(M)
        .bindL("x", () => M.of("a"))
        .sequenceS({
          a: T.accessM(({}: Env1) => M.throwError("a")),
          b: M.throwError("b")
        })
        .return(r => r);
      const e = await T.runToPromiseExit(T.provide(env1)(p));
      assert.deepStrictEqual(e, ex.raise("ab"));
    });

    it("should traverse validation", async () => {
      const V = T.getValidationM(semigroupString);

      const checks = array.traverse(V)([0, 1, 2, 3, 4], x =>
        x < 2 ? T.raiseError(`(error: ${x})`) : T.pure(x)
      );

      const res = await T.runToPromiseExit(checks);

      assert.deepEqual(res, ex.raise("(error: 0)(error: 1)"));
    });

    it("should traverse validation with env", async () => {
      const prefixEnv = Symbol();
      interface PrefixEnv {
        [prefixEnv]: "error";
      }
      const env: PrefixEnv = {
        [prefixEnv]: "error"
      };

      const V = T.getValidationM(semigroupString);

      const checks = array.traverse(V)([0, 1, 2, 3, 4], x =>
        x < 2
          ? T.accessM(({ [prefixEnv]: prefix }: PrefixEnv) =>
              T.raiseError(`(${prefix}: ${x})`)
            )
          : T.pure(x)
      );

      const res = await T.runToPromiseExit(T.provide(env)(checks));

      assert.deepEqual(res, ex.raise("(error: 0)(error: 1)"));
    });
  });
});

describe("effectify", () => {
  it("returns correct value", async () => {
    const fun = (
      a: string,
      cb: (err: string | null, v: string | null) => void
    ) => {
      cb(null, a);
    };
    const effFun = T.effectify(fun);
    assert.deepStrictEqual(await T.runToPromise(effFun("x")), "x");
  });
  it("returns an error", async () => {
    const fun = (
      a: string,
      cb: (err: string | null, v: string | null) => void
    ) => {
      cb("error", null);
    };
    const effFun = T.effectify(fun);
    assert.deepStrictEqual(
      await T.runToPromiseExit(effFun("x")),
      ex.raise("error")
    );
  });
});
