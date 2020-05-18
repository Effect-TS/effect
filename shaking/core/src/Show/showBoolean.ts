import type { Show } from "./Show"

/**
 * @since 2.0.0
 */
export const showBoolean: Show<boolean> = {
  show: (a) => JSON.stringify(a)
}
