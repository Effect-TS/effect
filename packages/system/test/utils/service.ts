import * as T from "../../src/Effect"
import { tag } from "../../src/Has"
import type { _A } from "../../src/Utils"

export const makeCustomService = T.succeed({
  /**
   * @module CustomService
   * @trace 0
   */
  printTrace<A>(f: () => A) {
    return T.effectTotal(f)
  }
})

export interface CustomService extends _A<typeof makeCustomService> {}

export const CustomService = tag<CustomService>()
