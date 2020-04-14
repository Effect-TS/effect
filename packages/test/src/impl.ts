import { effect as T, freeEnv as F } from "@matechs/effect";
import * as assert from "assert";
import { pipe } from "fp-ts/lib/pipeable";
import * as O from "fp-ts/lib/Option";
import { Spec, Suite, Test, Runner } from "./def";
import { getTimeout } from "./aspects/timeout";
import { getSkip } from "./aspects/skip";
import { getTodo, TodoURI } from "./aspects/todo";
import { identity } from "fp-ts/lib/function";

export const testM = <R, E, A>(name: string, eff?: T.Effect<R, E, A>): Spec<R> => ({
  _R: undefined as any,
  _tag: "test",
  name,
  eff: eff || T.sync(() => {}),
  config: {
    [TodoURI]: eff ? undefined : true
  }
});

export type ROf<S extends Spec<any>> = S extends Spec<infer R>
  ? unknown extends R
    ? never
    : R
  : never;

export const suite = (name: string) => <Specs extends Spec<any>[]>(
  ...specs: Specs
): Spec<F.UnionToIntersection<ROf<Exclude<Specs[number], Spec<unknown>>>>> => ({
  _R: undefined as any,
  _tag: "suite",
  name,
  specs
});

export { assert };

export type SpecsEnv<Specs extends Spec<any>[]> = F.UnionToIntersection<
  ROf<Exclude<Specs[number], Spec<unknown>>>
>;

export const customRun = (_: Runner) => <Specs extends Spec<any>[]>(...specs: Specs) => (
  provider: unknown extends T.Erase<SpecsEnv<Specs>, T.AsyncRT>
    ? void
    : T.Provider<unknown, T.Erase<SpecsEnv<Specs>, T.AsyncRT>, any>
) => {
  specs.map((s) => {
    switch (s._tag) {
      case "suite": {
        desc(_, s, (provider || identity) as any);
        break;
      }
      case "test": {
        _.describe(`Root: ${s.name}`, () => {
          runTest(_, s, (provider || identity) as any);
        });
      }
    }
  });
};

function desc<Suites extends Suite<any>[]>(
  _: Runner,
  s: Suite<any>,
  provider: T.Provider<unknown, SpecsEnv<Suites>, any>
) {
  _.describe(s.name, () => {
    s.specs.map((spec) => {
      switch (spec._tag) {
        case "suite": {
          _.describe(spec.name, () => {
            spec.specs.forEach((child) => {
              switch (child._tag) {
                case "suite": {
                  desc(_, child, provider);
                  break;
                }
                case "test": {
                  runTest(_, child, provider);
                  break;
                }
              }
            });
          });
          break;
        }
        case "test": {
          runTest(_, spec, provider);
          break;
        }
      }
    });
  });
}

function runTest<R>(_: Runner, spec: Test<R>, provider: T.Provider<unknown, R, any>) {
  pipe(
    getSkip(spec),
    O.filter((x): x is true => x === true),
    O.fold(
      () => {
        pipe(
          getTodo(spec),
          O.filter((x): x is true => x === true),
          O.fold(
            () =>
              _.it.run(
                spec.name,
                async () => pipe(spec.eff, provider, T.runToPromise),
                pipe(spec, getTimeout, O.toUndefined)
              ),
            () => _.it.todo(spec.name)
          )
        );
      },
      () => {
        _.it.skip(
          spec.name,
          async () => pipe(spec.eff, provider, T.runToPromise),
          pipe(spec, getTimeout, O.toUndefined)
        );
      }
    )
  );
}
