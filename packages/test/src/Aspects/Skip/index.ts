import { getConfigValue, setConfigValue } from "../../Config"
import { Aspect, patch } from "../../Def"

import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"

export const SkipURI = "@matechs/test/SkipURI"

declare module "../../Config" {
  interface TestConfig {
    [SkipURI]: boolean
  }
}

export const getSkip = getConfigValue(SkipURI)
export const setSkip = setConfigValue(SkipURI)

export const withSkip = (skip: boolean): Aspect => (Spec) =>
  pipe(
    Spec,
    patch((_) => pipe(getSkip(_), (t) => pipe(_, setSkip(O.getOrElse(() => skip)(t)))))
  )

export const withEnvFilter = (key: string) => (
  f: (_: O.Option<string>) => boolean
): Aspect => (Spec) =>
  pipe(
    Spec,
    patch((_) =>
      pipe(getSkip(_), (t) =>
        pipe(
          _,
          setSkip(
            O.getOrElse(() =>
              pipe(O.fromNullable(process ? process.env[key] : null), (x) => !f(x))
            )(t)
          )
        )
      )
    )
  )
