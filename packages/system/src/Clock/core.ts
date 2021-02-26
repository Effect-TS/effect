/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Clock.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import { accessService, accessServiceM } from "../Effect/has"
import { accessServiceM as accessServiceMSync } from "../Sync/has"
import { HasClock } from "./definition"

/**
 * Get the current time in ms since epoch
 */
export const currentTime = accessServiceMSync(HasClock)((_) => _.currentTime)

/**
 * Sleeps for the provided amount of ms
 */
export const sleep = (ms: number) => accessServiceM(HasClock)((_) => _.sleep(ms))

/**
 * Access clock from environment
 */
export const withClockM = accessServiceM(HasClock)

/**
 * Access clock from environment
 */
export const withClock = accessService(HasClock)
