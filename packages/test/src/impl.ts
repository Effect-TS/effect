import { effect as T, freeEnv as F } from "@matechs/effect";
import * as assert from "assert";
import { pipe } from "fp-ts/lib/pipeable";
import * as O from "fp-ts/lib/Option";
import { Spec, Suite, Test } from "./def";
import { getTimeout } from "./aspects/timeout";
import { getSkip } from "./aspects/skip";
import { identity } from "fp-ts/lib/function";

export const testM = (name: string) => <R, E>(eff: T.Effect<R, E, void>): Spec<R> => ({
  _R: undefined as any,
  _tag: "test",
  name,
  eff,
  config: {}
});

export type ROf<S extends Spec<any>> = unknown extends S["_R"] ? never : S["_R"];

export const suite = (name: string) => <Specs extends Spec<any>[]>(
  ...specs: Specs
): Spec<F.UnionToIntersection<ROf<Exclude<Specs[number], Spec<unknown>>>>> => ({
  _R: undefined as any,
  _tag: "suite",
  name,
  specs
});

export { assert };

export const customRun = (_: Runner) => <Specs extends Spec<any>[]>(...specs: Specs) => (
  provider: unknown extends F.UnionToIntersection<ROf<Exclude<Specs[number], Spec<unknown>>>>
    ? void
    : <E, A>(
        _: T.Effect<F.UnionToIntersection<ROf<Exclude<Specs[number], Spec<unknown>>>>, E, A>
      ) => T.Effect<unknown, E, A>
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
  provider: <E, A>(
    _: T.Effect<F.UnionToIntersection<ROf<Exclude<Suites[number], Suites[number]>>>, E, A>
  ) => T.Effect<unknown, E, A>
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

export interface Describe {
  (name: string, op: () => void): void;
}

export interface It {
  <A>(name: string, op: () => Promise<A>, timeout?: number): void;
  skip: <A>(name: string, op: () => Promise<A>, timeout?: number) => void;
}

export interface Runner {
  describe: Describe;
  it: It;
}

function runTest<R>(_: Runner, spec: Test<R>, provider: <E, A>(_: T.Effect<R, E, A>) => T.Effect<unknown, E, A>) {
  pipe(
    getSkip(spec),
    O.filter((x): x is true => x === true),
    O.fold(
      () => {
        _.it(spec.name, async () => pipe(spec.eff, provider, T.runToPromise), pipe(spec, getTimeout, O.toUndefined));
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
