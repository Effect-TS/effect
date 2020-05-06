import * as O from "fp-ts/lib/Option"
import { pipe } from "fp-ts/lib/pipeable"

import { Test } from "./def"

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TestConfig {}

export const getConfigValue = <K extends keyof TestConfig>(k: K) => <R>(_: Test<R>) =>
  pipe(
    O.fromNullable(_.config[k]),
    O.map((x) => x as TestConfig[K])
  )

export const setConfigValue = <K extends keyof TestConfig>(k: K) => (
  value: TestConfig[K]
) => <R>(_: Test<R>): Test<R> => ({
  ..._,
  config: { ..._.config, [k]: value }
})
