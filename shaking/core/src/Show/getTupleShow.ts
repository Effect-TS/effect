import type { Show } from "./Show"

/**
 * @since 2.0.0
 */
export function getTupleShow<T extends ReadonlyArray<Show<any>>>(
  ...shows: T
): Show<
  {
    [K in keyof T]: T[K] extends Show<infer A> ? A : never
  }
> {
  return {
    show: (t) => `[${t.map((a, i) => shows[i].show(a)).join(", ")}]`
  }
}
