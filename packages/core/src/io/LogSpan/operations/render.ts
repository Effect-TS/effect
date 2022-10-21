/**
 * @tsplus static effect/core/io/LogSpan.Aspects render
 * @tsplus pipeable effect/core/io/LogSpan render
 */
export function render(now: number) {
  return (self: LogSpan): string => {
    const label = self.label.indexOf(" ") < 0 ? self.label : `"${self.label}"`
    return `${label}=${now - self.startTime}ms`
  }
}
