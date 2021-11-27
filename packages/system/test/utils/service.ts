// trace: on
// tracingModule: ../../src/Tracing

import * as T from "../../src/Effect"
import { service, tag } from "../../src/Has"
import type { _A } from "../../src/Utils"

export const CustomServiceId = Symbol()

/**
 * @module CustomService
 */
export const makeCustomService = T.succeed(
  service(CustomServiceId, {
    /**
     * @module CustomService
     */
    printTrace<A>(a: A) {
      return T.chain_(T.unit, () => T.succeed(a))
    }
  })
)

export interface CustomService extends _A<typeof makeCustomService> {}

export const CustomService = tag<CustomService>(CustomServiceId)
