/* adapted from https://github.com/gcanti/fp-ts */

import type { ReadonlyRecord } from "../Record"

export interface Show<A> {
  readonly show: (a: A) => string
}

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

export const showBoolean: Show<boolean> = {
  show: (a) => JSON.stringify(a)
}

export const showNumber: Show<number> = {
  show: (a) => JSON.stringify(a)
}

export const showString: Show<string> = {
  show: (a) => JSON.stringify(a)
}
