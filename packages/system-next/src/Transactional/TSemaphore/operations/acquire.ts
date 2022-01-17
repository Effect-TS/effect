import type { STM } from "../../STM"
import type { TSemaphore } from "../definition"
import { acquireN_ } from "./acquireN"

/**
 * Acquires a single permit in transactional context.
 */
export function acquire(self: TSemaphore): STM<unknown, never, void> {
  return acquireN_(self, 1)
}
