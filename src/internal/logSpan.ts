import type { LogSpan } from "../LogSpan.js"

/** @internal */
export const make = (label: string, startTime: number): LogSpan => ({
  label,
  startTime
})

/** @internal */
export const render = (now: number) => {
  return (self: LogSpan): string => {
    const label = self.label.replace(/[\s="]/g, "_")
    return `${label}=${now - self.startTime}ms`
  }
}
