import * as T from "../Effect"
import * as E from "../Either"
import { makeRef } from "../Ref"

import { Semaphore } from "./Semaphore"
import { State } from "./State"
import { makeSemaphoreImpl } from "./makeSemaphoreImpl"
import { sanityCheck } from "./sanityCheck"

/**
 * Allocate a semaphore.
 *
 * @param n the number of permits
 * This must be non-negative
 */
export function makeSemaphore(n: number): T.Sync<Semaphore> {
  return T.applySecond(
    sanityCheck(n),
    T.map_(makeRef(E.right(n) as State), makeSemaphoreImpl)
  )
}
