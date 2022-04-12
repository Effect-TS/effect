export type ShapeFn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends (
      ...args: infer ARGS
    ) => Sync<infer R, infer E, infer A> ? ((...args: ARGS) => Sync<R, E, A>) extends T[k] ? k
    : never
      : never;
  }[keyof T]
>;

export type ShapeCn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends Sync<any, any, any> ? k : never;
  }[keyof T]
>;

export type DerivedLifted<
  T,
  Fns extends keyof ShapeFn<T>,
  Cns extends keyof ShapeCn<T>,
  Values extends keyof T
> =
  & {
    [k in Fns]: T[k] extends (...args: infer ARGS) => Sync<infer R, infer E, infer A>
      ? (...args: ARGS) => Sync<R & Has<T>, E, A>
      : never;
  }
  & {
    [k in Cns]: T[k] extends Sync<infer R, infer E, infer A> ? Sync<R & Has<T>, E, A>
      : never;
  }
  & {
    [k in Values]: Sync<Has<T>, never, T[k]>;
  };

/**
 * @tsplus static ets/Sync/Ops deriveLifted
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
    const ret = {} as any;

    for (const k of functions) {
      // @ts-expect-error
      ret[k] = (...args: any[]) => Sync.serviceWithSync(S)((h) => h[k](...args));
    }

    for (const k of constants) {
      // @ts-expect-error
      ret[k] = Sync.serviceWithSync(S)((h) => h[k]);
    }

    for (const k of values) {
      ret[k] = Sync.serviceWith(S)((h) => h[k]);
    }

    return ret as any;
  };
}

export type DerivedAccessSync<T, Gens extends keyof T> = {
  [k in Gens]: <R_, E_, A_>(
    f: (_: T[k]) => Sync<R_, E_, A_>,
    __trace?: string
  ) => Sync<R_ & Has<T>, E_, A_>;
};

/**
 * @tsplus static ets/Sync/Ops deriveAccessSync
 */
export function deriveAccessSync<T>(S: Tag<T>) {
  return <Gens extends keyof T = never>(generics: Gens[]): DerivedAccessSync<T, Gens> => {
    const ret = {} as any;

    for (const k of generics) {
      ret[k] = (f: any) => Sync.serviceWithSync(S)((h) => f(h[k]));
    }

    return ret as any;
  };
}

export type DerivedAccess<T, Gens extends keyof T> = {
  [k in Gens]: <A_>(f: (_: T[k]) => A_, __tsplusTrace?: string) => Sync<Has<T>, never, A_>;
};

/**
 * @tsplus static ets/Sync/Ops deriveAccess
 */
export function deriveAccess<T>(
  S: Tag<T>
) {
  return <Gens extends keyof T = never>(generics: Gens[]): DerivedAccess<T, Gens> => {
    const ret = {} as any;

    for (const k of generics) {
      ret[k] = (f: any) => Sync.serviceWith(S)((h) => f(h[k]));
    }

    return ret as any;
  };
}
