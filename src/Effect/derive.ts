import type { Constructor, Has, Tag } from "../Has"
import type { Effect } from "."
import { accessServiceM } from "./has"

type Shape<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends (...args: any[]) => Effect<any, any, any> ? k : never
  }[keyof T]
>

export type DerivedAccess<T> = {
  [k in keyof Shape<T>]: T[k] extends (
    ...args: infer ARGS
  ) => Effect<infer R, infer E, infer A>
    ? (...args: ARGS) => Effect<R & Has<T>, E, A>
    : never
}

export function derive<T>(H: Tag<T>, C: Constructor<T>): DerivedAccess<T> {
  const ret = {}

  for (const k of Object.keys(C.prototype)) {
    if (typeof C.prototype[k] === "function") {
      ret[k] = (...args: any[]) => accessServiceM(H)((h) => h[k](...args))
    }
  }

  return ret as any
}
