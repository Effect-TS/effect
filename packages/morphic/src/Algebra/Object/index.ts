import type { AnyEnv, ConfigsForType, InterpreterURIS, Kind, Named } from "../../HKT"

export const ObjectURI = "ObjectURI" as const

export type ObjectURI = typeof ObjectURI

export interface InterfaceConfig<Props> {}
export interface PartialConfig<Props> {}
export interface BothConfig<Props, PropsPartial> {}

export type PropsKind<F extends InterpreterURIS, PropsA, PropsE, R> = {
  [k in keyof PropsA & keyof PropsE]: Kind<F, R, PropsA[k], PropsE[k]>
}

export interface AlgebraObjects<F extends InterpreterURIS, Env extends AnyEnv> {
  _F: F
  interface: <Props extends { [k in keyof Props]: Kind<F, Env, any, any> }>(
    props: Props,
    config?: Named<
      ConfigsForType<
        Env,
        Readonly<
          {
            [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
              ? E
              : never
          }
        >,
        Readonly<
          {
            [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
              ? A
              : never
          }
        >,
        InterfaceConfig<
          PropsKind<
            F,
            Readonly<
              {
                [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
                  ? E
                  : never
              }
            >,
            Readonly<
              {
                [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
                  ? A
                  : never
              }
            >,
            Env
          >
        >
      >
    >
  ) => Kind<
    F,
    Env,
    Readonly<
      {
        [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
          ? E
          : never
      }
    >,
    Readonly<
      {
        [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
          ? A
          : never
      }
    >
  >
  partial: <Props extends { [k in keyof Props]: Kind<F, Env, any, any> }>(
    props: Props,
    config?: Named<
      ConfigsForType<
        Env,
        Partial<
          Readonly<
            {
              [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
                ? E
                : never
            }
          >
        >,
        Partial<
          Readonly<
            {
              [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
                ? A
                : never
            }
          >
        >,
        PartialConfig<
          PropsKind<
            F,
            Readonly<
              {
                [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
                  ? E
                  : never
              }
            >,
            Readonly<
              {
                [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
                  ? A
                  : never
              }
            >,
            Env
          >
        >
      >
    >
  ) => Kind<
    F,
    Env,
    Partial<
      Readonly<
        {
          [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
            ? E
            : never
        }
      >
    >,
    Partial<
      Readonly<
        {
          [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
            ? A
            : never
        }
      >
    >
  >
  both: <
    Props extends { [k in keyof Props]: Kind<F, Env, any, any> },
    PropsPartial extends { [k in keyof PropsPartial]: Kind<F, Env, any, any> }
  >(
    props: Props,
    partial: PropsPartial,
    config?: Named<
      ConfigsForType<
        Env,
        Readonly<
          {
            [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
              ? E
              : never
          }
        > &
          Partial<
            Readonly<
              {
                [k in keyof PropsPartial]: [PropsPartial[k]] extends [
                  Kind<F, any, infer E, infer A>
                ]
                  ? E
                  : never
              }
            >
          >,
        Readonly<
          {
            [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
              ? A
              : never
          }
        > &
          Partial<
            Readonly<
              {
                [k in keyof PropsPartial]: [PropsPartial[k]] extends [
                  Kind<F, any, infer E, infer A>
                ]
                  ? A
                  : never
              }
            >
          >,
        BothConfig<
          PropsKind<
            F,
            Readonly<
              {
                [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
                  ? E
                  : never
              }
            >,
            Readonly<
              {
                [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
                  ? A
                  : never
              }
            >,
            Env
          >,
          PropsKind<
            F,
            {
              [k in keyof PropsPartial]: [PropsPartial[k]] extends [
                Kind<F, any, infer E, infer A>
              ]
                ? E
                : never
            },
            {
              [k in keyof PropsPartial]: [PropsPartial[k]] extends [
                Kind<F, any, infer E, infer A>
              ]
                ? A
                : never
            },
            Env
          >
        >
      >
    > & {
      namePartial?: string
      nameRequired?: string
    }
  ) => Kind<
    F,
    Env,
    Readonly<
      {
        [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
          ? E
          : never
      }
    > &
      Partial<
        Readonly<
          {
            [k in keyof PropsPartial]: [PropsPartial[k]] extends [
              Kind<F, any, infer E, infer A>
            ]
              ? E
              : never
          }
        >
      >,
    Readonly<
      {
        [k in keyof Props]: [Props[k]] extends [Kind<F, any, infer E, infer A>]
          ? A
          : never
      }
    > &
      Partial<
        Readonly<
          {
            [k in keyof PropsPartial]: [PropsPartial[k]] extends [
              Kind<F, any, infer E, infer A>
            ]
              ? A
              : never
          }
        >
      >
  >
}
