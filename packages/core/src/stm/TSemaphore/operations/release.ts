import type { STM } from "../../STM"
import type { TSemaphore } from "../definition"
import { releaseN_ } from "./releaseN"

/**
 * Releases a single permit in a transactional context.
 */
export function release(self: TSemaphore): STM<unknown, never, void> {
  return releaseN_(self, 1)
}
