import type { AnyEnv } from "@morphic-ts/common/lib/config"
import { cacheUnaryFunction } from "@morphic-ts/common/lib/core"

import { modelNonStrictInterpreter, modelStrictInterpreter } from "../../model"
import { ModelURI } from "../../model/hkt"
import type { InterpreterURI } from "../interpreter"
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

export interface M<R, L, A> extends Materialized<R, L, A, ProgramURI, InterpreterURI> {}

export interface UM<R, A> extends M<R, {}, A> {}

export const AsOpaque = <E, A>() => <X extends M<any, E, A>>(x: X): M<X["_R"], E, A> =>
  x

export const AsUOpaque = <A>() => <X extends UM<any, A>>(x: X): UM<X["_R"], A> => x

export interface Summoner<R> extends Summoners<ProgramURI, InterpreterURI, R> {
  <L, A>(F: ProgramType<R, L, A>[ProgramURI]): M<R, L, A>
}

export const summonFor: <R extends AnyEnv = {}>(
  env: ExtractEnv<R, ModelURI>
) => SummonerOps<Summoner<R>> = <R extends AnyConfigEnv = {}>(
  env: ExtractEnv<R, ModelURI>
) =>
  makeSummoner<Summoner<R>>(cacheUnaryFunction, (program) => {
    const { create, type } = program(modelNonStrictInterpreter<NonNullable<R>>())(env)
    return {
      build: (a) => a,
      strictType: program(modelStrictInterpreter<NonNullable<R>>())(env).type,
      type,
      create
    }
  })
