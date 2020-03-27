import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { getConfigValue, setConfigValue } from "../config";
import { Aspect, patch } from "../def";

export const SkipURI = "@matechs/test/SkipURI";

declare module "../config" {
  interface TestConfig {
    [SkipURI]: boolean;
  }
}

export const getSkip = getConfigValue(SkipURI);
export const setSkip = setConfigValue(SkipURI);

export const withSkip = (skip: boolean): Aspect => (Spec) =>
  pipe(
    Spec,
    patch((_) => pipe(getSkip(_), (t) => pipe(_, setSkip(O.getOrElse(() => skip)(t)))))
  );

export const withEnvFilter = (key: string) => (f: (_: O.Option<string>) => boolean): Aspect => (Spec) =>
  pipe(
    Spec,
    patch((_) =>
      pipe(getSkip(_), (t) =>
        pipe(_, setSkip(O.getOrElse(() => pipe(O.fromNullable(process ? process.env[key] : null), (x) => !f(x)))(t)))
      )
    )
  );
