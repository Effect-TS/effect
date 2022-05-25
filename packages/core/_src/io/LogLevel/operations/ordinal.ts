/**
 * @tsplus operator ets/LogLevel <
 * @tsplus fluent ets/LogLevel lt
 */
export function lt_(self: LogLevel, that: LogLevel): boolean {
  return LogLevel.ord.lt(self, that)
}

/**
 * @tsplus static ets/LogLevel/Aspects lt
 */
export const lt = Pipeable(lt_)

/**
 * @tsplus operator ets/LogLevel <=
 * @tsplus fluent ets/LogLevel leq
 */
export function leq_(self: LogLevel, that: LogLevel): boolean {
  return LogLevel.ord.leq(self, that)
}

/**
 * @tsplus static ets/LogLevel/Aspects leq
 */
export const leq = Pipeable(leq_)

/**
 * @tsplus operator ets/LogLevel >
 * @tsplus fluent ets/LogLevel gt
 */
export function gt_(self: LogLevel, that: LogLevel): boolean {
  return LogLevel.ord.gt(self, that)
}

/**
 * @tsplus static ets/LogLevel/Aspects gt
 */
export const gt = Pipeable(gt_)

/**
 * @tsplus operator ets/LogLevel >=
 * @tsplus fluent ets/LogLevel geq
 */
export function geq_(self: LogLevel, that: LogLevel): boolean {
  return !LogLevel.ord.lt(self, that)
}

/**
 * @tsplus static ets/LogLevel/Aspects geq
 */
export const geq = Pipeable(geq_)
