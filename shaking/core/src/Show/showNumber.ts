import type { Show } from "./Show"

/**
 * @since 2.0.0
 */
export const showNumber: Show<number> = {
  show: (a) => JSON.stringify(a)
}
