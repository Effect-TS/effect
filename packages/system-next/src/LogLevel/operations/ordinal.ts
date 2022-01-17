import * as Ord from "../../Ord"
import type { LogLevel } from "../definition"
import { ordLogLevel } from "../instances"

export function lt_(self: LogLevel, that: LogLevel): boolean {
  return Ord.lt(ordLogLevel)(self, that)
}

/**
 * @ets_data_first lt_
 */
export function lt(that: LogLevel) {
  return (self: LogLevel): boolean => lt_(self, that)
}

export function leq_(self: LogLevel, that: LogLevel): boolean {
  return Ord.leq(ordLogLevel)(self, that)
}

/**
 * @ets_data_first gt_
 */
export function leq(that: LogLevel) {
  return (self: LogLevel): boolean => leq_(self, that)
}

export function gt_(self: LogLevel, that: LogLevel): boolean {
  return Ord.gt(ordLogLevel)(self, that)
}

/**
 * @ets_data_first gt_
 */
export function gt(that: LogLevel) {
  return (self: LogLevel): boolean => gt_(self, that)
}

export function geq_(self: LogLevel, that: LogLevel): boolean {
  return !Ord.lt(ordLogLevel)(self, that)
}

/**
 * @ets_data_first geq_
 */
export function geq(that: LogLevel) {
  return (self: LogLevel): boolean => geq_(self, that)
}
