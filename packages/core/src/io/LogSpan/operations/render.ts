import type { LogSpan } from "../definition"

/**
 * @tsplus fluent ets/LogSpan render
 */
export function render_(self: LogSpan, now: number): string {
  const label = self.label.indexOf(" ") < 0 ? self.label : `"${self.label}"`
  return `${label}=${now - self.startTime}ms`
}

/**
 * @ets_data_first render_
 */
export function render(now: number) {
  return (self: LogSpan): string => self.render(now)
}
