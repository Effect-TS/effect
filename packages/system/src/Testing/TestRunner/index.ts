import * as Clock from "../../Clock/index.js"
import * as T from "../../Effect/index.js"
import type { Platform } from "../../Fiber/index.js"
import { pipe } from "../../Function/index.js"
import type { Has } from "../../Has"
import * as L from "../../Layer/index.js"
import * as Annotations from "../Annotations"
import type { ExecutedSpec } from "../ExecutedSpec/index.js"
import type { ZSpec } from "../Spec/index.js"
import * as TestAnnotationRenderer from "../TestAnnotationRenderer"
import { Duration } from "../TestClock"
import type { TestExecutor } from "../TestExecutor"
import { defaultExecutor } from "../TestExecutor"
import type { TestLogger } from "../TestLogger"
import { FromConsole } from "../TestLogger"
import type { TestReporter } from "../TestReporter"
import { DefaultTestReporter } from "../TestReporter"

const defaultClock = L.fromFunction(Clock.HasClock)(() => new Clock.LiveClock())
const defaultLayer = defaultClock["+++"](FromConsole)

type TestRunnerEnv = Has<TestLogger> & Has<Clock.Clock>

export class TestRunner<R, E> {
  readonly runtime = new T.CustomRuntime(undefined, this.platform)

  constructor(
    readonly executor: TestExecutor<R, E>,
    readonly platform: Platform<unknown> = T.defaultPlatform,
    readonly reporter: TestReporter<E> = DefaultTestReporter(
      TestAnnotationRenderer.standard
    ),
    readonly bootstrap: L.Layer<unknown, never, TestRunnerEnv> = defaultLayer
  ) {}

  readonly run = (spec: ZSpec<R, E>): T.RIO<TestRunnerEnv, ExecutedSpec<E>> =>
    pipe(
      T.timed(this.executor.run(spec, T.parallelN(4))),
      T.chain(({ tuple: [d, e] }) => T.as_(this.reporter(Duration(d), e), e))
    )
}

export const defaultTestRunner = new TestRunner(
  defaultExecutor(Annotations.live["+++"](L.succeed(T.defaultEnv)))
)
