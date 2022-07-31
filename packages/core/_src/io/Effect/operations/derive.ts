export type ShapeFn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends (
      ...args: infer ARGS
    ) => Effect<infer R, infer E, infer A> ? ((...args: ARGS) => Effect<R, E, A>) extends T[k] ? k
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

export type DerivedLifted<
  T,
  Fns extends keyof ShapeFn<T>,
  Cns extends keyof ShapeCn<T>,
  Values extends keyof T
> =
  & {
    [k in Fns]: T[k] extends (...args: infer ARGS) => Effect<infer R, infer E, infer A>
      ? (...args: ARGS) => Effect<R | T, E, A>
      : never
  }
  & {
    [k in Cns]: T[k] extends Effect<infer R, infer E, infer A> ? Effect<R | T, E, A>
      : never
  }
  & {
    [k in Values]: Effect<T, never, T[k]>
  }

/**
 * @tsplus static effect/core/io/Effect.Ops deriveLifted
 */
export function deriveLifted<T>(
  S: Tag<T>
): <
  Fns extends keyof ShapeFn<T> = never,
  Cns extends keyof ShapeCn<T> = never,
  Values extends keyof T = never
>(
  functions: Fns[],
  effects: Cns[],
  values: Values[]
) => DerivedLifted<T, Fns, Cns, Values> {
  return (functions, constants, values) => {
    const ret = {} as any

    for (const k of functions) {
      ret[k] = (...args: any[]) => Effect.serviceWithEffect(S, (h) => (h[k] as any)(...args))
    }

    for (const k of constants) {
      ret[k] = Effect.serviceWithEffect(S, (h) => h[k] as any)
    }

    for (const k of values) {
      ret[k] = Effect.serviceWith(S, (h) => h[k])
    }

    return ret as any
  }
}

export type DerivedAccessM<T, Gens extends keyof T> = {
  [k in Gens]: <R_, E_, A_>(f: (_: T[k]) => Effect<R_, E_, A_>) => Effect<R_ | T, E_, A_>
}

/**
 * @tsplus static effect/core/io/Effect.Ops deriveAccessEffect
 */
export function deriveAccessEffect<T>(
  S: Tag<T>
): <Gens extends keyof T = never>(generics: Gens[]) => DerivedAccessM<T, Gens> {
  return (generics) => {
    const ret = {} as any

    for (const k of generics) {
      ret[k] = (f: any, trace?: string) => Effect.serviceWithEffect(S, (h) => f(h[k]))
    }

    return ret as any
  }
}

export type DerivedAccess<T, Gens extends keyof T> = {
  [k in Gens]: <A_>(f: (_: T[k]) => A_) => Effect<T, never, A_>
}

/**
 * @tsplus static effect/core/io/Effect.Ops deriveAccess
 */
export function deriveAccess<T>(
  S: Tag<T>
): <Gens extends keyof T = never>(generics: Gens[]) => DerivedAccess<T, Gens> {
  return (generics) => {
    const ret = {} as any

    for (const k of generics) {
      ret[k] = (f: any, trace?: string) => Effect.serviceWith(S, (h) => f(h[k]))
    }

    return ret as any
  }
}
