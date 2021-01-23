// trace: on
// tracingModule: ../../src/Tracing

import * as T from "../../src/Effect"
import { tag } from "../../src/Has"
import type { _A } from "../../src/Utils"

/**
 * @module CustomService
 */
export const makeCustomService = T.succeed({
  /**
   * @module CustomService
   */
  printTrace<A>(a: A) {
    return T.chain_(T.unit, () => T.succeed(a))
  }
})

export interface CustomService extends _A<typeof makeCustomService> {}

export const CustomService = tag<CustomService>()
