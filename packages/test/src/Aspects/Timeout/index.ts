import { getConfigValue, setConfigValue } from "../../Config"
import { Aspect, patch } from "../../Def"

import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"

export const TimeoutURI = "@matechs/test/TimeoutURI"

declare module "../../Config" {
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
