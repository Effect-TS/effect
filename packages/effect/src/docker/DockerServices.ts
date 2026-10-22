/**
 * Swarm services: list, inspect, create, update, roll back and remove, and
 * their logs. Only a manager answers; elsewhere every operation fails with
 * `SwarmUnavailable`.
 *
 * Specs are `DockerApi.ServiceSpec`, the generated one with `Redacted` `Env`
 * entries allowed, sent as given: the image is neither tagged nor pinned
 * unless `resolveImage` asks for it, and registry credentials are sent only
 * when `registryAuth` or `auth` asks for them (see
 * {@link ImageOptions}). An update replaces the whole spec and takes the
 * service's version from `inspect`.
 *
 * **Example** (Running a replicated service)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { DockerServices } from "effect/docker"
 *
 * const program = Effect.gen(function*() {
 *   const services = yield* DockerServices.DockerServices
 *   const { ID } = yield* services.create({
 *     Name: "web",
 *     TaskTemplate: { ContainerSpec: { Image: "nginx:1.29" } },
 *     Mode: { Replicated: { Replicas: 3 } },
 *     EndpointSpec: { Ports: [{ TargetPort: 80, PublishedPort: 8080 }] }
 *   }, { resolveImage: true })
 *   return ID
 * })
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Context from "../Context.ts"
import type * as DateTime from "../DateTime.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Stream from "../Stream.ts"
import * as DockerApi from "./DockerApi.ts"
import type * as DockerConfig from "./DockerConfig.ts"
import { type LogFrame, logsQuery } from "./DockerContainers.ts"
import { apiClient, authConfig, DockerEngine, withOperation, withStreamOperation } from "./DockerEngine.ts"
import { DockerError, InvalidResponse } from "./DockerError.ts"
import { frames, fromContentType } from "./DockerExec.ts"
import * as DockerImages from "./DockerImages.ts"
import type * as DockerSchema from "./DockerSchema.ts"

/**
 * The image options of `create` and `update`.
 *
 * **Details**
 *
 * - `registryAuth: true` sends the credential the `DockerEngine` resolves
 *   for the image's Registry, so that the nodes can pull a private image;
 *   `auth` sends the given one instead. Without either, the Engine sends no
 *   credential (on `update`, `registryAuthFrom` picks a stored one).
 * - `resolveImage: true` pins the image as `docker service create` does: it
 *   adds `latest` to an untagged image, pins the digest the Registry reports
 *   for it (`DockerImages`' `distribution`, with the same credential), and
 *   sets `TaskTemplate.Placement.Platforms` to the image's platforms.
 *   Attestation entries are skipped, and `arm` matches any architecture,
 *   because nodes report `armv7l`. When the Registry can't be asked, the
 *   image goes as it is and the result's `Warnings` say so.
 *
 * With any of them, `TaskTemplate.ContainerSpec.Image` must be a valid
 * reference, which names the Registry: otherwise the call fails with
 * `InvalidReference` before anything is sent.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ImageOptions {
  readonly registryAuth?: boolean | undefined
  readonly auth?: DockerConfig.Credential | undefined
  readonly resolveImage?: boolean | undefined
}

/**
 * The options of service and task logs.
 *
 * **Details**
 *
 * Both `stdout` and `stderr` are included by default: an unset one is
 * included unless the other is `true`. With `follow`
 * the stream continues until it is interrupted; there is no timeout. `since`
 * takes any `DateTime.Input`; `tail` is a line count or `"all"`. The Engine
 * ignores an `until`, so there is none. `details` prefixes each line with
 * its attributes, which {@link parseLogLine} reads.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface LogsOptions {
  readonly follow?: boolean | undefined
  readonly stdout?: boolean | undefined
  readonly stderr?: boolean | undefined
  readonly since?: DateTime.DateTime.Input | undefined
  readonly timestamps?: boolean | undefined
  readonly tail?: number | "all" | undefined
  readonly details?: boolean | undefined
}

/**
 * A line of service or task logs, as {@link parseLogLine} reads it.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface LogLine {
  /** The line's RFC 3339 timestamp, with `timestamps`. */
  readonly timestamp: string | undefined
  /** The line's attributes, with `details`: the task, service and node IDs, and the log driver's labels and env. */
  readonly details: Readonly<Record<string, string>>
  readonly message: string
}

/** Go's `url.QueryUnescape`; a malformed escape stays as it is. */
const queryUnescape = (text: string): string => {
  const plain = text.replaceAll("+", " ")
  try {
    return decodeURIComponent(plain)
  } catch {
    return plain
  }
}

/**
 * Reads a line of service or task logs requested with `details`: its
 * timestamp (with `timestamps`), its attributes and its message.
 *
 * **Details**
 *
 * The Engine writes `[<timestamp> ]<attributes> <message>`, the attributes as
 * `key=value` pairs joined by `,`, query-escaped, and sorted by key. Split
 * the logs into lines first: a TTY's raw output doesn't come a line per
 * frame.
 *
 * **Example** (Reading the task of each line)
 *
 * ```ts import.meta.vitest
 * import { DockerServices } from "effect/docker"
 *
 * const line = DockerServices.parseLogLine(
 *   "com.docker.swarm.node.id=n1,com.docker.swarm.service.id=s1,com.docker.swarm.task.id=t1,team=a+b hello"
 * )
 * line.details["com.docker.swarm.task.id"] // => "t1"
 * line.details.team // => "a b"
 * line.message // => "hello"
 * ```
 *
 * @stability unstable
 * @category parsing
 * @since 4.0.6
 */
export const parseLogLine = (line: string, options?: { readonly timestamps?: boolean | undefined }): LogLine => {
  let rest = line
  let timestamp: string | undefined
  if (options?.timestamps === true) {
    const space = rest.indexOf(" ")
    timestamp = space === -1 ? rest : rest.slice(0, space)
    rest = space === -1 ? "" : rest.slice(space + 1)
  }
  const space = rest.indexOf(" ")
  const token = space === -1 ? rest : rest.slice(0, space)
  const details: Record<string, string> = {}
  if (token !== "") {
    for (const pair of token.split(",")) {
      const equals = pair.indexOf("=")
      if (equals === -1) details[queryUnescape(pair)] = ""
      else details[queryUnescape(pair.slice(0, equals))] = queryUnescape(pair.slice(equals + 1))
    }
  }
  return { timestamp, details, message: space === -1 ? "" : rest.slice(space + 1) }
}

// -----------------------------------------------------------------------------
// logs
// -----------------------------------------------------------------------------

/**
 * The frames of a service's or task's logs. From API 1.42 the Engine always
 * names the framing in the `Content-Type`.
 *
 * @internal
 */
export const logFrames = (
  logs: {
    readonly headers: { readonly "content-type"?: string | undefined }
    readonly body: Stream.Stream<Uint8Array, DockerError>
  },
  operation: string
): Stream.Stream<LogFrame, DockerError> => {
  const framing = fromContentType(logs.headers["content-type"])
  return framing === undefined
    ? Stream.fail(
      new DockerError({ reason: new InvalidResponse({ issue: "the logs have no stream Content-Type", operation }) })
    )
    : frames(logs.body, framing)
}

// -----------------------------------------------------------------------------
// service
// -----------------------------------------------------------------------------

/**
 * The services API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.6
 */
export class DockerServices extends Context.Service<DockerServices, {
  /**
   * Lists services.
   *
   * **Details**
   *
   * [Engine API: ServiceList](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Service/operation/ServiceList).
   * Filters: `id`, `label`, `mode` (`replicated`, `global`) and `name`.
   * `status` adds each service's `ServiceStatus` (running and desired
   * tasks).
   *
   * Typical reasons: `SwarmUnavailable`, `BadRequest` for an invalid filter,
   * `ConnectionFailed`.
   */
  readonly list: (options?: {
    readonly filters?: DockerApi.Filters | undefined
    readonly status?: boolean | undefined
  }) => Effect.Effect<ReadonlyArray<DockerSchema.Service>, DockerError>
  /**
   * Inspects a service, by ID or name.
   *
   * **Details**
   *
   * [Engine API: ServiceInspect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Service/operation/ServiceInspect).
   * `insertDefaults` fills in the spec's unset fields with the Engine's
   * defaults.
   *
   * Typical reasons: `NotFound`, `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly inspect: (
    id: string,
    options?: { readonly insertDefaults?: boolean | undefined }
  ) => Effect.Effect<DockerSchema.Service, DockerError>
  /**
   * Creates a service, and returns its ID and the warnings about it.
   *
   * **Details**
   *
   * [Engine API: ServiceCreate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Service/operation/ServiceCreate).
   * See {@link ImageOptions}. The Engine accepts an image it can't pull: its
   * tasks fail instead. `ContainerSpec.OomScoreAdj` and
   * `ContainerSpec.Mounts.TmpfsOptions.Options` require API 1.46, and
   * `Resources.SwapBytes` and `Resources.MemorySwappiness` 1.52.
   *
   * Typical reasons: `Conflict` (the name is taken), `BadRequest`,
   * `Forbidden`, `InvalidReference`, `CredentialsUnavailable`,
   * `SwarmUnavailable`, `ConnectionFailed`, `OptionNotSupported`.
   */
  readonly create: (
    spec: DockerApi.ServiceSpec,
    options?: ImageOptions
  ) => Effect.Effect<DockerSchema.ServiceCreateResponse, DockerError>
  /**
   * Updates a service's spec, and returns the warnings about it.
   *
   * **Details**
   *
   * [Engine API: ServiceUpdate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Service/operation/ServiceUpdate).
   * The spec replaces the current one: start from `inspect`'s `Spec`.
   * `version` is `inspect`'s `Version.Index`; when the service changed
   * since, the Engine fails with `ServerError` and the message `update out of
   * sequence`, and the update needs a fresh `inspect`. Without a credential
   * (see {@link ImageOptions}), `registryAuthFrom` picks the one stored with
   * the current (`spec`, the default) or the previous spec. The gates are
   * `create`'s.
   *
   * Typical reasons: `NotFound`, `BadRequest`, `ServerError` (out of
   * sequence), `InvalidReference`, `CredentialsUnavailable`,
   * `SwarmUnavailable`, `ConnectionFailed`, `OptionNotSupported`.
   */
  readonly update: (
    id: string,
    spec: DockerApi.ServiceSpec,
    options: ImageOptions & {
      readonly version: number
      readonly registryAuthFrom?: "spec" | "previous-spec" | undefined
    }
  ) => Effect.Effect<DockerSchema.ServiceUpdateResponse, DockerError>
  /**
   * Rolls a service back to its previous spec, and returns the warnings
   * about it.
   *
   * **Details**
   *
   * [Engine API: ServiceUpdate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Service/operation/ServiceUpdate)
   * with `rollback=previous`. It inspects the service and sends its current
   * spec and version, as `docker service rollback` does: the Engine checks
   * the spec but rolls back to `PreviousSpec`.
   *
   * Typical reasons: `BadRequest` (no previous spec), `NotFound`,
   * `ServerError` (out of sequence), `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly rollback: (id: string) => Effect.Effect<DockerSchema.ServiceUpdateResponse, DockerError>
  /**
   * Removes a service.
   *
   * **Details**
   *
   * [Engine API: ServiceDelete](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Service/operation/ServiceDelete).
   * Typical reasons: `NotFound`, `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly remove: (id: string) => Effect.Effect<void, DockerError>
  /**
   * Streams the logs of a service's tasks.
   *
   * **Details**
   *
   * [Engine API: ServiceLogs](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Service/operation/ServiceLogs).
   * See {@link LogsOptions}. Only some log drivers can be read (`json-file`
   * and `journald`, for example). The framing follows the response's
   * content type, which follows the service's TTY: with a TTY every frame is
   * `"stdout"`.
   *
   * Typical reasons: `NotFound`, `BadRequest`, `SwarmUnavailable`,
   * `ConnectionFailed`, `StreamFailed`.
   */
  readonly logs: (id: string, options?: LogsOptions) => Stream.Stream<LogFrame, DockerError>
}>()("effect/docker/DockerServices") {}

/** Skips attestations, matches `arm` on any architecture (nodes report `armv7l`), and drops duplicates. */
const placementPlatforms = (
  platforms: ReadonlyArray<DockerSchema.OCIPlatform>
): Array<DockerSchema.Platform> => {
  const seen = new Set<string>()
  const out: Array<DockerSchema.Platform> = []
  for (const platform of platforms) {
    if (platform.os === "unknown" || platform.architecture === "unknown") continue
    const architecture = platform.architecture?.toLowerCase() === "arm" ? "" : platform.architecture ?? ""
    const os = platform.os ?? ""
    if (seen.has(`${os}/${architecture}`)) continue
    seen.add(`${os}/${architecture}`)
    out.push({ Architecture: architecture, OS: os })
  }
  return out
}

/**
 * Builds the {@link DockerServices} service over the `DockerEngine` in
 * context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make: Effect.Effect<DockerServices["Service"], never, DockerEngine> = Effect.gen(function*() {
  const engine = yield* DockerEngine
  const api = yield* apiClient(engine, DockerApi.Services, "docker.Services")
  const images = yield* DockerImages.make

  /** The spec as `options` asks to send it, its `X-Registry-Auth`, and the warnings about its image. */
  const prepare = Effect.fnUntraced(function*(
    spec: DockerApi.ServiceSpec,
    options: ImageOptions | undefined
  ) {
    if (options?.registryAuth !== true && options?.auth === undefined && options?.resolveImage !== true) {
      return { spec, auth: undefined, warnings: [] }
    }
    const image = spec.TaskTemplate?.ContainerSpec?.Image ?? ""
    const reference = yield* Effect.fromResult(DockerImages.parseReference(image))
    const credential = options.auth ?? (options.registryAuth === true
      ? yield* engine.credential(reference.registry)
      : undefined)
    const auth = credential === undefined ? undefined : authConfig(reference.registry, credential)
    if (options.resolveImage !== true) return { spec, auth, warnings: [] }

    const tagged = reference.tag === undefined && reference.digest === undefined
      ? new DockerImages.ImageReference({ ...reference, tag: "latest" })
      : reference
    const withImage = (image: string, platforms?: Array<DockerSchema.Platform>) => ({
      ...spec,
      TaskTemplate: {
        ...spec.TaskTemplate,
        ContainerSpec: { ...spec.TaskTemplate?.ContainerSpec, Image: image },
        ...(platforms === undefined || platforms.length === 0
          ? {}
          : { Placement: { ...spec.TaskTemplate?.Placement, Platforms: platforms } })
      }
    })
    const distribution = yield* Effect.result(images.distribution(tagged, { auth: credential }))
    const digest = distribution._tag === "Success" ? distribution.success.Descriptor.digest : undefined
    if (distribution._tag === "Failure" || digest === undefined) {
      const why = distribution._tag === "Failure" ? distribution.failure.message : "the Registry reported no digest"
      return {
        spec: withImage(DockerImages.formatReference(tagged)),
        auth,
        warnings: [
          `image ${image} could not be resolved on its Registry to pin its digest (${why}); ` +
          `each node pulls it independently, so they may run different versions`
        ]
      }
    }
    const pinned = tagged.digest === undefined ? new DockerImages.ImageReference({ ...tagged, digest }) : tagged
    return {
      spec: withImage(DockerImages.formatReference(pinned), placementPlatforms(distribution.success.Platforms)),
      auth,
      warnings: []
    }
  })

  const inspect: DockerServices["Service"]["inspect"] = (id, options) =>
    api.inspect({ params: { id }, query: options ?? {} })

  return DockerServices.of({
    list: (options) => api.list({ query: options ?? {} }),
    inspect,
    create: (spec, options) =>
      Effect.gen(function*() {
        const prepared = yield* prepare(spec, options)
        const response = yield* api.create({ headers: { "x-registry-auth": prepared.auth }, payload: prepared.spec })
        return { ...response, Warnings: [...prepared.warnings, ...response.Warnings ?? []] }
      }).pipe(withOperation(engine, "docker.Services.create", spec.Name)),
    update: (id, spec, options) =>
      Effect.gen(function*() {
        const prepared = yield* prepare(spec, options)
        const response = yield* api.update({
          params: { id },
          query: { version: options.version, registryAuthFrom: options.registryAuthFrom },
          headers: { "x-registry-auth": prepared.auth },
          payload: prepared.spec
        })
        return { ...response, Warnings: [...prepared.warnings, ...response.Warnings ?? []] }
      }).pipe(withOperation(engine, "docker.Services.update", id)),
    rollback: (id) =>
      Effect.flatMap(inspect(id), (service) =>
        api.update({
          params: { id },
          // the Engine checks the spec, then rolls back to the previous one
          query: { version: service.Version?.Index ?? 0, rollback: "previous" },
          headers: {},
          payload: service.Spec ?? {}
        })).pipe(withOperation(engine, "docker.Services.rollback", id)),
    remove: (id) => api.remove({ params: { id } }),
    logs: (id, options) =>
      Stream.unwrap(
        Effect.map(
          api.logs({ params: { id }, query: logsQuery(options) }),
          (logs) => logFrames(logs, "docker.Services.logs")
        )
      ).pipe(withStreamOperation(engine, "docker.Services.logs", id))
  })
})

/**
 * Provides {@link DockerServices} over the `DockerEngine` in context, built
 * with {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.6
 */
export const layer: Layer.Layer<DockerServices, never, DockerEngine> = Layer.effect(DockerServices, make)
