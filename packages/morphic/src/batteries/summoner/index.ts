import type { BaseFC } from "../../fc/config"
import { reportFailure, Errors, Codec } from "../../model/codec"
import { ModelURI } from "../../model/hkt"
import {
  modelNonStrictInterpreter,
  modelStrictInterpreter,
  modelPreciseInterpreter
} from "../../model/interpreter"
import {
  InterpreterURI,
  validationErrors,
  ValidationErrors,
  Validated
} from "../interpreter"
import type { ProgramURI } from "../program"
import type { Materialized } from "../usage/materializer"
import type { ProgramType } from "../usage/program-type"
import {
  AnyConfigEnv,
  ExtractEnv,
  makeSummoner,
  SummonerOps,
  Summoners
} from "../usage/summoner"

import * as T from "@matechs/core/Effect"
import type { Either } from "@matechs/core/Either"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import { cacheUnaryFunction } from "@matechs/morphic-alg/utils/core"

export interface MM<R, L, A>
  extends Materialized<R, L, A, ProgramURI, InterpreterURI> {}

export interface MM_<R, A> extends MM<R, {}, A> {}

export interface M_<R, A> extends MM_<R & BaseFC, A> {}

export interface M<R, L, A> extends MM<R & BaseFC, L, A> {}

export const opaque = <E, A>() => <R extends {}>(x: M<R, E, A>): M<R, E, A> => x

export const opaque_ = <A>() => <R extends {}>(x: M<R, any, A>): M_<R, A> => x

export interface Summoner<R> extends Summoners<ProgramURI, InterpreterURI, R> {
  <L, A>(F: ProgramType<R, L, A>[ProgramURI]): M<
    unknown extends T.Erase<R, BaseFC> ? {} : T.Erase<R, BaseFC>,
    L,
    A
  >
}

type AOfCodec<C extends Codec<any, any>> = C["_A"]
type EOfCodec<C extends Codec<any, any>> = C["_O"]

export const summonFor: <R extends AnyEnv = {}>(
  env: ExtractEnv<R, ModelURI>
) => SummonerOps<Summoner<R & BaseFC>> = <R extends AnyConfigEnv = {}>(
  env: ExtractEnv<R, ModelURI>
) =>
  makeSummoner<Summoner<R & BaseFC>>(cacheUnaryFunction, (program) => {
    const { codec } = program(modelNonStrictInterpreter<NonNullable<R & BaseFC>>())(env)
    const strict = program(modelStrictInterpreter<NonNullable<R & BaseFC>>())(env).codec
    const precise = program(modelPreciseInterpreter<NonNullable<R & BaseFC>>())(env)
      .codec

    type A = AOfCodec<typeof codec>
    type E = EOfCodec<typeof codec>

    const getCodec = (s?: "strict" | "classic" | "precise") =>
      s === "strict" ? strict : s === "precise" ? precise : codec

    const decode = (
      i: unknown,
      s: "strict" | "classic" | "precise" | undefined
    ): Either<Errors, A> => getCodec(s).decode(i)

    const decodeM = (
      i: unknown,
      s: "strict" | "classic" | "precise" | undefined
    ): T.Effect<never, unknown, ValidationErrors, A> =>
      T.mapLeft_(T.encaseEither(decode(i, s)), (e) =>
        validationErrors(reportFailure(e))
      )

    const encode = (i: A, s: "strict" | "classic" | undefined): E =>
      getCodec(s).encode(i)

    const encodeM = (a: A, s: "strict" | "classic" | undefined): T.Sync<E> =>
      T.sync(() => encode(a, s))

    const validate = (
      a: A,
      s: "strict" | "classic" | "precise" | undefined
    ): Either<Errors, Validated<A>> =>
      getCodec(s).decode(getCodec("classic").encode(a)) as any

    const validateM = (
      a: A,
      s: "strict" | "classic" | "precise" | undefined
    ): T.Effect<never, unknown, ValidationErrors, Validated<A>> =>
      T.mapLeft_(T.encaseEither(validate(a, s)), (e) =>
        validationErrors(reportFailure(e))
      )

    return {
      build: (a) => a,
      decode,
      decodeM,
      encode,
      encodeM,
      parse: decode,
      parseM: decodeM,
      validate,
      validateM
    }
  })
