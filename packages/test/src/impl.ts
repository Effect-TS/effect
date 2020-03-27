import { effect as T, freeEnv as F } from "@matechs/effect";
import * as assert from "assert";
import { pipe } from "fp-ts/lib/pipeable";
import * as O from "fp-ts/lib/Option";
import { Spec, Suite } from "./def";
import { getTimeout } from "./aspects/timeout";

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

export const run = <Specs extends Spec<any>[]>(...specs: Specs) => (
  provider: <E, A>(
    _: T.Effect<F.UnionToIntersection<ROf<Exclude<Specs[number], Spec<unknown>>>>, E, A>
  ) => T.Effect<unknown, E, A>
) =>
  T.runToPromise(
    pipe(
      T.sync(() => {
        specs.map((s) => {
          switch (s._tag) {
            case "suite": {
              desc(s, provider);
              break;
            }
            case "test": {
              describe("root", () => {
                it(s.name, async () => pipe(s.eff, provider, T.runToPromise), pipe(s, getTimeout, O.toUndefined));
              });
            }
          }
        });
      })
    )
  );

function desc<Suites extends Suite<any>[]>(
  s: Suite<any>,
  provider: <E, A>(
    _: T.Effect<F.UnionToIntersection<ROf<Exclude<Suites[number], Suites[number]>>>, E, A>
  ) => T.Effect<unknown, E, A>
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
                  it(
                    child.name,
                    async () => pipe(child.eff, provider, T.runToPromise),
                    pipe(child, getTimeout, O.toUndefined)
                  );
                  break;
                }
              }
            });
          });
          break;
        }
        case "test": {
          it(spec.name, async () => pipe(spec.eff, provider, T.runToPromise), pipe(spec, getTimeout, O.toUndefined));
          break;
        }
      }
    });
  });
}
