import { eff as Eff, effect as T, exit as EX } from "../src";
import * as assert from "assert";
import { pipe } from "fp-ts/lib/pipeable";
import { sequenceS } from "fp-ts/lib/Apply";
import { right } from "fp-ts/lib/Either";

describe("Eff", () => {
  it("should compose sync", () => {
    // T.SyncEff<{ n: number; }, never, number>
    const program = pipe(
      Eff.access((_: { n: number }) => _.n),
      Eff.chain((n) => Eff.sync(() => n + 1)),
      Eff.retype
    );

    const result = pipe(
      program,
      Eff.provideAll({
        n: 1,
      }),
      Eff.runSync
    );

    assert.deepEqual(result, EX.done(2));
  });

  it("should compose sync using fluent", () => {
    // T.SyncEff<{ n: number; }, never, number>
    const program = Eff.retype(
      Eff.accessEnvironment<{ n: number }>()
        .fluent()
        .chain((_) => Eff.sync(() => _.n + 1))
    );

    const result = pipe(
      program,
      Eff.provideAll({
        n: 1,
      }),
      Eff.runSync
    );

    assert.deepEqual(result, EX.done(2));
  });

  it("should compose async using fluent", async () => {
    // T.AsyncEff<{ n: number; }, never, number>
    const program = Eff.retype(
      Eff.accessEnvironment<{ n: number }>()
        .fluent()
        .chain((_) => Eff.sync(() => _.n + 1))
        .flow(Eff.shiftBefore)
    );

    const result = await pipe(
      program,
      Eff.provideAll({
        n: 1,
      }),
      Eff.runToPromiseExit
    );

    assert.deepEqual(result, EX.done(2));
  });

  it("should compose async using sequence", async () => {
    const program = Eff.retype(
      sequenceS(Eff.eff)({
        a: Eff.accessEnvironment<{ n: number }>()
          .fluent()
          .map((_) => _.n)
          .done(),
        b: Eff.delay(Eff.pure(1), 0),
      })
    );

    const result = await pipe(
      program,
      Eff.provideAll({
        n: 1,
      }),
      Eff.runToPromiseExit
    );

    assert.deepEqual(result, EX.done({ a: 1, b: 1 }));
  });

  it("should interop with effect", async () => {
    const program = Eff.retype(
      sequenceS(Eff.eff)({
        a: Eff.accessEnvironment<{ n: number }>()
          .fluent()
          .map((_) => _.n)
          .done(),
        b: Eff.delay(Eff.pure(1), 0),
      })
    );

    const result = await pipe(
      program.effect(),
      T.provideAll({
        n: 1,
      }),
      T.runToPromiseExit
    );

    assert.deepEqual(result, EX.done({ a: 1, b: 1 }));
  });

  it("should encase sync effect", () => {
    const program = Eff.encaseSync(T.sync(() => 1));
    const result = Eff.runSync(program);

    assert.deepEqual(result, EX.done(1));
  });

  it("should encase sync effect - abort if async", () => {
    const program = Eff.encaseSync(
      T.async(() => (cb) => {
        cb();
      })
    );

    const result = Eff.runSync(program);

    assert.deepEqual(EX.isAbort(result), true);
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
});
