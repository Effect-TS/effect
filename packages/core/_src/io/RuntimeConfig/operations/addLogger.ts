/**
 * @tsplus static effect/core/io/RuntimeConfig.Aspects addLogger
 * @tsplus pipeable effect/core/io/RuntimeConfig addLogger
 */
export function addLogger(logger: Logger<string, unknown>) {
  return (self: RuntimeConfig): RuntimeConfig =>
    self.copy({
      loggers: self.value.loggers.add(logger)
    })
}
