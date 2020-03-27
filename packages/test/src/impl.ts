import { effect as T, freeEnv as F, retry as R } from "@matechs/effect";
import * as assert from "assert";
import { pipe } from "fp-ts/lib/pipeable";
import { RetryPolicy } from "retry-ts";
import * as O from "fp-ts/lib/Option";

export interface Test<R> {
  _R: R;
  _tag: "test";
  name: string;
  eff: T.Effect<R, any, void>;
  config: Record<string, unknown>;
}

export const TimeoutURI = "@matechs/test/TimeoutURI";
export const RetryURI = "@matechs/test/RetryURI";

export interface TestConfig {
  [TimeoutURI]: number;
  [RetryURI]: boolean;
}

export const getConfigValue = <K extends keyof TestConfig>(k: K) => <R>(_: Test<R>) =>
  pipe(
    O.fromNullable(_.config[k]),
    O.map((x) => x as TestConfig[K])
  );

export const setConfigValue = <K extends keyof TestConfig>(k: K) => (value: TestConfig[K]) => <R>(
  _: Test<R>
): Test<R> => ({
  ..._,
  config: { ..._.config, [k]: value }
});

export interface Suite<R> {
  _R: R;
  _tag: "suite";
  name: string;
  specs: Spec<R>[];
}

export const testM = (name: string) => <R, E>(eff: T.Effect<R, E, void>): Spec<R> => ({
  _R: undefined as any,
  _tag: "test",
  name,
  eff,
  config: {}
});

export type Spec<R> = Test<R> | Suite<R>;

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

export const getTimeout = getConfigValue(TimeoutURI);
export const setTimeout = setConfigValue(TimeoutURI);

export const getRetry = getConfigValue(RetryURI);
export const setRetry = setConfigValue(RetryURI)(true);

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

export const patch = <R>(f: (_: Test<R>) => Test<R>) => (s: Spec<R>): Spec<R> => {
  switch (s._tag) {
    case "test":
      return f(s);
    case "suite":
      return {
        ...s,
        specs: s.specs.map(patch(f))
      };
  }
};

export type Aspect = <R>(Spec: Spec<R>) => Spec<R>;

export const withTimeout = (n: number): Aspect => (Spec) =>
  pipe(
    Spec,
    patch((_) => pipe(getTimeout(_), (t) => pipe(_, setTimeout(O.toUndefined(t) || n))))
  );

export const withRetryPolicy = (retryPolicy: RetryPolicy): Aspect => (Spec) =>
  pipe(
    Spec,
    patch((_) =>
      setRetry({
        ..._,
        eff: pipe(_, getRetry, O.isSome)
          ? _.eff
          : R.retrying(
              T.pure(retryPolicy),
              () => _.eff,
              (x) => T.pure(x._tag !== "Done")
            )
      })
    )
  );
