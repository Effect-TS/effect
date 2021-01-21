import type { Base, Infer, Kind, URIS } from "../HKT"

export function matchers<URI extends URIS, C>(_: Base<URI, C>) {
  function match<N extends string>(
    tag: N
  ): {
    <
      X extends {
        [tag in N]: string
      },
      K extends {
        [k in X[N]]: (
          _: Extract<
            X,
            {
              [tag in N]: k
            }
          >
        ) => Kind<URI, C, any, any, any, any, any, any, any, any, any, any>
      }
    >(
      matcher: K
    ): (
      _: X
    ) => Kind<
      URI,
      C,
      Infer<
        URI,
        C,
        "N",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "K",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "Q",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "W",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "X",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "I",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "S",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "R",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "E",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "A",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >
    >
    <
      X extends {
        [tag in N]: string
      },
      K extends Partial<
        {
          [k in X[N]]: (
            _: Extract<
              X,
              {
                [tag in N]: k
              }
            >
          ) => Kind<URI, C, any, any, any, any, any, any, any, any, any, any>
        }
      >,
      Ret extends Kind<URI, C, any, any, any, any, any, any, any, any, any, any>
    >(
      matcher: K,
      def: (_: Exclude<X, { [tag in N]: keyof K }>) => Ret
    ): (
      _: X
    ) => Kind<
      URI,
      C,
      Infer<
        URI,
        C,
        "N",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "K",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "Q",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "W",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "X",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "I",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "S",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "R",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "E",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "A",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >
    >
  } {
    return (...args: any[]) => {
      return (_: any) => {
        const matcher = args[0][_[tag]]
        return matcher ? matcher(_) : args[1](_)
      }
    }
  }

  function matchIn<N extends string>(
    tag: N
  ): <
    X extends {
      [tag in N]: string
    }
  >() => {
    <
      K extends {
        [k in X[N]]: (
          _: Extract<
            X,
            {
              [tag in N]: k
            }
          >
        ) => Kind<URI, C, any, any, any, any, any, any, any, any, any, any>
      }
    >(
      matcher: K
    ): (
      _: X
    ) => Kind<
      URI,
      C,
      Infer<
        URI,
        C,
        "N",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "K",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "Q",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "W",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "X",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "I",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "S",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "R",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "E",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >,
      Infer<
        URI,
        C,
        "A",
        {
          [k in keyof K]: ReturnType<K[k]>
        }[keyof K]
      >
    >
    <
      K extends Partial<
        {
          [k in X[N]]: (
            _: Extract<
              X,
              {
                [tag in N]: k
              }
            >
          ) => Kind<URI, C, any, any, any, any, any, any, any, any, any, any>
        }
      >,
      Ret extends Kind<URI, C, any, any, any, any, any, any, any, any, any, any>
    >(
      matcher: K,
      def: (_: Exclude<X, { [tag in N]: keyof K }>) => Ret
    ): (
      _: X
    ) => Kind<
      URI,
      C,
      Infer<
        URI,
        C,
        "N",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "K",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "Q",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "W",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "X",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "I",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "S",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "R",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "E",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >,
      Infer<
        URI,
        C,
        "A",
        | {
            [k in keyof K]: K[k] extends (...args: any) => any
              ? ReturnType<K[k]>
              : never
          }[keyof K]
        | Ret
      >
    >
  } {
    return () => (...args: any[]) => {
      return (_: any) => {
        const matcher = args[0][_[tag]]
        return matcher ? matcher(_) : args[1](_)
      }
    }
  }

  const matchTagIn = matchIn("_tag")

  const matchTag = match("_tag")

  return {
    match,
    matchTag,
    matchIn,
    matchTagIn
  }
}
