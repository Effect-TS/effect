import * as HKT from "../HKT"

type KindFromObj<F extends HKT.HKT, __> = HKT.Kind<
  F,
  HKT.Infer<F, "X", __>,
  HKT.Infer<F, "I", __>,
  HKT.Infer<F, "R", __>,
  HKT.Infer<F, "E", __>,
  HKT.Infer<F, "A", __>
>

export interface MatchFn<F extends HKT.HKT, N extends string> {
  <
    X extends { [tag in N]: string },
    K extends {
      [k in X[N]]: (
        _: Extract<X, { [tag in N]: k }>,
        __: Extract<X, { [tag in N]: k }>
      ) => HKT.Kind<F, any, any, any, any, any>
    }
  >(
    matcher: K
  ): (_: X) => KindFromObj<F, { [k in keyof K]: ReturnType<K[k]> }[keyof K]>

  <
    X extends { [tag in N]: string },
    K extends Partial<{
      [k in X[N]]: (
        _: Extract<X, { [tag in N]: k }>,
        __: Extract<X, { [tag in N]: k }>
      ) => HKT.Kind<F, any, any, any, any, any>
    }>,
    Ret extends HKT.Kind<F, any, any, any, any, any>
  >(
    matcher: K,
    def: (
      _: Exclude<X, { [tag in N]: keyof K }>,
      __: Exclude<X, { [tag in N]: keyof K }>
    ) => Ret
  ): (_: X) => KindFromObj<
    F,
    | {
        [k in keyof K]: K[k] extends (...args: any) => any ? ReturnType<K[k]> : never
      }[keyof K]
    | Ret
  >
}

export interface MatchInFn<F extends HKT.HKT, N extends string> {
  <X extends { [tag in N]: string }>(): {
    <
      K extends {
        [k in X[N]]: (
          _: Extract<X, { [tag in N]: k }>,
          __: Extract<X, { [tag in N]: k }>
        ) => HKT.Kind<F, any, any, any, any, any>
      }
    >(
      matcher: K
    ): (_: X) => KindFromObj<F, { [k in keyof K]: ReturnType<K[k]> }[keyof K]>

    <
      K extends Partial<{
        [k in X[N]]: (
          _: Extract<X, { [tag in N]: k }>,
          __: Extract<X, { [tag in N]: k }>
        ) => HKT.Kind<F, any, any, any, any, any>
      }>,
      Ret extends HKT.Kind<F, any, any, any, any, any>
    >(
      matcher: K,
      def: (
        _: Exclude<X, { [tag in N]: keyof K }>,
        __: Exclude<X, { [tag in N]: keyof K }>
      ) => Ret
    ): (_: X) => KindFromObj<
      F,
      | {
          [k in keyof K]: K[k] extends (...args: any) => any ? ReturnType<K[k]> : never
        }[keyof K]
      | Ret
    >
  }
}

export interface MatchMorphFn<
  F extends HKT.HKT,
  N extends string,
  X extends { [tag in N]: string }
> {
  <
    K extends {
      [k in X[N]]: (
        _: Extract<X, { [tag in N]: k }>,
        __: Extract<X, { [tag in N]: k }>
      ) => HKT.Kind<F, any, any, any, any, any>
    }
  >(
    matcher: K
  ): (_: X) => KindFromObj<F, { [k in keyof K]: ReturnType<K[k]> }[keyof K]>

  <
    X extends { [tag in N]: string },
    K extends Partial<{
      [k in X[N]]: (
        _: Extract<X, { [tag in N]: k }>,
        __: Extract<X, { [tag in N]: k }>
      ) => HKT.Kind<F, any, any, any, any, any>
    }>,
    Ret extends HKT.Kind<F, any, any, any, any, any>
  >(
    matcher: K,
    def: (
      _: Exclude<X, { [tag in N]: keyof K }>,
      __: Exclude<X, { [tag in N]: keyof K }>
    ) => Ret
  ): (_: X) => KindFromObj<
    F,
    | {
        [k in keyof K]: K[k] extends (...args: any) => any ? ReturnType<K[k]> : never
      }[keyof K]
    | Ret
  >
}

export const matchers = <F extends HKT.HKT>() => {
  function match<N extends string>(tag: N): MatchFn<F, N> {
    return (...args: any[]) => {
      return (_: any) => {
        const matcher = args[0][_[tag]]
        return matcher ? matcher(_, _) : args[1](_, _)
      }
    }
  }

  function matchIn<N extends string>(tag: N): MatchInFn<F, N> {
    return () =>
      (...args: any[]) => {
        return (_: any) => {
          const matcher = args[0][_[tag]]
          return matcher ? matcher(_, _) : args[1](_, _)
        }
      }
  }

  function matchMorph<N extends string, X extends { [tag in N]: string }>(MorphADT: {
    tag: N
    _A: X
  }): MatchMorphFn<F, N, X> {
    return (...args: any[]) => {
      return (_: any) => {
        const matcher = args[0][_[MorphADT.tag]]
        return matcher ? matcher(_, _) : args[1](_, _)
      }
    }
  }

  const matchTagIn = matchIn("_tag")

  const matchTag = match("_tag")

  return {
    match,
    matchTag,
    matchIn,
    matchTagIn,
    matchMorph
  }
}
