/**
 * @tsplus static effect/core/io/RuntimeConfig.Aspects addSupervisor
 * @tsplus pipeable effect/core/io/RuntimeConfig addSupervisor
 */
export function addSupervisor<A>(supervisor: Supervisor<A>) {
  return (self: RuntimeConfig): RuntimeConfig =>
    self.copy({
      supervisor: self.value.supervisor + supervisor
    })
}
