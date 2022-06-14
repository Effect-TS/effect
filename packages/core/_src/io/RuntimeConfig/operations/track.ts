/**
 * @tsplus getter ets/RuntimeConfig track
 * @tsplus static ets/RuntimeConfig/Aspects track
 */
export function track(self: RuntimeConfig): RuntimeConfig {
  return self.addSupervisor(Supervisor.unsafeTrack())
}
