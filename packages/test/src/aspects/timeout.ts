import * as O from "fp-ts/lib/Option"
import { pipe } from "fp-ts/lib/pipeable"

import { getConfigValue, setConfigValue } from "../config"
import { Aspect, patch } from "../def"

export const TimeoutURI = "@matechs/test/TimeoutURI"

declare module "../config" {
  interface TestConfig {
    [TimeoutURI]: number
  }
}

export const getTimeout = getConfigValue(TimeoutURI)
export const setTimeout = setConfigValue(TimeoutURI)

export const withTimeout = (n: number): Aspect => (Spec) =>
  pipe(
    Spec,
    patch((_) => pipe(getTimeout(_), (t) => pipe(_, setTimeout(O.toUndefined(t) || n))))
  )
