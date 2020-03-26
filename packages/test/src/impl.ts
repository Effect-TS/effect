import { effect as T, freeEnv as F } from "@matechs/effect";
import * as assert from "assert";
import { pipe } from "fp-ts/lib/pipeable";

export interface Test<R, E> {
  _tag: "test";
  name: string;
  eff: T.Effect<R, E, void>;
}

export interface Suite<Tests extends Test<any, any>[]> {
  _tag: "suite";
  name: string;
  tests: Tests;
}

export const testM = (name: string) => <R, E>(eff: T.Effect<R, E, void>): Test<R, E> => ({
  _tag: "test",
  name,
  eff
});

export type ROf<Spec extends Suite<any[]>> = F.UnionToIntersection<
  {
    [k in number & keyof Spec["tests"]]: Spec["tests"][k]["eff"] extends T.Effect<infer R, any, any>
      ? unknown extends R
        ? never
        : R
      : never;
  }[number]
>;

export const suite = (name: string) => <Tests extends Test<any, any>[]>(...tests: Tests): Suite<Tests> => ({
  _tag: "suite",
  name,
  tests
});

export { assert };

export const run = <Suites extends Suite<Test<any, any>[]>[]>(...suites: Suites) => (
  provider: <E, A>(
    _: T.Effect<
      F.UnionToIntersection<
        {
          [k in number & keyof Suites]: ROf<Suites[k]>;
        }[number]
      >,
      E,
      A
    >
  ) => T.Effect<unknown, E, A>
) =>
  T.runToPromise(
    pipe(
      T.sync(() => {
        suites.map((s) => {
          describe(name, () => {
            s.tests.map((test) => {
              it(test.name, async () => pipe(test.eff, provider, T.runToPromise));
            });
          });
        });
      })
    )
  );
