import { effect as T, retry as R } from "@matechs/effect";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { RetryPolicy } from "retry-ts";
import { getConfigValue, setConfigValue } from "../config";
import { patch, AspectE } from "../def";

export const RetryURI = "@matechs/test/RetryURI";

declare module "../config" {
  interface TestConfig {
    [RetryURI]: boolean;
  }
}

export const getRetry = getConfigValue(RetryURI);
export const setRetry = setConfigValue(RetryURI)(true);

export const withRetryPolicy = (retryPolicy: RetryPolicy): AspectE<T.AsyncRT> => (Spec) =>
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
