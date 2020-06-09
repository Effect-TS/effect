/* eslint-disable @typescript-eslint/class-name-casing */

import type { BaseFC } from "../../fc/config"
import { reportFailure } from "../../model/codec"
import { ModelURI } from "../../model/hkt"
import {
  modelNonStrictInterpreter,
  modelStrictInterpreter,
  modelPreciseInterpreter
} from "../../model/interpreter"
import { InterpreterURI, validationErrors } from "../interpreter"
import type { ProgramURI } from "../program"
import type { Materialized } from "../usage/materializer"
import { ProgramType } from "../usage/program-type"
import {
  AnyConfigEnv,
  ExtractEnv,
  makeSummoner,
  SummonerOps,
  Summoners
} from "../usage/summoner"

import * as T from "@matechs/core/Effect"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import { cacheUnaryFunction } from "@matechs/morphic-alg/utils/core"

export interface MM<R, L, A>
  extends Materialized<R, L, A, ProgramURI, InterpreterURI> {}

export interface MM_<R, A> extends MM<R, {}, A> {}

export interface M_<R, A> extends MM_<R & BaseFC, A> {}

export interface M<R, L, A> extends MM<R & BaseFC, L, A> {}

export const opaque = <E, A>() => <R extends {}>(x: M<R, E, A>): M<R, E, A> => x

export const opaque_ = <A>() => <R extends {}>(x: M_<R, A>): M_<R, A> => x

export interface Summoner<R> extends Summoners<ProgramURI, InterpreterURI, R> {
  <L, A>(F: ProgramType<R, L, A>[ProgramURI]): M<
    unknown extends T.Erase<R, BaseFC> ? {} : T.Erase<R, BaseFC>,
    L,
    A
  >
}

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

    const getCodec = (s?: "strict" | "classic" | "precise") =>
      s === "strict" ? strict : s === "precise" ? precise : codec

    return {
      build: (a) => a,
      decode: (i, s) => getCodec(s).decode(i),
      encode: (i, s) => getCodec(s).encode(i),
      validate: (a, s) => getCodec(s).decode(getCodec("classic").encode(a)) as any,
      encodeM: (a, s) => T.sync(() => getCodec(s).encode(a)),
      decodeM: (i, s) =>
        T.mapLeft_(T.encaseEither(getCodec(s).decode(i)), (e) =>
          validationErrors(reportFailure(e))
        ),
      validateM: (a, s) =>
        T.mapLeft_(
          T.encaseEither(getCodec(s).decode(getCodec("classic").encode(a))),
          (e) => validationErrors(reportFailure(e))
        ) as any
    }
  })
