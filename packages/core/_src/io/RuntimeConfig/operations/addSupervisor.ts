/**
 * @tsplus fluent ets/RuntimeConfig addSupervisor
 */
export function addSupervisor_<A>(self: RuntimeConfig, supervisor: Supervisor<A>): RuntimeConfig {
  return self.copy({ supervisor: self.value.supervisor + supervisor })
}

/**
 * @tsplus static ets/RuntimeConfig/Aspects addSupervisor
 */
export const addSupervisor = Pipeable(addSupervisor_)
