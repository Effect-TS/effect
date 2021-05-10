import * as Clock from "../Clock"
import * as T from "../Effect"
import type { Platform } from "../Fiber"
import type { Has } from "../Has"
import * as L from "../Layer"
import * as TestAnnotationRenderer from "./TestAnnotationRenderer"
import type { TestExecutor } from "./TestExecutor"
import type { TestLogger } from "./TestLogger"
import { FromConsole } from "./TestLogger"
import type { TestReporter } from "./TestReporter"
import { DefaultTestReporter } from "./TestReporter"

const defaultClock = L.fromFunction(Clock.HasClock)(() => new Clock.LiveClock())
const defaultLayer = defaultClock["+++"](FromConsole)

export class TestRunner<R, E> {
  constructor(
    readonly executor: TestExecutor<R, E>,
    readonly platform: Platform<unknown> = T.defaultPlatform,
    readonly reporter: TestReporter<E> = DefaultTestReporter(
      TestAnnotationRenderer.standard
    ),
    readonly bootstrap: L.Layer<
      unknown,
      never,
      Has<TestLogger> & Has<Clock.Clock>
    > = defaultLayer
  ) {}
}
