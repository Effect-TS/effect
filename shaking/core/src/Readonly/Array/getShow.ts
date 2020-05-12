import type { Show } from "../../Show"

/**
 * @since 2.5.0
 */
export function getShow<A>(S: Show<A>): Show<ReadonlyArray<A>> {
  return {
    show: (as) => `[${as.map(S.show).join(", ")}]`
  }
}
