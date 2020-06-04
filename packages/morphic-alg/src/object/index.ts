import type { URIS, Kind, URIS2, Kind2, HKT2 } from "@morphic-ts/common/lib/HKT"
import type { ConfigsForType, AnyEnv } from "@morphic-ts/common/lib/config"

type AnyMProps<F> = Record<string, HKT2<F, never, any, any>>

export const ObjectURI = "@matechs/morphic/ObjectURI" as const

export type ObjectURI = typeof ObjectURI

declare module "@morphic-ts/algebras/lib/hkt" {
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

export interface MatechsAlgebraObject<F, Env> {
  _F: F
  interface: {
    <Props extends AnyMProps<F>>(
      props: Props,
      name: string,
      config?: ConfigsForType<
        Env,
        Readonly<{ [k in keyof Props]: Props[k]["_E"] }>,
        Readonly<{ [k in keyof Props]: Props[k]["_A"] }>
      >
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
      name: string,
      config?: ConfigsForType<
        Env,
        Partial<Readonly<{ [k in keyof Props]: Props[k]["_E"] }>>,
        Partial<Readonly<{ [k in keyof Props]: Props[k]["_A"] }>>
      >
    ): HKT2<
      F,
      Env,
      Partial<Readonly<{ [k in keyof Props]: Props[k]["_E"] }>>,
      Partial<Readonly<{ [k in keyof Props]: Props[k]["_A"] }>>
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
    name: string,
    config?: ConfigsForType<Env, unknown, Readonly<Props>>
  ) => Kind<F, Env, Readonly<Props>>
  partial: <Props>(
    props: PropsKind1<F, Props, Env>,
    name: string,
    config?: ConfigsForType<Env, unknown, Readonly<Props>>
  ) => Kind<F, Env, Partial<Readonly<Props>>>
}

export type PropsKind2<F extends URIS2, PropsA, PropsE, R> = {
  [k in keyof PropsA & keyof PropsE]: Kind2<F, R, PropsA[k], PropsE[k]>
}

export interface MatechsAlgebraObject2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  interface: <PropsE, PropsA>(
    props: PropsKind2<F, PropsE, PropsA, Env>,
    name: string,
    config?: ConfigsForType<Env, Readonly<PropsE>, Readonly<PropsA>>
  ) => Kind2<F, Env, Readonly<PropsE>, Readonly<PropsA>>
  partial: <PropsE, PropsA>(
    props: PropsKind2<F, PropsE, PropsA, Env>,
    name: string,
    config?: ConfigsForType<Env, Readonly<PropsE>, Readonly<PropsA>>
  ) => Kind2<F, Env, Partial<Readonly<PropsE>>, Partial<Readonly<PropsA>>>
}
