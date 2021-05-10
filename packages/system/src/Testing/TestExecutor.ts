import type { ExecutionStrategy, UIO } from "../Effect"
import type { Layer } from "../Layer"
import type { ExecutedSpec } from "./ExecutedSpec"
import type { ZSpec } from "./Spec"

export interface TestExecutor<R, E> {
  readonly run: (spec: ZSpec<R, E>, defExec: ExecutionStrategy) => UIO<ExecutedSpec<E>>
  readonly environment: Layer<unknown, never, R>
}
