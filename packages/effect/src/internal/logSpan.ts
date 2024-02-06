import type * as LogSpan from "../LogSpan.js"

/** @internal */
export const make = (label: string, startTime: number): LogSpan.LogSpan => ({
  label,
  startTime
})

/** @internal */
export const render = (now: number) => (self: LogSpan.LogSpan): string => {
  const label = self.label.replace(/[\s="]/g, "_")
  return `${label}=${now - self.startTime}ms`
}
