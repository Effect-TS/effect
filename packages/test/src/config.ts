import { Test } from "./def";
import { pipe } from "fp-ts/lib/pipeable";
import * as O from "fp-ts/lib/Option";

export interface TestConfig {}

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
