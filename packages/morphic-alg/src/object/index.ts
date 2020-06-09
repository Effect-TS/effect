import type { ConfigsForType, AnyEnv } from "../config"
import type { URIS, Kind, URIS2, Kind2, HKT2 } from "../utils/hkt"

type AnyMProps<F> = Record<string, HKT2<F, never, any, any>>

export const ObjectURI = "@matechs/morphic-alg/ObjectURI" as const

export type ObjectURI = typeof ObjectURI

declare module "../utils/hkt" {
  export interface Algebra<F, Env> {
    [ObjectURI]: MatechsAlgebraObject<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [ObjectURI]: MatechsAlgebraObject1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [ObjectURI]: MatechsAlgebraObject2<F, Env>
  }
}

export interface InterfaceConfig<Props> {}
export interface PartialConfig<Props> {}
export interface BothConfig<Props, PropsPartial> {}

export interface MatechsAlgebraObject<F, Env> {
  _F: F
  interface: {
    <Props extends AnyMProps<F>>(
      props: Props,
      config?: {
        name?: string
        conf?: ConfigsForType<
          Env,
          Readonly<{ [k in keyof Props]: Props[k]["_E"] }>,
          Readonly<{ [k in keyof Props]: Props[k]["_A"] }>,
          InterfaceConfig<Props>
        >
      }
    ): HKT2<
      F,
      Env,
      Readonly<{ [k in keyof Props]: Props[k]["_E"] }>,
      Readonly<{ [k in keyof Props]: Props[k]["_A"] }>
    >
  }
  partial: {
    <Props extends AnyMProps<F>>(
      props: Props,
      config?: {
        name?: string
        conf?: ConfigsForType<
          Env,
          Partial<Readonly<{ [k in keyof Props]: Props[k]["_E"] }>>,
          Partial<Readonly<{ [k in keyof Props]: Props[k]["_A"] }>>,
          PartialConfig<Props>
        >
      }
    ): HKT2<
      F,
      Env,
      Partial<Readonly<{ [k in keyof Props]: Props[k]["_E"] }>>,
      Partial<Readonly<{ [k in keyof Props]: Props[k]["_A"] }>>
    >
  }
  both: {
    <Props extends AnyMProps<F>, PropsPartial extends AnyMProps<F>>(
      props: Props,
      partial: PropsPartial,
      config?: {
        name?: string
        namePartial?: string
        nameRequired?: string
        conf?: ConfigsForType<
          Env,
          Readonly<{ [k in keyof Props]: Props[k]["_E"] }> &
            Partial<Readonly<{ [k in keyof PropsPartial]: PropsPartial[k]["_E"] }>>,
          Readonly<{ [k in keyof Props]: Props[k]["_A"] }> &
            Partial<Readonly<{ [k in keyof PropsPartial]: PropsPartial[k]["_A"] }>>,
          BothConfig<Props, PropsPartial>
        >
      }
    ): HKT2<
      F,
      Env,
      Readonly<{ [k in keyof Props]: Props[k]["_E"] }> &
        Partial<Readonly<{ [k in keyof PropsPartial]: PropsPartial[k]["_E"] }>>,
      Readonly<{ [k in keyof Props]: Props[k]["_A"] }> &
        Partial<Readonly<{ [k in keyof PropsPartial]: PropsPartial[k]["_A"] }>>
    >
  }
}

export type PropsKind1<F extends URIS, PropsA, R> = {
  [k in keyof PropsA]: Kind<F, R, PropsA[k]>
}

export interface MatechsAlgebraObject1<F extends URIS, Env extends AnyEnv> {
  _F: F
  interface: <Props>(
    props: PropsKind1<F, Props, Env>,
    config?: {
      name?: string
      conf?: ConfigsForType<
        Env,
        unknown,
        Readonly<Props>,
        InterfaceConfig<PropsKind1<F, Props, Env>>
      >
    }
  ) => Kind<F, Env, Readonly<Props>>
  partial: <Props>(
    props: PropsKind1<F, Props, Env>,
    config?: {
      name?: string
      conf?: ConfigsForType<
        Env,
        unknown,
        Partial<Readonly<Props>>,
        PartialConfig<PropsKind1<F, Props, Env>>
      >
    }
  ) => Kind<F, Env, Partial<Readonly<Props>>>
  both: <Props, PropsPartial>(
    props: PropsKind1<F, Props, Env>,
    partial: PropsKind1<F, PropsPartial, Env>,
    config?: {
      name?: string
      namePartial?: string
      nameRequired?: string
      conf?: ConfigsForType<
        Env,
        unknown,
        Readonly<Props> & Partial<Readonly<PropsPartial>>,
        BothConfig<PropsKind1<F, Props, Env>, PropsKind1<F, PropsPartial, Env>>
      >
    }
  ) => Kind<F, Env, Partial<Readonly<Props>> & Partial<Readonly<PropsPartial>>>
}

export type PropsKind2<F extends URIS2, PropsA, PropsE, R> = {
  [k in keyof PropsA & keyof PropsE]: Kind2<F, R, PropsA[k], PropsE[k]>
}

export interface MatechsAlgebraObject2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  interface: <PropsE, PropsA>(
    props: PropsKind2<F, PropsE, PropsA, Env>,
    config?: {
      name?: string
      conf?: ConfigsForType<
        Env,
        Readonly<PropsE>,
        Readonly<PropsA>,
        InterfaceConfig<PropsKind2<F, PropsE, PropsA, Env>>
      >
    }
  ) => Kind2<F, Env, Readonly<PropsE>, Readonly<PropsA>>
  partial: <PropsE, PropsA>(
    props: PropsKind2<F, PropsE, PropsA, Env>,
    config?: {
      name?: string
      conf?: ConfigsForType<
        Env,
        Partial<Readonly<PropsE>>,
        Partial<Readonly<PropsA>>,
        PartialConfig<PropsKind2<F, PropsE, PropsA, Env>>
      >
    }
  ) => Kind2<F, Env, Partial<Readonly<PropsE>>, Partial<Readonly<PropsA>>>
  both: <PropsE, PropsA, PropsPartialE, PropsPartialA>(
    props: PropsKind2<F, PropsE, PropsA, Env>,
    partial: PropsKind2<F, PropsPartialE, PropsPartialA, Env>,
    config?: {
      name?: string
      namePartial?: string
      nameRequired?: string
      conf?: ConfigsForType<
        Env,
        Readonly<PropsE> & Partial<Readonly<PropsPartialE>>,
        Readonly<PropsA> & Partial<Readonly<PropsPartialA>>,
        BothConfig<
          PropsKind2<F, PropsE, PropsA, Env>,
          PropsKind2<F, PropsPartialE, PropsPartialA, Env>
        >
      >
    }
  ) => Kind2<
    F,
    Env,
    Readonly<PropsE> & Partial<Readonly<PropsPartialE>>,
    Readonly<PropsA> & Partial<Readonly<PropsPartialA>>
  >
}
