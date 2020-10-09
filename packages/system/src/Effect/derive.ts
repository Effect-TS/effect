import type { Has, Tag } from "../Has"
import type { Effect } from "."
import { accessService, accessServiceM } from "./has"

export type ShapeFn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends (
      ...args: infer ARGS
    ) => Effect<infer R, infer E, infer A>
      ? ((...args: ARGS) => Effect<R, E, A>) extends T[k]
        ? k
        : never
      : never
  }[keyof T]
>

export type ShapeCn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends Effect<any, any, any> ? k : never
  }[keyof T]
>

export type ShapePu<T> = Omit<
  T,
  | {
      [k in keyof T]: T[k] extends (...args: any[]) => Effect<any, any, any> ? k : never
    }[keyof T]
  | {
      [k in keyof T]: T[k] extends Effect<any, any, any> ? k : never
    }[keyof T]
>

export type DerivedAccess<
  T,
  Fns extends keyof ShapeFn<T>,
  Cns extends keyof ShapeCn<T>,
  Values extends keyof ShapePu<T>
> = {
  [k in Fns]: T[k] extends (...args: infer ARGS) => Effect<infer R, infer E, infer A>
    ? (...args: ARGS) => Effect<R & Has<T>, E, A>
    : never
} &
  {
    [k in Cns]: T[k] extends Effect<infer R, infer E, infer A>
      ? Effect<R & Has<T>, E, A>
      : never
  } &
  {
    [k in Values]: Effect<Has<T>, never, T[k]>
  }

export function derive<T>(H: Tag<T>) {
  return <
    Fns extends keyof ShapeFn<T> = never,
    Cns extends keyof ShapeCn<T> = never,
    Values extends keyof ShapePu<T> = never
  >(
    functions: Fns[],
    constants: Cns[],
    values: Values[]
  ): DerivedAccess<T, Fns, Cns, Values> => {
    const ret = {} as any

    for (const k of functions) {
      ret[k] = (...args: any[]) => accessServiceM(H)((h) => h[k](...args))
    }

    for (const k of constants) {
      ret[k] = accessServiceM(H)((h) => h[k])
    }

    for (const k of values) {
      ret[k] = accessService(H)((h) => h[k])
    }

    return ret as any
  }
}
