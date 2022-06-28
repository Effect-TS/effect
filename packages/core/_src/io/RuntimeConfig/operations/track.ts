/**
 * @tsplus getter effect/core/io/RuntimeConfig track
 * @tsplus static effect/core/io/RuntimeConfig.Aspects track
 */
export function track(self: RuntimeConfig): RuntimeConfig {
  return self.addSupervisor(Supervisor.unsafeTrack())
}
