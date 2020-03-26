import { effect as T, freeEnv as F } from "@matechs/effect";
import * as assert from "assert";
import { pipe } from "fp-ts/lib/pipeable";

export interface Test<R> {
  _tag: "test";
  name: string;
  eff: T.Effect<R, any, void>;
}

export interface Suite<R> {
  _tag: "suite";
  name: string;
  specs: Spec<R>[];
}

export const testM = (name: string) => <R, E>(eff: T.Effect<R, E, void>): Test<R> => ({
  _tag: "test",
  name,
  eff
});

export type Spec<R> = Test<R> | Suite<R>;

export type ROf<S extends Spec<any>[]> = F.UnionToIntersection<
  {
    [k in number & keyof S]: S[k] extends Test<infer R>
      ? unknown extends R
        ? never
        : R
      : S[k] extends Suite<infer R>
      ? unknown extends R
        ? never
        : R
      : never;
  }[number]
>;

export const suite = (name: string) => <Specs extends Spec<any>[]>(...specs: Specs): Suite<ROf<Specs>> => ({
  _tag: "suite",
  name,
  specs
});

export { assert };

export const run = <Suites extends Suite<any>[]>(...suites: Suites) => (
  provider: <E, A>(_: T.Effect<ROf<Suites>, E, A>) => T.Effect<unknown, E, A>
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
  provider: <E, A>(_: T.Effect<ROf<Suites>, E, A>) => T.Effect<unknown, E, A>
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
