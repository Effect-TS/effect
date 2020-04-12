import { eff as Eff, effect as T, exit as EX } from "../src";
import * as assert from "assert";
import { pipe } from "fp-ts/lib/pipeable";
import { right } from "fp-ts/lib/Either";
import { Do } from "fp-ts-contrib/lib/Do";

describe("Eff", () => {
  it("should compose sync", () => {
    // T.SyncEff<{ n: number; }, never, number>
    const program = pipe(
      Eff.access((_: { n: number }) => _.n),
      Eff.chain((n) => Eff.sync(() => n + 1))
    );

    const result = pipe(
      program,
      Eff.provideAll({
        n: 1
      }),
      Eff.runSync
    );

    assert.deepEqual(result, EX.done(2));
  });

  it("should compose sync - do", () => {
    // T.SyncEff<{ n: number; }, never, number>
    const program = Do(Eff.eff)
      .bindL("n", () => Eff.access((_: { n: number }) => _.n))
      .bindL("res", ({ n }) => Eff.sync(() => n + 1))
      .return((x) => x.res);

    const result = pipe(
      program,
      Eff.provideAll({
        n: 1
      }),
      Eff.runSync
    );

    assert.deepEqual(result, EX.done(2));
  });

  it("should compose async - do", async () => {
    // T.AyncEff<{ n: number; }, never, number>
    const program = Do(Eff.eff)
      .bindL("n", () => Eff.access((_: { n: number }) => _.n))
      .bindL("res", ({ n }) => Eff.sync(() => n + 1))
      .do(Eff.delay(Eff.unit, 1))
      .return((x) => x.res);

    const result = await pipe(
      program,
      Eff.provideAll({
        n: 1
      }),
      Eff.runToPromiseExit
    );

    assert.deepEqual(result, EX.done(2));
  });

  it("should encase sync effect", () => {
    const program = Eff.encaseSyncOrAbort(T.sync(() => 1));
    const result = Eff.runSync(program);

    assert.deepEqual(result, EX.done(1));
  });

  it("should encase sync effect - abort if async", () => {
    const program = Eff.encaseSyncOrAbort(
      T.async(() => (cb) => {
        cb();
      })
    );

    const result = Eff.runSync(program);

    assert.deepEqual(EX.isAbort(result), true);
  });

  it("should encase sync effect - map error if async", () => {
    const program = Eff.encaseSyncMap(
      T.async<never, number>((r) => {
        setTimeout(() => {
          r(right(1));
        }, 100);
        return (cb) => {
          cb();
        };
      }),
      () => "error"
    );

    const result = Eff.runSync(program);

    assert.deepEqual(result, EX.raise("error"));
  });

  it("should encase async effect", async () => {
    const program = Eff.encaseEffect(
      T.async<never, number>((r) => {
        const timer = setTimeout(() => {
          r(right(1));
        }, 100);
        return (cb) => {
          clearTimeout(timer);
          cb();
        };
      })
    );

    const result = await Eff.runToPromiseExit(program);

    assert.deepEqual(result, EX.done(1));
  });

  describe("compat", () => {
    it("use zipWith", () => {
      const result = pipe(
        Eff.zipWith(Eff.pure(1), Eff.pure(2), (x, y) => x + y),
        Eff.runSync
      );

      assert.deepEqual(result, EX.done(3));
    });
    it("use zip", () => {
      const result = pipe(Eff.zip(Eff.pure(1), Eff.pure(2)), Eff.runSync);

      assert.deepEqual(result, EX.done([1, 2]));
    });
  });
});
