import type { Show } from "./Show"

/**
 * @since 2.0.0
 */
export const showString: Show<string> = {
  show: (a) => JSON.stringify(a)
}
