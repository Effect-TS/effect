import type { Compute } from "@effect-ts/core/Utils"

import type {
  AnyEnv,
  ConfigsForType,
  HKT,
  InterpreterURIS,
  Kind,
  Named
} from "../../HKT"

export const ObjectURI = "ObjectURI" as const

export type ObjectURI = typeof ObjectURI

export interface InterfaceConfig<Props> {}
export interface PartialConfig<Props> {}
export interface BothConfig<Props, PropsPartial> {}

export type PropsKind<F extends InterpreterURIS, PropsA, PropsE, R> = {
  [k in keyof PropsA & keyof PropsE]: Kind<F, R, PropsA[k], PropsE[k]>
}

type PropsE<
  Props extends {
    [k in keyof Props]: HKT<any, any, any>
  }
> = Compute<
  {
    [k in keyof Props]: Props[k]["_E"]
  }
>

type PropsA<
  Props extends {
    [k in keyof Props]: HKT<any, any, any>
  }
> = Compute<
  {
    [k in keyof Props]: Props[k]["_E"]
  }
>

export interface AlgebraObjects<F extends InterpreterURIS, Env extends AnyEnv> {
  _F: F
  interface: <Props extends { [k in keyof Props]: HKT<Env, any, any> }>(
    props: Props,
    config?: Named<
      ConfigsForType<
        Env,
        PropsE<Props>,
        PropsA<Props>,
        InterfaceConfig<PropsKind<F, PropsE<Props>, PropsA<Props>, Env>>
      >
    >
  ) => Kind<F, Env, PropsE<Props>, PropsA<Props>>
  partial: <Props extends { [k in keyof Props]: HKT<Env, any, any> }>(
    props: Props,
    config?: Named<
      ConfigsForType<
        Env,
        Partial<Readonly<PropsE<Props>>>,
        Partial<Readonly<PropsA<Props>>>,
        PartialConfig<PropsKind<F, PropsE<Props>, PropsA<Props>, Env>>
      >
    >
  ) => Kind<F, Env, Partial<Readonly<PropsE<Props>>>, Partial<Readonly<PropsA<Props>>>>
  both: <
    Props extends { [k in keyof Props]: HKT<Env, any, any> },
    PropsPartial extends { [k in keyof Props]: HKT<Env, any, any> }
  >(
    props: PropsKind<F, PropsE<Props>, PropsA<Props>, Env>,
    partial: PropsKind<F, PropsE<PropsPartial>, PropsA<PropsPartial>, Env>,
    config?: Named<
      ConfigsForType<
        Env,
        Readonly<PropsE<Props>> & Partial<Readonly<PropsE<PropsPartial>>>,
        Readonly<PropsA<Props>> & Partial<Readonly<PropsA<PropsPartial>>>,
        BothConfig<
          PropsKind<F, PropsE<Props>, PropsA<Props>, Env>,
          PropsKind<F, PropsE<PropsPartial>, PropsA<PropsPartial>, Env>
        >
      >
    > & {
      namePartial?: string
      nameRequired?: string
    }
  ) => Kind<
    F,
    Env,
    Readonly<PropsE<Props>> & Partial<Readonly<PropsE<PropsPartial>>>,
    Readonly<PropsA<Props>> & Partial<Readonly<PropsA<PropsPartial>>>
  >
}
