import type { TestAPI } from "vitest"
import * as V from "vitest"

/**
 * @tsplus type effect/core/test-utils/API
 */
export type API = TestAPI<{}>

export const it: API = V.it

/**
 * @tsplus static effect/core/test-utils/API effect
 */
export function effect<E, A>(name: string, self: LazyArg<Effect<TestEnvironment, E, A>>) {
  return it(
    name,
    () => Effect.suspendSucceed(self).provideLayer(TestEnvironment).unsafeRunPromise()
  )
}
