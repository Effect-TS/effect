/**
 * Containers: lifecycle, inspection, logs, stats, archives, attach and wait.
 *
 * Request bodies are the generated `DockerSchema` types in the Engine's own
 * PascalCase, so the Engine API reference maps 1:1; query and path parameters
 * are small camelCase options objects. `create` takes `Env` entries as
 * `Redacted` or plain, but `inspect` returns them as the plain strings the
 * Engine sends.
 *
 * There are no scoped resources: `create` returns the new container and
 * the caller removes it with `remove`. `Scope` only governs connections:
 * attach handles.
 *
 * **Example** (Running a container to completion)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { DockerContainers } from "effect/docker"
 *
 * const program = Effect.gen(function*() {
 *   const containers = yield* DockerContainers.DockerContainers
 *   const { Id } = yield* containers.create(
 *     { Image: "alpine", Cmd: ["echo", "hello"], Labels: { app: "demo" } },
 *     { name: "demo" }
 *   )
 *   yield* containers.start(Id)
 *   const { StatusCode } = yield* containers.wait(Id)
 *   yield* containers.remove(Id)
 *   return StatusCode
 * })
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Context from "../Context.ts"
import type * as DateTime from "../DateTime.ts"
import type * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Tar from "../encoding/Tar.ts"
import * as Fiber from "../Fiber.ts"
import * as Layer from "../Layer.ts"
import * as Schema from "../Schema.ts"
import type * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import * as DockerApi from "./DockerApi.ts"
import { withProxyEnv } from "./DockerConfig.ts"
import {
  apiClient,
  DockerEngine,
  filterStatus,
  toDockerError,
  withOperation,
  withStreamOperation
} from "./DockerEngine.ts"
import { DockerError, InvalidResponse, StreamFailed } from "./DockerError.ts"
import { frames, type Framing, fromContentType, type Handle, makeHandle, releaseOnFailure } from "./DockerExec.ts"
import * as DockerSchema from "./DockerSchema.ts"

/**
 * A chunk of container output: opaque bytes from stdout or stderr. Lines are
 * never split; decoding text is the caller's job.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface LogFrame {
  readonly stream: "stdout" | "stderr"
  readonly data: Uint8Array
}

/**
 * The query of logs, with an unset `stdout` or `stderr` included unless the
 * other is `true`: the Engine rejects neither.
 *
 * @internal
 */
export const logsQuery = <
  Options extends { readonly stdout?: boolean | undefined; readonly stderr?: boolean | undefined }
>(options: Options | undefined) => ({
  ...options,
  stdout: options?.stdout ?? options?.stderr !== true,
  stderr: options?.stderr ?? options?.stdout !== true
})

const decodeWaitResponse = Schema.decodeUnknownEffect(Schema.toCodecGoJson(DockerSchema.ContainerWaitResponse))

// -----------------------------------------------------------------------------
// service
// -----------------------------------------------------------------------------

/**
 * The containers API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.6
 */
export class DockerContainers extends Context.Service<DockerContainers, {
  /**
   * Lists containers.
   *
   * **Details**
   *
   * [Engine API: ContainerList](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerList).
   * Only running containers are listed unless `all` is set. The `annotation`
   * filter requires API 1.56.
   *
   * Typical reasons: `BadRequest` (an invalid filter), `ConnectionFailed`,
   * `OptionNotSupported`.
   */
  readonly list: (options?: {
    readonly all?: boolean | undefined
    readonly limit?: number | undefined
    readonly size?: boolean | undefined
    readonly filters?: DockerApi.Filters | undefined
  }) => Effect.Effect<ReadonlyArray<DockerSchema.ContainerSummary>, DockerError>
  /**
   * Creates a container.
   *
   * **Details**
   *
   * [Engine API: ContainerCreate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerCreate).
   * The body is the Engine's `ContainerCreateRequest` (`ContainerConfig` plus
   * `HostConfig` and `NetworkingConfig`). As `docker create` does, the
   * configured proxy is added to `Env` (unless the container sets the same
   * variables), and the configured platform applies unless `platform` is set.
   * `Env` entries can be `Redacted`, and are sent unwrapped.
   *
   * Body fields newer than the negotiated version fail with
   * `OptionNotSupported`: `HostConfig.Umask` (1.56), mount
   * `VolumeOptions.Subpath` (1.45), `TmpfsOptions.Options` (1.46),
   * `ImageOptions` and `EndpointsConfig.*.GwPriority` (1.48).
   *
   * Typical reasons: `NotFound` (no such image: pull it first), `Conflict` (the
   * name is taken), `BadRequest`, `ConnectionFailed`, `OptionNotSupported`.
   */
  readonly create: (
    config: DockerApi.ContainerCreateRequest,
    options?: {
      readonly name?: string | undefined
      readonly platform?: string | undefined
    }
  ) => Effect.Effect<DockerSchema.ContainerCreateResponse, DockerError>
  /**
   * Inspects a container.
   *
   * **Details**
   *
   * [Engine API: ContainerInspect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerInspect).
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly inspect: (
    id: string,
    options?: { readonly size?: boolean | undefined }
  ) => Effect.Effect<DockerSchema.ContainerInspectResponse, DockerError>
  /**
   * Lists the processes running in a container.
   *
   * **Details**
   *
   * [Engine API: ContainerTop](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerTop).
   * `psArgs` are the arguments to `ps` (default `-ef`).
   *
   * Typical reasons: `NotFound`, `Conflict` (not running), `ConnectionFailed`.
   */
  readonly top: (
    id: string,
    options?: { readonly psArgs?: string | undefined }
  ) => Effect.Effect<DockerSchema.ContainerTopResponse, DockerError>
  /**
   * Lists the changes to a container's filesystem.
   *
   * **Details**
   *
   * [Engine API: ContainerChanges](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerChanges).
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly changes: (
    id: string
  ) => Effect.Effect<ReadonlyArray<DockerSchema.FilesystemChange>, DockerError>
  /**
   * Starts a container. Starting a running container succeeds (the Engine
   * answers 304).
   *
   * **Details**
   *
   * [Engine API: ContainerStart](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerStart).
   * Typical reasons: `NotFound`, `ServerError` (for example "port is already
   * allocated"), `ConnectionFailed`.
   */
  readonly start: (
    id: string,
    options?: { readonly detachKeys?: string | undefined }
  ) => Effect.Effect<void, DockerError>
  /**
   * Stops a container. Stopping a stopped container succeeds (the Engine
   * answers 304).
   *
   * **Details**
   *
   * [Engine API: ContainerStop](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerStop).
   * `timeout` is the grace period before the container is killed, rounded up to
   * whole seconds (an infinite duration waits forever); `signal` replaces the
   * stop signal.
   *
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly stop: (
    id: string,
    options?: { readonly signal?: string | undefined; readonly timeout?: Duration.Input | undefined }
  ) => Effect.Effect<void, DockerError>
  /**
   * Restarts a container.
   *
   * **Details**
   *
   * [Engine API: ContainerRestart](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerRestart).
   * `timeout` and `signal` are as for `stop`.
   *
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly restart: (
    id: string,
    options?: { readonly signal?: string | undefined; readonly timeout?: Duration.Input | undefined }
  ) => Effect.Effect<void, DockerError>
  /**
   * Sends a signal to a container (default `SIGKILL`).
   *
   * **Details**
   *
   * [Engine API: ContainerKill](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerKill).
   * Typical reasons: `NotFound`, `Conflict` (not running), `ConnectionFailed`.
   */
  readonly kill: (
    id: string,
    options?: { readonly signal?: string | undefined }
  ) => Effect.Effect<void, DockerError>
  /**
   * Pauses a container.
   *
   * **Details**
   *
   * [Engine API: ContainerPause](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerPause).
   * Typical reasons: `NotFound`, `Conflict`, `ConnectionFailed`.
   */
  readonly pause: (id: string) => Effect.Effect<void, DockerError>
  /**
   * Unpauses a container.
   *
   * **Details**
   *
   * [Engine API: ContainerUnpause](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerUnpause).
   * Typical reasons: `NotFound`, `Conflict`, `ConnectionFailed`.
   */
  readonly unpause: (id: string) => Effect.Effect<void, DockerError>
  /**
   * Renames a container.
   *
   * **Details**
   *
   * [Engine API: ContainerRename](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerRename).
   * Typical reasons: `NotFound`, `Conflict` (the name is taken), `ConnectionFailed`.
   */
  readonly rename: (id: string, name: string) => Effect.Effect<void, DockerError>
  /**
   * Resizes the TTY of a container.
   *
   * **Details**
   *
   * [Engine API: ContainerResize](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerResize).
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly resize: (id: string, size: DockerApi.TtySize) => Effect.Effect<void, DockerError>
  /**
   * Updates a container's resource limits and restart policy.
   *
   * **Details**
   *
   * [Engine API: ContainerUpdate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerUpdate).
   * The per-device blkio fields require API 1.55 (older Engines accepted and
   * ignored them).
   *
   * Typical reasons: `NotFound`, `BadRequest`, `ConnectionFailed`,
   * `OptionNotSupported`.
   */
  readonly update: (
    id: string,
    config: DockerSchema.ContainerUpdateRequest
  ) => Effect.Effect<DockerSchema.ContainerUpdateResponse, DockerError>
  /**
   * Waits for a container to reach a condition, and returns its exit code.
   *
   * **Details**
   *
   * [Engine API: ContainerWait](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerWait).
   * `condition` is `not-running` (default), `next-exit` or `removed`. There is
   * no timeout: add `Effect.timeout` if needed.
   *
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly wait: (
    id: string,
    options?: { readonly condition?: "not-running" | "next-exit" | "removed" | undefined }
  ) => Effect.Effect<DockerSchema.ContainerWaitResponse, DockerError>
  /**
   * Removes a container.
   *
   * **Details**
   *
   * [Engine API: ContainerDelete](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerDelete).
   * `force` kills a running container first; `volumes` removes its anonymous
   * volumes; `link` removes a legacy link instead.
   *
   * Typical reasons: `NotFound`, `Conflict` (running, without `force`),
   * `ConnectionFailed`.
   */
  readonly remove: (
    id: string,
    options?: {
      readonly force?: boolean | undefined
      readonly volumes?: boolean | undefined
      readonly link?: boolean | undefined
    }
  ) => Effect.Effect<void, DockerError>
  /**
   * Removes stopped containers.
   *
   * **Details**
   *
   * [Engine API: ContainerPrune](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerPrune).
   * Typical reasons: `BadRequest`, `Conflict` (a prune is already running),
   * `ConnectionFailed`.
   */
  readonly prune: (options?: {
    readonly filters?: DockerApi.Filters | undefined
  }) => Effect.Effect<DockerSchema.ContainerPruneResponse, DockerError>
  /**
   * Streams a container's logs.
   *
   * **Details**
   *
   * [Engine API: ContainerLogs](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerLogs).
   * Both `stdout` and `stderr` are included by default: an unset one is
   * included unless the other is `true`. With `follow`
   * the stream continues until the container stops, or until it is interrupted;
   * there is no timeout. `since` and `until` take any `DateTime.Input`; `tail` is
   * a line count or `"all"`.
   *
   * The framing follows the response's content type, or the container's TTY
   * when the Engine sends none. With a TTY every frame is `"stdout"`. A
   * systemerr frame fails the stream with `StreamFailed`.
   *
   * Typical reasons: `NotFound`, `ConnectionFailed`, `StreamFailed`.
   *
   * **Example** (Following logs as text lines)
   *
   * ```ts import.meta.vitest
   * import { Stream } from "effect"
   * import { DockerContainers } from "effect/docker"
   *
   * const lines = Stream.unwrap(
   *   DockerContainers.DockerContainers.useSync((containers) => containers.logs("my-container", { follow: true }))
   * ).pipe(
   *   Stream.map((frame) => frame.data),
   *   Stream.decodeText(),
   *   Stream.splitLines
   * )
   * ```
   */
  readonly logs: (
    id: string,
    options?: {
      readonly follow?: boolean | undefined
      readonly stdout?: boolean | undefined
      readonly stderr?: boolean | undefined
      readonly since?: DateTime.DateTime.Input | undefined
      readonly until?: DateTime.DateTime.Input | undefined
      readonly timestamps?: boolean | undefined
      readonly tail?: number | "all" | undefined
    }
  ) => Stream.Stream<LogFrame, DockerError>
  /**
   * Samples a container's resource usage once.
   *
   * **Details**
   *
   * [Engine API: ContainerStats](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerStats).
   * `oneShot` skips the wait for a second sample, so CPU percentages can't be
   * computed from `precpu_stats`.
   *
   * Typical reasons: `NotFound`, `ConnectionFailed`, `InvalidResponse`.
   */
  readonly stats: (
    id: string,
    options?: { readonly oneShot?: boolean | undefined }
  ) => Effect.Effect<DockerSchema.ContainerStatsResponse, DockerError>
  /**
   * Streams a container's resource usage, about one sample a second.
   *
   * **Details**
   *
   * [Engine API: ContainerStats](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerStats).
   * The stream doesn't end while the container runs: use `Stream.take` or
   * interrupt it.
   *
   * Typical reasons: `NotFound`, `ConnectionFailed`, `InvalidResponse`.
   */
  readonly statsStream: (
    id: string
  ) => Stream.Stream<DockerSchema.ContainerStatsResponse, DockerError>
  /**
   * Exports a container's filesystem as a tar archive.
   *
   * **Details**
   *
   * [Engine API: ContainerExport](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerExport).
   * The bytes stream as the Engine sends them; decode them with
   * `Tar.decode()`.
   *
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly export: (id: string) => Stream.Stream<Uint8Array, DockerError>
  /**
   * Attaches to a container's stdio.
   *
   * **Details**
   *
   * [Engine API: ContainerAttach](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerAttach).
   * `stdout` and `stderr` default to `true`; `stdin` must be requested, and the
   * container must have been created with `OpenStdin`. `logs` replays the
   * output so far. Without `detachKeys`, the configured detach keys apply.
   *
   * Attaching first sends `/wait?condition=next-exit` over its own
   * connection, so "create, attach, start" doesn't miss the exit: `exitCode` is
   * that wait's result. The Engine acknowledges the wait with its response
   * head, which attach waits for before attaching. Closing the scope detaches;
   * a failed attach closes its connections at once.
   *
   * Typical reasons: `NotFound`, `Conflict`, `ConnectionFailed`, and
   * `StreamFailed` on the output streams.
   *
   * **Example** (Create, attach, start)
   *
   * ```ts import.meta.vitest
   * import { Effect, Stream } from "effect"
   * import { DockerContainers } from "effect/docker"
   *
   * const program = Effect.scoped(Effect.gen(function*() {
   *   const containers = yield* DockerContainers.DockerContainers
   *   const { Id } = yield* containers.create({ Image: "alpine", Cmd: ["echo", "hi"] })
   *   const attached = yield* containers.attach(Id)
   *   yield* containers.start(Id)
   *   const output = yield* attached.stdout.pipe(Stream.decodeText(), Stream.mkString)
   *   return { output, exitCode: yield* attached.exitCode }
   * }))
   * ```
   */
  readonly attach: (
    id: string,
    options?: {
      readonly stdin?: boolean | undefined
      readonly stdout?: boolean | undefined
      readonly stderr?: boolean | undefined
      readonly logs?: boolean | undefined
      readonly detachKeys?: string | undefined
    }
  ) => Effect.Effect<Handle, DockerError, Scope.Scope>
  /**
   * Reads the stat of a path in a container (`HEAD /containers/{id}/archive`).
   *
   * **Details**
   *
   * [Engine API: ContainerArchiveInfo](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerArchiveInfo).
   * Typical reasons: `NotFound` (no such container or path), `BadRequest`,
   * `ConnectionFailed`.
   */
  readonly statPath: (id: string, containerPath: string) => Effect.Effect<DockerApi.PathStat, DockerError>
  /**
   * Reads a path from a container as a tar archive, with its stat.
   *
   * **Details**
   *
   * [Engine API: ContainerArchive](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/ContainerArchive).
   * The archive holds the path itself as its first entry (a directory's
   * contents are below it). Read `bytes` before the response is abandoned; it
   * streams from the open request.
   *
   * Typical reasons: `NotFound`, `BadRequest`, `ConnectionFailed`.
   */
  readonly getArchive: (
    id: string,
    containerPath: string
  ) => Effect.Effect<
    { readonly stat: DockerApi.PathStat; readonly bytes: Stream.Stream<Uint8Array, DockerError> },
    DockerError
  >
  /**
   * Extracts a tar archive into a directory of a container.
   *
   * **Details**
   *
   * [Engine API: PutContainerArchive](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Container/operation/PutContainerArchive).
   * `containerPath` must be an existing directory. The bytes stream to the
   * Engine as `application/x-tar`; a failure of `bytes` fails the request with
   * that error. `noOverwriteDirNonDir` refuses to replace a directory with a
   * non-directory (and vice versa); `copyUIDGID` keeps the archive's owners.
   *
   * Typical reasons: `NotFound`, `BadRequest`, `Forbidden` (a read-only path),
   * `ConnectionFailed`.
   */
  readonly putArchive: (
    id: string,
    containerPath: string,
    bytes: Stream.Stream<Uint8Array, DockerError>,
    options?: {
      readonly noOverwriteDirNonDir?: boolean | undefined
      readonly copyUIDGID?: boolean | undefined
    }
  ) => Effect.Effect<void, DockerError>
  /**
   * Copies tar entries into a directory of a container.
   *
   * **Details**
   *
   * Encodes `entries` with `Tar.encode()` and sends them with `putArchive`.
   * Paths are relative to `containerPath`, which must be an existing directory.
   * Entries that fail to encode (a body that doesn't match its declared size,
   * for example) fail with `StreamFailed`, with the `TarError` as its `cause`.
   *
   * Typical reasons: as for `putArchive`, and `StreamFailed`.
   *
   * **Example** (Writing a file into a container)
   *
   * ```ts import.meta.vitest
   * import { Effect, Stream } from "effect"
   * import { DockerContainers } from "effect/docker"
   * import { Tar } from "effect/encoding"
   *
   * const program = Effect.gen(function*() {
   *   const containers = yield* DockerContainers.DockerContainers
   *   yield* containers.copyTo(
   *     "my-container",
   *     "/etc",
   *     Stream.make(Tar.file("app/config.json", JSON.stringify({ debug: true }), { mode: 0o600 }))
   *   )
   * })
   * ```
   */
  readonly copyTo: (
    id: string,
    containerPath: string,
    entries: Stream.Stream<Tar.Entry>,
    options?: {
      readonly noOverwriteDirNonDir?: boolean | undefined
      readonly copyUIDGID?: boolean | undefined
    }
  ) => Effect.Effect<void, DockerError>
  /**
   * Copies a path out of a container, as tar entries.
   *
   * **Details**
   *
   * Reads the archive with `getArchive` and decodes it with
   * `Tar.decode()`. The first entry is the path itself. Read each entry's body
   * before pulling the next one. An archive that fails to decode fails with
   * `InvalidResponse`.
   *
   * Typical reasons: `NotFound`, `ConnectionFailed`, `InvalidResponse`.
   */
  readonly copyFrom: (
    id: string,
    containerPath: string
  ) => Stream.Stream<Tar.Entry<DockerError>, DockerError>
}>()("effect/docker/DockerContainers") {}

/**
 * Builds the {@link DockerContainers} service over the `DockerEngine` in context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make: Effect.Effect<DockerContainers["Service"], never, DockerEngine> = Effect.gen(function*() {
  const engine = yield* DockerEngine
  const api = yield* apiClient(engine, DockerApi.Containers, "docker.Containers")

  const inspect: DockerContainers["Service"]["inspect"] = (id, options) =>
    api.inspect({ params: { id }, query: options ?? {} })
  const resize: DockerContainers["Service"]["resize"] = (id, size) => api.resize({ params: { id }, query: size })
  /** The framing of a stream, from its `Content-Type`, otherwise from whether the container has a TTY. */
  const framingOf = (id: string, contentType: string | undefined): Effect.Effect<Framing, DockerError> => {
    const framing = fromContentType(contentType)
    return framing !== undefined
      ? Effect.succeed(framing)
      : Effect.map(inspect(id), (info) => info.Config?.Tty === true ? "raw" : "multiplexed")
  }

  const getArchive: DockerContainers["Service"]["getArchive"] = (id, containerPath) =>
    Effect.map(
      api.getArchive({ params: { id }, query: { path: containerPath } }),
      ({ body, headers }) => ({ stat: headers["x-docker-container-path-stat"], bytes: body })
    )
  const putArchive: DockerContainers["Service"]["putArchive"] = (id, containerPath, bytes, options) =>
    api.putArchive({ params: { id }, query: { ...options, path: containerPath }, payload: bytes })

  return DockerContainers.of({
    list: (options) => api.list({ query: options ?? {} }),
    create: (config, options) => {
      // the configured proxy, unless the container sets the same variables, as `docker create` adds it
      const env = withProxyEnv(config.Env, engine.config.proxy)
      return api.create({
        query: { name: options?.name, platform: options?.platform ?? engine.config.platform },
        payload: env === undefined || env === config.Env ? config : { ...config, Env: env }
      })
    },
    inspect,
    top: (id, options) => api.top({ params: { id }, query: options ?? {} }),
    changes: (id) => api.changes({ params: { id } }),
    start: (id, options) => api.start({ params: { id }, query: options ?? {} }),
    stop: (id, options) => api.stop({ params: { id }, query: options ?? {} }),
    restart: (id, options) => api.restart({ params: { id }, query: options ?? {} }),
    kill: (id, options) => api.kill({ params: { id }, query: options ?? {} }),
    pause: (id) => api.pause({ params: { id } }),
    unpause: (id) => api.unpause({ params: { id } }),
    rename: (id, name) => api.rename({ params: { id }, query: { name } }),
    resize,
    update: (id, config) => api.update({ params: { id }, payload: config }),
    wait: (id, options) => api.wait({ params: { id }, query: options ?? {} }),
    remove: (id, options) => api.remove({ params: { id }, query: options ?? {} }),
    prune: (options) => api.prune({ query: options ?? {} }),
    logs: (id, options) => {
      return Stream.unwrap(
        api.logs({
          params: { id },
          query: logsQuery(options)
        }).pipe(
          Effect.flatMap(({ body, headers }) =>
            Effect.map(framingOf(id, headers["content-type"]), (framing) => frames(body, framing))
          )
        )
      ).pipe(withStreamOperation(engine, "docker.Containers.logs", id))
    },
    stats: (id, options) => api.stats({ params: { id }, query: { stream: false, oneShot: options?.oneShot } }),
    statsStream: (id) => api.statsStream({ params: { id }, query: { stream: true } }),
    export: (id) => api.export({ params: { id } }),
    attach: (id, options) =>
      releaseOnFailure(Effect.gen(function*() {
        // the Engine answers with the head once the wait is registered, and with the body when the
        // container exits: the response alone, read later
        const wait = yield* api.wait({
          params: { id },
          query: { condition: "next-exit" },
          responseMode: "response-only"
        }).pipe(Effect.flatMap(filterStatus("docker.Containers.attach")))
        const exitCode = yield* Effect.forkScoped(
          wait.json.pipe(
            Effect.flatMap(decodeWaitResponse),
            Effect.map((result) => result.StatusCode),
            Effect.mapError(toDockerError(engine, "docker.Containers.attach"))
          )
        )
        const { headers, socket } = yield* api.attach({
          params: { id },
          query: {
            stream: true,
            stdin: options?.stdin === true,
            stdout: options?.stdout !== false,
            stderr: options?.stderr !== false,
            logs: options?.logs,
            detachKeys: options?.detachKeys ?? engine.config.detachKeys
          }
        })
        return yield* makeHandle({
          engine,
          socket,
          framing: yield* framingOf(id, headers["content-type"]),
          stdin: options?.stdin === true,
          exitCode: () => Fiber.join(exitCode),
          resize: (size) => resize(id, size)
        })
      })).pipe(withOperation(engine, "docker.Containers.attach", id)),
    statPath: (id, containerPath) => api.statPath({ params: { id }, query: { path: containerPath } }),
    getArchive,
    putArchive,
    copyTo: (id, containerPath, entries, options) =>
      putArchive(
        id,
        containerPath,
        entries.pipe(
          Stream.pipeThroughChannel(Tar.encode()),
          Stream.mapError((cause) => new DockerError({ reason: new StreamFailed({ message: cause.message, cause }) }))
        ),
        options
      ).pipe(withOperation(engine, "docker.Containers.copyTo", id)),
    copyFrom: (id, containerPath) =>
      Stream.unwrap(Effect.map(getArchive(id, containerPath), ({ bytes }) => {
        const fromTar = (error: DockerError | Tar.TarError): DockerError =>
          Tar.isTarError(error)
            ? new DockerError({
              reason: new InvalidResponse({ issue: error.message, cause: error }),
              operation: "docker.Containers.copyFrom"
            })
            : error
        return bytes.pipe(
          Stream.pipeThroughChannel(Tar.decode()),
          Stream.map((entry): Tar.Entry<DockerError> => ({
            header: entry.header,
            body: Stream.mapError(entry.body, fromTar)
          })),
          Stream.mapError(fromTar)
        )
      })).pipe(withStreamOperation(engine, "docker.Containers.copyFrom", id))
  })
})

/**
 * Provides {@link DockerContainers} over the `DockerEngine` in context, built with
 * {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.6
 */
export const layer: Layer.Layer<DockerContainers, never, DockerEngine> = Layer.effect(DockerContainers, make)
