/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Semaphore.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
export {
  Semaphore,
  available,
  makeSemaphore,
  unsafeMakeSemaphore,
  withPermit,
  withPermitManaged,
  withPermits,
  withPermitsManaged
} from "./semaphore"
