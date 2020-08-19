/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/ZQueue.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
export {
  makeSliding,
  makeDropping,
  makeUnbounded,
  makeBounded,
  Queue,
  Dequeue,
  XQueue
} from "./core"

export {
  takeBetween,
  awaitShutdown,
  capacity,
  isShutdown,
  offer,
  offerAll,
  shutdown,
  size,
  take,
  takeAll,
  takeAllUpTo,
  offerAll_,
  offer_,
  takeAllUpTo_,
  takeBetween_,
  bothWithM,
  both,
  bothWith,
  bothWithM_,
  bothWith_,
  both_,
  dimapM,
  dimapM_,
  contramap,
  contramapM,
  dimap,
  dimap_,
  filterInput,
  filterInputM,
  filterInputM_,
  filterInput_,
  mapM,
  mapM_,
  poll
} from "./api"
