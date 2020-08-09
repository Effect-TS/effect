/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Exit.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
export { of, bind, let, merge } from "./do"

export {
  foldM_,
  foldM,
  foreach,
  foreach_,
  Exit,
  succeed,
  Success,
  Failure,
  halt,
  ap,
  as,
  chain,
  collectAll,
  flatten,
  fold,
  interrupt,
  interrupted,
  map,
  mapErrorCause,
  zipWith,
  bimap,
  chain_,
  collectAllPar,
  die,
  exists,
  fail,
  fold_,
  fromEither,
  fromOption,
  getOrElse,
  mapError,
  map_,
  orElseFail,
  succeeded,
  toEither,
  unit,
  zip,
  zipLeft,
  zipPar,
  zipParLeft,
  zipParRight,
  zipRight,
  zipRight_,
  zipWith_
} from "./api"
