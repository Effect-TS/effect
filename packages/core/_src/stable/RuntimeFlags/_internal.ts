import type { RuntimeFlags } from "./definition"

export const allFlags = {
  None: 0 as RuntimeFlags.Flag,
  Interruption: 1 << 0 as RuntimeFlags.Flag,
  CurrentFiber: 1 << 1 as RuntimeFlags.Flag,
  OpLog: 1 << 2 as RuntimeFlags.Flag,
  OpSupervision: 1 << 3 as RuntimeFlags.Flag,
  RuntimeMetrics: 1 << 4 as RuntimeFlags.Flag,
  FiberRoots: 1 << 5 as RuntimeFlags.Flag,
  WindDown: 1 << 6 as RuntimeFlags.Flag,
  CooperativeYielding: 1 << 7 as RuntimeFlags.Flag
} as const

export function renderFlag(a: RuntimeFlags.Flag): string {
  return Object.entries(allFlags).find(([_, b]) => a === b)![0]
}
