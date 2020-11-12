import type { Array } from "@effect-ts/core/Classic/Array"
import type { Branded } from "@effect-ts/core/Classic/Branded"
import type { Either } from "@effect-ts/core/Classic/Either"
import type { NonEmptyArray } from "@effect-ts/core/Classic/NonEmptyArray"
import type { Option } from "@effect-ts/core/Classic/Option"
import type { Record } from "@effect-ts/core/Classic/Record"
import type { FunctionN } from "@effect-ts/core/Function"
import type { List } from "@effect-ts/core/Persistent/List"
import type { Mutable } from "@effect-ts/system/Mutable"

import type { AnyEnv, ConfigsForType, InterpreterURIS, Kind, Named } from "../../HKT"

export interface UUIDBrand {
  readonly UUID: unique symbol
}

export type UUID = Branded<string, UUIDBrand>

export type Keys = Record<string, null>

export type LiteralT = string | number

export interface NonEmptyArrayConfig<L, A> {}
export interface ArrayConfig<L, A> {}
export interface ListConfig<L, A> {}
export interface NullableConfig<L, A> {}
export interface MutableConfig<L, A> {}
export interface OptionalConfig<L, A> {}
export interface StringLiteralConfig<T> {}
export interface NumberLiteralConfig<T> {}
export interface OneOfLiteralsConfig<T> {}
export interface KeysOfConfig<K> {}
export interface EitherConfig<EE, EA, AE, AA> {}
export interface OptionConfig<L, A> {}
export interface UnknownEConfig<L, A> {}
export interface BooleanConfig {}
export interface NumberConfig {}
export interface BigIntConfig {}
export interface StringConfig {}
export interface DateConfig {}
export interface UUIDConfig {}
export interface FunctionConfig<I, IE, O, OE> {}

export const PrimitivesURI = "PrimitivesURI"
export type PrimitivesURI = typeof PrimitivesURI

export interface AlgebraPrimitives<F extends InterpreterURIS, Env extends AnyEnv> {
  _F: F

  readonly function: {
    <I, IE, O, OE>(
      I: Kind<F, Env, IE, I>,
      O: Kind<F, Env, OE, O>,
      config?: Named<
        ConfigsForType<Env, unknown, FunctionN<[I], O>, FunctionConfig<I, IE, O, OE>>
      >
    ): Kind<F, Env, unknown, FunctionN<[I], O>>
  }

  readonly unknownE: {
    <L, A>(
      T: Kind<F, Env, L, A>,
      config?: Named<ConfigsForType<Env, unknown, A, UnknownEConfig<L, A>>>
    ): Kind<F, Env, unknown, A>
  }

  readonly nullable: <L, A>(
    T: Kind<F, Env, L, A>,
    config?: Named<ConfigsForType<Env, null | L, Option<A>, NullableConfig<L, A>>>
  ) => Kind<F, Env, null | L, Option<A>>

  readonly mutable: {
    <L, A>(
      T: Kind<F, Env, L, A>,
      config?: Named<ConfigsForType<Env, Mutable<L>, Mutable<A>, MutableConfig<L, A>>>
    ): Kind<F, Env, Mutable<L>, Mutable<A>>
  }

  readonly optional: {
    <L, A>(
      T: Kind<F, Env, L, A>,
      config?: Named<
        ConfigsForType<Env, L | undefined, A | undefined, OptionalConfig<L, A>>
      >
    ): Kind<F, Env, L | undefined, A | undefined>
  }

  readonly boolean: (
    config?: Named<ConfigsForType<Env, boolean, boolean>>
  ) => Kind<F, Env, boolean, boolean>

  readonly number: (
    config?: Named<ConfigsForType<Env, number, number, NumberConfig>>
  ) => Kind<F, Env, number, number>

  readonly bigint: (
    config?: Named<ConfigsForType<Env, string, bigint, BigIntConfig>>
  ) => Kind<F, Env, string, bigint>

  readonly string: (
    config?: Named<ConfigsForType<Env, string, string, StringConfig>>
  ) => Kind<F, Env, string, string>

  readonly stringLiteral: <T extends string>(
    value: T,
    config?: Named<ConfigsForType<Env, string, T, StringLiteralConfig<T>>>
  ) => Kind<F, Env, string, typeof value>

  readonly numberLiteral: <T extends number>(
    value: T,
    config?: Named<ConfigsForType<Env, number, T, NumberLiteralConfig<T>>>
  ) => Kind<F, Env, number, typeof value>

  readonly oneOfLiterals: {
    <T extends readonly [LiteralT, ...LiteralT[]]>(
      value: T,
      config?: Named<
        ConfigsForType<Env, LiteralT, T[number], OneOfLiteralsConfig<T[number]>>
      >
    ): Kind<F, Env, LiteralT, T[number]>
  }

  readonly keysOf: <K extends Keys>(
    keys: K,
    config?: Named<ConfigsForType<Env, string, keyof K & string, KeysOfConfig<K>>>
  ) => Kind<F, Env, string, keyof typeof keys & string>

  readonly array: <L, A>(
    a: Kind<F, Env, L, A>,
    config?: Named<ConfigsForType<Env, Array<L>, Array<A>, ArrayConfig<L, A>>>
  ) => Kind<F, Env, Array<L>, Array<A>>

  readonly list: <L, A>(
    a: Kind<F, Env, L, A>,
    config?: Named<ConfigsForType<Env, Array<L>, List<A>, ListConfig<L, A>>>
  ) => Kind<F, Env, Array<L>, List<A>>

  readonly nonEmptyArray: <L, A>(
    a: Kind<F, Env, L, A>,
    config?: Named<
      ConfigsForType<Env, Array<L>, NonEmptyArray<A>, NonEmptyArrayConfig<L, A>>
    >
  ) => Kind<F, Env, Array<L>, NonEmptyArray<A>>

  readonly date: (
    config?: Named<ConfigsForType<Env, string, Date, DateConfig>>
  ) => Kind<F, Env, string, Date>

  readonly uuid: (
    config?: Named<ConfigsForType<Env, string, UUID, UUIDConfig>>
  ) => Kind<F, Env, string, UUID>

  readonly either: <EE, EA, AE, AA>(
    e: Kind<F, Env, EE, EA>,
    a: Kind<F, Env, AE, AA>,
    config?: Named<
      ConfigsForType<Env, Either<EE, AE>, Either<EA, AA>, EitherConfig<EE, EA, AE, AA>>
    >
  ) => Kind<F, Env, Either<EE, AE>, Either<EA, AA>>

  readonly option: {
    <E, A>(
      a: Kind<F, Env, E, A>,
      config?: Named<ConfigsForType<Env, Option<E>, Option<A>, OptionConfig<E, A>>>
    ): Kind<F, Env, Option<E>, Option<A>>
  }
}
