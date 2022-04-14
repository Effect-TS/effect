/**
 * @tsplus fluent ets/RuntimeConfig addLogger
 */
export function addLogger_(self: RuntimeConfig, logger: Logger<string, unknown>): RuntimeConfig {
  return self.copy({ loggers: self.value.loggers.add(logger) });
}

/**
 * @tsplus static ets/RuntimeConfig/Aspects addLogger
 */
export const addLogger = Pipeable(addLogger_);
