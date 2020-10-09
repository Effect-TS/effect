import type { Has, Tag } from "../Has"
import { chain_ } from "./core"
import type { Effect } from "./effect"
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

export type ShapeGen<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends (
      ...args: infer ARGS
    ) => Effect<infer R, infer E, infer A>
      ? ((...args: ARGS) => Effect<R, E, A>) extends T[k]
        ? never
        : k
      : T[k] extends (...args: any[]) => any
      ? k
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
      [k in keyof T]: T[k] extends (...args: any[]) => any ? k : never
    }[keyof T]
  | {
      [k in keyof T]: T[k] extends Effect<any, any, any> ? k : never
    }[keyof T]
>

export type DerivedAccess<
  T,
  Fns extends keyof ShapeFn<T>,
  Cns extends keyof ShapeCn<T>,
  Values extends keyof ShapePu<T>,
  Gens extends keyof ShapeGen<T>
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
  } &
  {
    [k in Gens]: <R_, E_, A_>(
      f: (_: T[k]) => Effect<R_, E_, A_>
    ) => Effect<R_ & Has<T>, E_, A_>
  }

export function derive<T>(H: Tag<T>) {
  return <
    Fns extends keyof ShapeFn<T> = never,
    Cns extends keyof ShapeCn<T> = never,
    Values extends keyof ShapePu<T> = never,
    Gens extends keyof ShapeGen<T> = never
  >(
    functions: Fns[],
    constants: Cns[],
    values: Values[],
    generics: Gens[]
  ): DerivedAccess<T, Fns, Cns, Values, Gens> => {
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

    for (const k of generics) {
      ret[k] = (f: any) => accessServiceM(H)((h) => f(h[k]))
    }

    return ret as any
  }
}

export function apply<R, E, A>(self: Effect<R, E, A>) {
  return <R2, E2, A2>(f: (a: A) => Effect<R2, E2, A2>) => chain_(self, f)
}
