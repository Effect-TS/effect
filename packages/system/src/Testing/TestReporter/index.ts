import type * as T from "../../Effect/index.js"
import type { Has } from "../../Has"
import type { ExecutedSpec } from "../ExecutedSpec/index.js"
import type { TestAnnotationRenderer } from "../TestAnnotationRenderer"
import type { Duration } from "../TestClock"
import type { TestLogger } from "../TestLogger"
import { logLine } from "../TestLogger"

/**
 * A `TestReporter[E]` is capable of reporting test results
 * with error type `E`.
 */
export type TestReporter<E> = (
  duration: Duration,
  executedSpec: ExecutedSpec<E>
) => T.RIO<Has<TestLogger>, void>

export function DefaultTestReporter<E>(_: TestAnnotationRenderer): TestReporter<E> {
  return (d, s) => logLine(`duration: ${d}\n${JSON.stringify(s)}`)
}
