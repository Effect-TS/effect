/**
 * @tsplus fluent ets/LogSpan render
 */
export function render_(self: LogSpan, now: number): string {
  const label = self.label.indexOf(" ") < 0 ? self.label : `"${self.label}"`;
  return `${label}=${now - self.startTime}ms`;
}

/**
 * @tsplus static ets/LogSpan/Aspects render
 */
export const render = Pipeable(render_);
