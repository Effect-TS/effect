import type { ReadonlyRecord } from "../Readonly/Record"

import type { Show } from "./Show"

/**
 * @since 2.0.0
 */
export function getStructShow<O extends ReadonlyRecord<string, any>>(
  shows: {
    [K in keyof O]: Show<O[K]>
  }
): Show<O> {
  return {
    show: (s) =>
      `{ ${Object.keys(shows)
        .map((k) => `${k}: ${shows[k].show(s[k])}`)
        .join(", ")} }`
  }
}
