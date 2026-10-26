/**
 * The tasks of Swarm services: list, inspect, and their logs. Only a manager
 * answers; elsewhere every operation fails with `SwarmUnavailable`.
 *
 * **Example** (Waiting for a service's task to run)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schedule } from "effect"
 * import { DockerTasks } from "effect/docker"
 *
 * const running = (service: string) =>
 *   DockerTasks.DockerTasks.use((tasks) =>
 *     tasks.list({ filters: { service, "desired-state": "running" } })
 *   ).pipe(
 *     Effect.filterOrFail((found) => found.some((task) => task.Status?.State === "running")),
 *     Effect.retry({ schedule: Schedule.spaced("1 second"), times: 30 })
 *   )
 * ```
 *
 * @stability unstable
 * @since 4.0.7
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Stream from "../Stream.ts"
import * as DockerApi from "./DockerApi.ts"
import type { LogFrame } from "./DockerContainers.ts"
import { DockerEngine } from "./DockerEngine.ts"
import type { DockerError } from "./DockerError.ts"
import type * as DockerSchema from "./DockerSchema.ts"
import type { LogsOptions } from "./DockerServices.ts"
import { apiClient, withStreamOperation } from "./internal/engine.ts"
import { logFrames, logsQuery } from "./internal/stream.ts"

// -----------------------------------------------------------------------------
// service
// -----------------------------------------------------------------------------

/**
 * The tasks API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.7
 */
export class DockerTasks extends Context.Service<DockerTasks, {
  /**
   * Lists tasks.
   *
   * **Details**
   *
   * [Engine API: TaskList](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Task/operation/TaskList).
   * Filters: `desired-state` (`running`, `shutdown`, `accepted`), `id`,
   * `label`, `name`, `node` and `service`.
   *
   * Typical reasons: `SwarmUnavailable`, `BadRequest` for an invalid filter,
   * `ConnectionFailed`.
   */
  readonly list: (options?: {
    readonly filters?: DockerApi.Filters | undefined
  }) => Effect.Effect<ReadonlyArray<DockerSchema.Task>, DockerError>
  /**
   * Inspects a task.
   *
   * **Details**
   *
   * [Engine API: TaskInspect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Task/operation/TaskInspect).
   * Typical reasons: `NotFound`, `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly inspect: (id: string) => Effect.Effect<DockerSchema.Task, DockerError>
  /**
   * Streams a task's logs.
   *
   * **Details**
   *
   * [Engine API: TaskLogs](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Task/operation/TaskLogs).
   * As `DockerServices`' `logs`, for one task: see its `LogsOptions` and
   * `parseLogLine`.
   *
   * Typical reasons: `NotFound`, `BadRequest`, `SwarmUnavailable`,
   * `ConnectionFailed`, `StreamFailed`.
   */
  readonly logs: (id: string, options?: LogsOptions) => Stream.Stream<LogFrame, DockerError>
}>()("effect/docker/DockerTasks") {}

/**
 * Builds the {@link DockerTasks} service over the `DockerEngine` in context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.7
 */
export const make: Effect.Effect<DockerTasks["Service"], never, DockerEngine> = Effect.gen(function*() {
  const engine = yield* DockerEngine
  const api = yield* apiClient(engine, DockerApi.Tasks, "docker.Tasks")
  return DockerTasks.of({
    list: (options) => api.list({ query: options ?? {} }),
    inspect: (id) => api.inspect({ params: { id } }),
    logs: (id, options) =>
      Stream.unwrap(
        Effect.map(
          api.logs({ params: { id }, query: logsQuery(options) }),
          (logs) => logFrames(logs, "docker.Tasks.logs")
        )
      ).pipe(withStreamOperation(engine, "docker.Tasks.logs", id))
  })
})

/**
 * Provides {@link DockerTasks} over the `DockerEngine` in context, built with
 * {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.7
 */
export const layer: Layer.Layer<DockerTasks, never, DockerEngine> = Layer.effect(DockerTasks, make)
