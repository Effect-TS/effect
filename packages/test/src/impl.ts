import { effect as T, freeEnv as F } from "@matechs/effect";
import * as assert from "assert";
import { pipe } from "fp-ts/lib/pipeable";

export interface Test<R> {
  _R: R;
  _tag: "test";
  name: string;
  eff: T.Effect<R, any, void>;
}

export interface Suite<R> {
  _R: R;
  _tag: "suite";
  name: string;
  specs: Spec<R>[];
}

export const testM = (name: string) => <R, E>(eff: T.Effect<R, E, void>): Test<R> => ({
  _R: undefined as any,
  _tag: "test",
  name,
  eff
});

export type Spec<R> = Test<R> | Suite<R>;

export type ROf<S extends Spec<any>> = unknown extends S["_R"] ? never : S["_R"];

export const suite = (name: string) => <Specs extends Spec<any>[]>(
  ...specs: Specs
): Suite<F.UnionToIntersection<ROf<Exclude<Specs[number], Spec<unknown>>>>> => ({
  _R: undefined as any,
  _tag: "suite",
  name,
  specs
});

export { assert };

export const run = <Suites extends Suite<any>[]>(...suites: Suites) => (
  provider: <E, A>(_: T.Effect<F.UnionToIntersection<ROf<Suites[number]>>, E, A>) => T.Effect<unknown, E, A>
) =>
  T.runToPromise(
    pipe(
      T.sync(() => {
        suites.map((s) => {
          desc(s, provider);
        });
      })
    )
  );

function desc<Suites extends Suite<any>[]>(
  s: Suite<any>,
  provider: <E, A>(_: T.Effect<F.UnionToIntersection<ROf<Suites[number]>>, E, A>) => T.Effect<unknown, E, A>
) {
  describe(s.name, () => {
    s.specs.map((spec) => {
      switch (spec._tag) {
        case "suite": {
          describe(spec.name, () => {
            spec.specs.forEach((child) => {
              switch (child._tag) {
                case "suite": {
                  desc(child, provider);
                  break;
                }
                case "test": {
                  it(child.name, async () => pipe(child.eff, provider, T.runToPromise));
                  break;
                }
              }
            });
          });
          break;
        }
        case "test": {
          it(spec.name, async () => pipe(spec.eff, provider, T.runToPromise));
          break;
        }
      }
    });
  });
}
