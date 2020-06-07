import type { ConfigsForType, AnyEnv } from "../config"
import type { URIS2, Kind2, URIS, Kind, HKT2 } from "../utils/hkt"

import type { Array } from "@matechs/core/Array"
import type { Branded } from "@matechs/core/Branded"
import type { Either } from "@matechs/core/Either"
import type { NonEmptyArray } from "@matechs/core/NonEmptyArray"
import type { Option } from "@matechs/core/Option"
import type { Record } from "@matechs/core/Record"

export interface UUIDBrand {
  readonly UUID: unique symbol
}

export type UUID = Branded<string, UUIDBrand>

export type Keys = Record<string, null>

export const PrimitiveURI = "@matechs/morphic-alg/PrimitiveURI" as const

export type PrimitiveURI = typeof PrimitiveURI

declare module "../utils/hkt" {
  export interface Algebra<F, Env> {
    [PrimitiveURI]: MatechsAlgebraPrimitive<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [PrimitiveURI]: MatechsAlgebraPrimitive1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [PrimitiveURI]: MatechsAlgebraPrimitive2<F, Env>
  }
}

export interface NonEmptyArrayConfig<L, A> {}
export interface ArrayConfig<L, A> {}
export interface NullableConfig<L, A> {}
export interface StringLiteralConfig<T> {}
export interface KeysOfConfig<K> {}
export interface EitherConfig<EE, EA, AE, AA> {}
export interface OptionConfig<L, A> {}
export interface BooleanConfig {}
export interface NumberConfig {}
export interface BigIntConfig {}
export interface StringConfig {}
export interface DateConfig {}
export interface UUIDConfig {}

export interface MatechsAlgebraPrimitive<F, Env> {
  _F: F
  nullable: {
    <L, A>(
      T: HKT2<F, Env, L, A>,
      config?: ConfigsForType<Env, L | null, Option<A>, NullableConfig<L, A>>
    ): HKT2<F, Env, null | L, Option<A>>
  }
  boolean: {
    (config?: ConfigsForType<Env, boolean, boolean, BooleanConfig>): HKT2<
      F,
      Env,
      boolean,
      boolean
    >
  }
  number: {
    (config?: ConfigsForType<Env, number, number, NumberConfig>): HKT2<
      F,
      Env,
      number,
      number
    >
  }
  bigint: {
    (config?: ConfigsForType<Env, string, bigint, BigIntConfig>): HKT2<
      F,
      Env,
      string,
      bigint
    >
  }
  string: {
    (config?: ConfigsForType<Env, string, string, StringConfig>): HKT2<
      F,
      Env,
      string,
      string
    >
  }
  stringLiteral: {
    <T extends string>(
      value: T,
      config?: ConfigsForType<Env, string, T, StringLiteralConfig<T>>
    ): HKT2<F, Env, string, typeof value>
  }
  keysOf: {
    <K extends Keys>(
      keys: K,
      config?: ConfigsForType<Env, string, keyof K & string, KeysOfConfig<K>>
    ): HKT2<F, Env, string, keyof typeof keys & string>
  }
  array: {
    <L, A>(
      a: HKT2<F, Env, L, A>,
      config?: ConfigsForType<Env, Array<L>, Array<A>, ArrayConfig<L, A>>
    ): HKT2<F, Env, Array<L>, Array<A>>
  }
  nonEmptyArray: {
    <L, A>(
      a: HKT2<F, Env, L, A>,
      config?: ConfigsForType<
        Env,
        Array<L>,
        NonEmptyArray<A>,
        NonEmptyArrayConfig<L, A>
      >
    ): HKT2<F, Env, Array<L>, NonEmptyArray<A>>
  }
  date: {
    (config?: ConfigsForType<Env, string, Date, DateConfig>): HKT2<F, Env, string, Date>
  }
  uuid: {
    (config?: ConfigsForType<Env, string, UUID, UUIDConfig>): HKT2<F, Env, string, UUID>
  }
  either: {
    <EE, EA, AE, AA>(
      e: HKT2<F, Env, EE, EA>,
      a: HKT2<F, Env, AE, AA>,
      config?: ConfigsForType<
        Env,
        Either<EE, AE>,
        Either<EA, AA>,
        EitherConfig<EE, EA, AE, AA>
      >
    ): HKT2<F, Env, Either<EE, AE>, Either<EA, AA>>
  }
  option: {
    <E, A>(
      a: HKT2<F, Env, E, A>,
      config?: ConfigsForType<Env, Option<E>, Option<A>, OptionConfig<E, A>>
    ): HKT2<F, Env, Option<E>, Option<A>>
  }
}

export interface MatechsAlgebraPrimitive1<F extends URIS, Env extends AnyEnv> {
  _F: F
  nullable: <A>(
    T: Kind<F, Env, A>,
    config?: ConfigsForType<Env, null | A, Option<A>, NullableConfig<unknown, A>>
  ) => Kind<F, Env, Option<A>>
  boolean(
    config?: ConfigsForType<Env, boolean, boolean, BooleanConfig>
  ): Kind<F, Env, boolean>
  number(
    config?: ConfigsForType<Env, number, number, NumberConfig>
  ): Kind<F, Env, number>
  bigint(
    config?: ConfigsForType<Env, string, bigint, BigIntConfig>
  ): Kind<F, Env, bigint>
  string(
    config?: ConfigsForType<Env, string, string, StringConfig>
  ): Kind<F, Env, string>
  stringLiteral: <T extends string>(
    value: T,
    config?: ConfigsForType<Env, string, T, StringLiteralConfig<T>>
  ) => Kind<F, Env, typeof value>
  keysOf: <K extends Keys>(
    keys: K,
    config?: ConfigsForType<Env, string, keyof K & string, KeysOfConfig<K>>
  ) => Kind<F, Env, keyof typeof keys & string>
  array: <A>(
    a: Kind<F, Env, A>,
    config?: ConfigsForType<Env, Array<unknown>, Array<A>, ArrayConfig<unknown, A>>
  ) => Kind<F, Env, Array<A>>
  nonEmptyArray: <A>(
    a: Kind<F, Env, A>,
    config?: ConfigsForType<
      Env,
      Array<unknown>,
      NonEmptyArray<A>,
      NonEmptyArrayConfig<unknown, A>
    >
  ) => Kind<F, Env, NonEmptyArray<A>>
  date(config?: ConfigsForType<Env, string, Date, DateConfig>): Kind<F, Env, Date>
  uuid(config?: ConfigsForType<Env, string, UUID, UUIDConfig>): Kind<F, Env, UUID>
  either: <EA, AA>(
    e: Kind<F, Env, EA>,
    a: Kind<F, Env, AA>,
    config?: ConfigsForType<
      Env,
      Either<unknown, unknown>,
      Either<EA, AA>,
      EitherConfig<unknown, EA, unknown, AA>
    >
  ) => Kind<F, Env, Either<EA, AA>>
  option: {
    <A>(
      a: Kind<F, Env, A>,
      config?: ConfigsForType<Env, unknown, Option<A>, OptionConfig<unknown, A>>
    ): Kind<F, Env, Option<A>>
  }
}

export interface MatechsAlgebraPrimitive2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  nullable: <L, A>(
    T: Kind2<F, Env, L, A>,
    config?: ConfigsForType<Env, null | L, Option<A>, NullableConfig<L, A>>
  ) => Kind2<F, Env, null | L, Option<A>>
  boolean(
    config?: ConfigsForType<Env, boolean, boolean>
  ): Kind2<F, Env, boolean, boolean>
  number(
    config?: ConfigsForType<Env, number, number, NumberConfig>
  ): Kind2<F, Env, number, number>
  bigint(
    config?: ConfigsForType<Env, string, bigint, BigIntConfig>
  ): Kind2<F, Env, string, bigint>
  string(
    config?: ConfigsForType<Env, string, string, StringConfig>
  ): Kind2<F, Env, string, string>
  stringLiteral: <T extends string>(
    value: T,
    config?: ConfigsForType<Env, string, T, StringLiteralConfig<T>>
  ) => Kind2<F, Env, string, typeof value>
  keysOf: <K extends Keys>(
    keys: K,
    config?: ConfigsForType<Env, string, keyof K & string, KeysOfConfig<K>>
  ) => Kind2<F, Env, string, keyof typeof keys & string>
  array: <L, A>(
    a: Kind2<F, Env, L, A>,
    config?: ConfigsForType<Env, Array<L>, Array<A>, ArrayConfig<L, A>>
  ) => Kind2<F, Env, Array<L>, Array<A>>
  nonEmptyArray: <L, A>(
    a: Kind2<F, Env, L, A>,
    config?: ConfigsForType<Env, Array<L>, NonEmptyArray<A>, NonEmptyArrayConfig<L, A>>
  ) => Kind2<F, Env, Array<L>, NonEmptyArray<A>>
  date(
    config?: ConfigsForType<Env, string, Date, DateConfig>
  ): Kind2<F, Env, string, Date>
  uuid(
    config?: ConfigsForType<Env, string, UUID, UUIDConfig>
  ): Kind2<F, Env, string, UUID>
  either: <EE, EA, AE, AA>(
    e: Kind2<F, Env, EE, EA>,
    a: Kind2<F, Env, AE, AA>,
    config?: ConfigsForType<
      Env,
      Either<EE, AE>,
      Either<EA, AA>,
      EitherConfig<EE, EA, AE, AA>
    >
  ) => Kind2<F, Env, Either<EE, AE>, Either<EA, AA>>
  option: {
    <E, A>(
      a: Kind2<F, Env, E, A>,
      config?: ConfigsForType<Env, Option<E>, Option<A>, OptionConfig<E, A>>
    ): Kind2<F, Env, Option<E>, Option<A>>
  }
}
