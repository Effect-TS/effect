import { getConfigValue, setConfigValue } from "../../Config"
import { patch, Aspect } from "../../Def"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"
import * as R from "@matechs/core/Retry"

export const RetryURI = "@matechs/test/RetryURI"

declare module "../../Config" {
  interface TestConfig {
    [RetryURI]: boolean
  }
}

export const getRetry = getConfigValue(RetryURI)
export const setRetry = setConfigValue(RetryURI)(true)

export const withRetryPolicy = (retryPolicy: R.RetryPolicy): Aspect => (Spec) =>
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
  )
