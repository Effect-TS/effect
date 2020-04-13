import * as T from "./effect";
import * as TE from "./eff";
import { function as F, pipeable as P } from "fp-ts";
import { FunctionN } from "fp-ts/lib/function";

export type Patched<A, B> = B extends F.FunctionN<
  infer ARG,
  TE.Eff<infer S, infer R, infer E, infer RET>
>
  ? F.FunctionN<ARG, TE.Eff<S, R, E, RET>> extends B
    ? F.FunctionN<ARG, TE.Eff<S, R & A, E, RET>>
    : "polymorphic signature not supported"
  : B extends F.FunctionN<infer ARG, T.Effect<infer R, infer E, infer RET>>
  ? F.FunctionN<ARG, T.Effect<R, E, RET>> extends B
    ? F.FunctionN<ARG, T.Effect<R & A, E, RET>>
    : "polymorphic signature not supported"
  : B extends TE.Eff<infer S, infer R, infer E, infer RET>
  ? TE.Eff<S, R, E, RET> extends B
    ? TE.Eff<S, R & A, E, RET>
    : never
  : B extends T.Effect<infer R, infer E, infer RET>
  ? T.Effect<R, E, RET> extends B
    ? T.Effect<R & A, E, RET>
    : never
  : never;

export type Derived<A extends ModuleShape<A>> = {
  [k in keyof A]: {
    [h in keyof A[k]]: Patched<A, A[k][h]>;
  };
};

export function access<A extends ModuleShape<A>>(sp: ModuleSpec<A>): Derived<A> {
  const derived = {} as any;
  const a = sp[specURI] as any;

  for (const s of Reflect.ownKeys(a)) {
    derived[s] = {};

    for (const k of Object.keys(a[s])) {
      if (typeof a[s][k] === "function") {
        derived[s][k] = (...args: any[]) => T.accessM((r: any) => r[s][k](...args));
      } else {
        derived[s][k] = T.accessM((r: any) => r[s][k]);
      }
    }
  }

  return derived;
}

export type ModuleShape<M> = {
  [k in keyof M]: {
    [h in Exclude<keyof M[k], symbol>]:
      | F.FunctionN<any, T.Effect<any, any, any>>
      | F.FunctionN<any, TE.Eff<any, any, any, any>>
      | T.Effect<any, any, any>
      | TE.Eff<any, any, any, any>;
  } &
    {
      [h in Extract<keyof M[k], symbol>]: never;
    };
};

export const specURI = "@matechs/effect/freeEnv/specURI";

export interface ModuleSpec<M> {
  [specURI]: ModuleShape<M>;
}

export function define<T extends ModuleShape<T>>(m: T): ModuleSpec<T> {
  return { [specURI]: m };
}

export function cn<T extends TE.Eff<any, any, any, any> | T.Effect<any, any, any>>(): T {
  return {} as T;
}

export function fn<
  T extends F.FunctionN<any, TE.Eff<any, any, any, any> | T.Effect<any, any, any>>
>(): T {
  // tslint:disable-next-line: no-empty
  return (() => {}) as any;
}

export type Implementation<M> = {
  [k in keyof M]: {
    [h in keyof M[k]]: M[k][h] extends F.FunctionN<
      infer ARG,
      TE.Eff<never, infer _R, infer E, infer A>
    >
      ? F.FunctionN<ARG, TE.Eff<never, any, E, A>>
      : M[k][h] extends F.FunctionN<infer ARG, T.Effect<infer _R, infer E, infer A>>
      ? F.FunctionN<ARG, T.Effect<any, E, A>>
      : M[k][h] extends TE.Eff<never, infer _R, infer E, infer A>
      ? TE.Eff<never, any, E, A>
      : M[k][h] extends T.Effect<infer _R, infer E, infer A>
      ? T.Effect<any, E, A>
      : never;
  };
};

export type InferR<F> = F extends (...args: any[]) => T.Effect<infer Q, any, any>
  ? Q
  : F extends T.Effect<infer Q, any, any>
  ? Q
  : never;

type EnvOf<F> = F extends F.FunctionN<infer _ARG, T.Effect<infer R, infer _E, infer _A>>
  ? R
  : F extends T.Effect<infer R, infer _E, infer _A>
  ? R
  : never;

type OnlyNew<M extends ModuleShape<M>, I extends Implementation<M>> = {
  [k in keyof I & keyof M]: {
    [h in keyof I[k] & keyof M[k]]: I[k][h] extends F.FunctionN<
      infer ARG,
      T.Effect<infer R & EnvOf<M[k][h]>, infer E, infer A>
    >
      ? F.FunctionN<ARG, T.Effect<R, E, A>>
      : I[k][h] extends T.Effect<infer R & EnvOf<M[k][h]>, infer E, infer A>
      ? T.Effect<R, E, A>
      : never;
  };
};

export type ImplementationEnv<I> = UnionToIntersection<
  {
    [k in keyof I]: {
      [h in keyof I[k]]: I[k][h] extends FunctionN<any, infer K>
        ? K extends T.Effect<infer R, any, any>
          ? unknown extends R
            ? never
            : R
          : never
        : I[k][h] extends T.Effect<infer R, any, any>
        ? unknown extends R
          ? never
          : R
        : never;
    }[keyof I[k]];
  }[keyof I]
>;

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export function providing<
  M extends ModuleShape<M>,
  S extends ModuleSpec<M>,
  I extends Implementation<M>
>(s: S, a: I, env: ImplementationEnv<OnlyNew<M, I>>): TypeOf<S> {
  const r = {} as any;

  for (const sym of Reflect.ownKeys((s as any)[specURI])) {
    r[sym] = {};

    for (const entry of Object.keys((s as any)[specURI][sym])) {
      if (typeof (a as any)[sym][entry] === "function") {
        r[sym][entry] = (...args: any[]) => T.provideSO(env)((a as any)[sym][entry](...args));
      } else if (typeof (a as any)[sym][entry] === "object") {
        r[sym][entry] = T.provideSO(env)((a as any)[sym][entry]);
      }
    }
  }

  return r;
}

export function implementEff<S extends ModuleSpec<any>>(s: S) {
  return <I extends Implementation<TypeOf<S>>>(
    i: I
  ): TE.Provider<ImplementationEnv<OnlyNew<TypeOf<S>, I>>, TypeOf<S>, never, never> => (eff) =>
    TE.accessM((e: ImplementationEnv<OnlyNew<TypeOf<S>, I>>) =>
      P.pipe(eff, TE.provideS(providing(s, i, e)))
    );
}

export function implement<S extends ModuleSpec<any>>(s: S) {
  return <I extends Implementation<TypeOf<S>>>(
    i: I
  ): T.Provider<ImplementationEnv<OnlyNew<TypeOf<S>, I>>, TypeOf<S>, never> => (eff) =>
    T.accessM((e: ImplementationEnv<OnlyNew<TypeOf<S>, I>>) =>
      P.pipe(eff, T.provideS(providing(s, i, e)))
    );
}

export function implementWithEff<SW = unknown, RW = unknown, EW = never, AW = unknown>(
  w: TE.Eff<SW, RW, EW, AW>
) {
  return <S extends ModuleSpec<any>>(s: S) => <I extends Implementation<TypeOf<S>>>(
    i: (r: AW) => I
  ): TE.Provider<ImplementationEnv<OnlyNew<TypeOf<S>, I>> & RW, TypeOf<S>, SW, EW> => (eff) =>
    TE.eff.chain(w as TE.Eff<SW, RW, EW, AW>, (r) =>
      TE.accessM((e: ImplementationEnv<OnlyNew<TypeOf<S>, I>>) =>
        P.pipe(eff, TE.provideS(providing(s, i(r), e)))
      )
    );
}

export function implementWith<RW = unknown, EW = never, AW = unknown>(w: T.Effect<RW, EW, AW>) {
  return <S extends ModuleSpec<any>>(s: S) => <I extends Implementation<TypeOf<S>>>(
    i: (r: AW) => I
  ): T.Provider<ImplementationEnv<OnlyNew<TypeOf<S>, I>> & RW, TypeOf<S>, EW> => (eff) =>
    T.effect.chain(w, (r) =>
      T.accessM((e: ImplementationEnv<OnlyNew<TypeOf<S>, I>>) =>
        P.pipe(eff, T.provideS(providing(s, i(r), e)))
      )
    );
}

export function instance<M extends ModuleShape<M>, S extends ModuleSpec<M>>(_: S) {
  return (m: TypeOf<S>) => m;
}

export type MergeSpec<S> = {
  [k in keyof S]: ModuleSpec<any>;
};

export type ExtractShape<M> = M extends ModuleShape<infer A> ? A : never;
export type TypeOf<M> = M extends ModuleSpec<infer A> ? A : never;

export type Merged<S> = S extends {
  [k in keyof S]: {
    [specURI]: infer X;
  };
}
  ? ModuleSpec<UnionToIntersection<ExtractShape<X>>>
  : never;

export function merge<S extends MergeSpec<S>>(s: S): Merged<S> {
  const m =
    {
      [specURI]: {}
    } as Merged<S>;

  for (const k of Reflect.ownKeys(s)) {
    m[specURI] = {
      ...m[specURI],
      ...(s as any)[k][specURI]
    };
  }

  return m;
}

export const opaque = <A extends ModuleShape<A>>() => <B extends A, S extends ModuleSpec<B>>(
  _: S
): ModuleSpec<A> => _;
