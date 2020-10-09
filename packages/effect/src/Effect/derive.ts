import type { Has, Tag } from "../Has"
import type { Effect } from "."
import { accessServiceM } from "./has"

export type ShapeFn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends (...args: any[]) => Effect<any, any, any> ? k : never
  }[keyof T]
>

export type ShapeCn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends Effect<any, any, any> ? k : never
  }[keyof T]
>

export type DerivedAccess<T> = {
  [k in keyof ShapeFn<T>]: T[k] extends (
    ...args: infer ARGS
  ) => Effect<infer R, infer E, infer A>
    ? (...args: ARGS) => Effect<R & Has<T>, E, A>
    : never
} &
  {
    [k in keyof ShapeCn<T>]: T[k] extends Effect<infer R, infer E, infer A>
      ? Effect<R & Has<T>, E, A>
      : never
  }

export function derive<T, Fns extends keyof ShapeFn<T>, Cns extends keyof ShapeCn<T>>(
  H: Tag<T>,
  Fns: Fns[],
  Cns: Cns[]
): DerivedAccess<T> {
  const ret = {} as any

  for (const k of Fns) {
    ret[k] = (...args: any[]) => accessServiceM(H)((h) => h[k](...args))
  }

  for (const k of Cns) {
    ret[k] = accessServiceM(H)((h) => h[k])
  }

  return ret as any
}
