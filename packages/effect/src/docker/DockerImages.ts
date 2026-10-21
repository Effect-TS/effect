/**
 * Images: list, inspect, pull, push, build, tag, remove, save, load, import,
 * commit, search and prune, the Registry's view of an image, and image
 * references ({@link ImageReference}).
 *
 * Long operations return the Engine's progress messages as a `Stream`, which
 * fails with `StreamFailed` on the first in-band error; run it to completion
 * to wait for the operation. `push` and `build` also come as an `Effect` of
 * their result: the pushed manifest, and the built image's ID.
 *
 * Every operation that talks to a Registry (pull, push, search, distribution) sends
 * the credential the `DockerEngine` resolves for that Registry in
 * `X-Registry-Auth`, anonymous as `{}`; a per-call `auth` replaces it. A build
 * sends only the credentials it is given, see {@link BuildOptions}.
 *
 * A `platform` takes the shape the Engine reads for each operation: a string
 * (`linux/arm64`) for `pull`, `import` and `build`, which default to the
 * configured `platform`, and an `OCIPlatform` object for `inspect`,
 * `history`, `push`, `save` and `load`, which have no default.
 *
 * **Example** (Pulling an image unless it is present)
 *
 * ```ts import.meta.vitest
 * import { Effect, Stream } from "effect"
 * import { DockerImages } from "effect/docker"
 *
 * const ensureImage = (reference: string) =>
 *   DockerImages.DockerImages.use((images) =>
 *     images.inspect(reference).pipe(
 *       Effect.asVoid,
 *       Effect.catchReason("DockerError", "NotFound", () => Stream.runDrain(images.pull(reference)))
 *     )
 *   )
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import type * as Redacted from "../Redacted.ts"
import * as Result from "../Result.ts"
import * as Schema from "../Schema.ts"
import type * as SchemaAST from "../SchemaAST.ts"
import * as SchemaIssue from "../SchemaIssue.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"
import * as Stream from "../Stream.ts"
import * as DockerApi from "./DockerApi.ts"
import * as DockerConfig from "./DockerConfig.ts"
import { apiClient, authConfig, DockerEngine, registryAuth } from "./DockerEngine.ts"
import { DockerError, InvalidReference, InvalidResponse, StreamFailed } from "./DockerError.ts"
import type * as DockerSchema from "./DockerSchema.ts"

// -----------------------------------------------------------------------------
// references
// -----------------------------------------------------------------------------

// the grammar of Docker's `distribution/reference`
const pathComponent = "[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*"
const domainComponent = "(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])"
const registryPattern = new RegExp(
  `^(?:${domainComponent}(?:\\.${domainComponent})*|\\[[a-fA-F0-9:]+\\])(?::[0-9]+)?$`
)
const repositoryPattern = new RegExp(`^${pathComponent}(?:/${pathComponent})*$`)

/**
 * An image reference: a repository in a Registry, with an optional tag and
 * digest, as Docker's `distribution/reference` defines it.
 *
 * **Details**
 *
 * `registry` is the Registry's host, with an optional port (`docker.io`,
 * `localhost:5000`); `repository` its lowercase path (`library/alpine`).
 * Without a tag or digest, the Engine pulls `latest`. The fields are checked
 * against the grammar, and the name (`registry/repository`) is at most 255
 * characters. References are equal when their fields are.
 *
 * Decode strings with {@link ImageReferenceFromString} or
 * {@link parseReference}, which also normalize them.
 *
 * **Example** (Building a reference)
 *
 * ```ts import.meta.vitest
 * import { DockerImages } from "effect/docker"
 *
 * const reference = new DockerImages.ImageReference({ registry: "ghcr.io", repository: "org/app", tag: "1.2" })
 * DockerImages.formatReference(reference) // => "ghcr.io/org/app:1.2"
 * ```
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export class ImageReference extends Schema.Class<ImageReference>("effect/docker/DockerImages/ImageReference")(
  Schema.Struct({
    registry: Schema.String.check(
      Schema.isPattern(registryPattern, { expected: "a registry host, with an optional port" })
    ),
    repository: Schema.String.check(
      Schema.isPattern(repositoryPattern, { expected: "lowercase path components separated by /" })
    ),
    tag: Schema.optional(
      Schema.String.check(Schema.isPattern(/^\w[\w.-]{0,127}$/, { expected: "a tag of up to 128 characters" }))
    ),
    digest: Schema.optional(
      Schema.String.check(
        Schema.isPattern(/^[A-Za-z][A-Za-z0-9]*(?:[-_+.][A-Za-z][A-Za-z0-9]*)*:[0-9a-fA-F]{32,}$/, {
          expected: "a digest such as sha256:<hex>"
        })
      )
    )
  }).check(
    Schema.makeFilter((self) =>
      self.registry.length + 1 + self.repository.length <= 255 || "the name is longer than 255 characters"
    )
  )
) {}

type ReferenceFields = typeof ImageReference.Encoded

const formatFields = (self: ReferenceFields): string =>
  `${self.registry}/${self.repository}${self.tag !== undefined ? `:${self.tag}` : ""}${
    self.digest !== undefined ? `@${self.digest}` : ""
  }`

/**
 * Formats a reference in full, as `registry/repository[:tag][@digest]`.
 *
 * @stability unstable
 * @category formatting
 * @since 4.0.6
 */
export const formatReference: (self: ImageReference) => string = formatFields

/**
 * Splits a reference as `ParseNormalizedNamed` does. The first path component
 * is the Registry if it contains `.` or `:`, is `localhost`, or has upper-case
 * letters; otherwise the Registry is `docker.io`, and a single-component
 * repository gets the `library/` prefix. `index.docker.io` is `docker.io`.
 */
const splitReference = (input: string): ReferenceFields | string => {
  if (/^[a-f0-9]{64}$/.test(input)) return "a 64-character hexadecimal string is an image ID, not a reference"
  let rest = input
  let digest: string | undefined
  const at = rest.indexOf("@")
  if (at !== -1) {
    digest = rest.slice(at + 1)
    rest = rest.slice(0, at)
  }
  let registry = "docker.io"
  const slash = rest.indexOf("/")
  if (slash !== -1) {
    const first = rest.slice(0, slash)
    if (/[.:]/.test(first) || first === "localhost" || first.toLowerCase() !== first) {
      registry = first === "index.docker.io" ? registry : first
      rest = rest.slice(slash + 1)
    }
  }
  let tag: string | undefined
  const colon = rest.lastIndexOf(":")
  if (colon !== -1) {
    tag = rest.slice(colon + 1)
    rest = rest.slice(0, colon)
  }
  if (rest.toLowerCase() !== rest) return "the repository must be lowercase"
  return {
    registry,
    repository: registry === "docker.io" && !rest.includes("/") ? `library/${rest}` : rest,
    ...(tag !== undefined ? { tag } : {}),
    ...(digest !== undefined ? { digest } : {})
  }
}

const decodeFields = (input: string, options: SchemaAST.ParseOptions) => {
  const fields = splitReference(input)
  return typeof fields === "string"
    ? Effect.fail(new SchemaIssue.InvalidValue({ message: fields }, input, options))
    : Effect.succeed(fields)
}

/**
 * An {@link ImageReference} from a string, normalized as Docker's
 * `distribution/reference` normalizes references (see {@link parseReference});
 * it encodes in full.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ImageReferenceFromString = Schema.String.pipe(
  Schema.decodeTo(
    ImageReference,
    SchemaTransformation.transformEffect<ReferenceFields, string>({
      decode: decodeFields,
      encode: (fields) => Effect.succeed(formatFields(fields))
    })
  )
)

const decodeReference = Schema.decodeUnknownResult(ImageReferenceFromString)

/**
 * Parses and normalizes an image reference as Docker's
 * `distribution/reference` does.
 *
 * **Details**
 *
 * The first path component is the Registry if it contains `.` or `:`, is
 * `localhost`, or has upper-case letters. Otherwise the Registry is
 * `docker.io`, and single-name images get the `library/` prefix.
 * `index.docker.io` normalizes to `docker.io`. A reference that doesn't fit
 * the grammar, has an upper-case repository, or is a 64-character image ID
 * fails with `InvalidReference`.
 *
 * **Example** (Parsing references)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { DockerImages } from "effect/docker"
 *
 * const hub = Result.getOrThrow(DockerImages.parseReference("alpine"))
 * hub.registry // => "docker.io"
 * hub.repository // => "library/alpine"
 * DockerImages.formatReference(hub) // => "docker.io/library/alpine"
 *
 * const local = Result.getOrThrow(DockerImages.parseReference("localhost:5000/team/app:1.2"))
 * local.registry // => "localhost:5000"
 * local.tag // => "1.2"
 *
 * Result.isFailure(DockerImages.parseReference("Alpine")) // => true
 * ```
 *
 * @stability unstable
 * @category parsing
 * @since 4.0.6
 */
export const parseReference = (input: string): Result.Result<ImageReference, DockerError> =>
  Result.mapError(
    decodeReference(input),
    (error) => new DockerError({ reason: new InvalidReference({ reference: input, issue: error.issue }) })
  )

/** A reference given as a string or an {@link ImageReference}. */
const referenceOf = (input: string | ImageReference): Effect.Effect<ImageReference, DockerError> =>
  typeof input === "string" ? Effect.fromResult(parseReference(input)) : Effect.succeed(input)

/**
 * What a push reports about the pushed manifest, in the Engine's own field
 * names.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const PushResult = Schema.Struct({
  Tag: Schema.optionalKey(Schema.String),
  Digest: Schema.optionalKey(Schema.String),
  Size: Schema.optionalKey(Schema.Number)
})

/**
 * What a push reports about the pushed manifest.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type PushResult = typeof PushResult.Type

const decodePushResult = Schema.decodeUnknownEffect(Schema.toCodecGoJson(PushResult))

// -----------------------------------------------------------------------------
// builds
// -----------------------------------------------------------------------------

/**
 * One element of a build's progress.
 *
 * **Details**
 *
 * - `Log`: build output, the classic builder's `stream` lines (`Step N/M`
 *   lines included);
 * - `Pull`: transfer progress of a base image being pulled.
 *
 * BuildKit reports its progress as `moby.buildkit.trace` messages, which
 * aren't decoded yet: a BuildKit build reports no progress, only its result.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type BuildProgress =
  | { readonly _tag: "Log"; readonly data: string }
  | {
    readonly _tag: "Pull"
    readonly id?: string | undefined
    readonly status?: string | undefined
    readonly current?: number | undefined
    readonly total?: number | undefined
  }

/**
 * The options of `build`.
 *
 * **Details**
 *
 * - `dockerfile`: a path inside the context (default `Dockerfile`).
 * - `builder`: `"classic"` or `"buildkit"`; omitted, the configured builder,
 *   else the Engine's default.
 * - `forceRemove` defaults to `true`, unlike the CLI: the classic builder
 *   otherwise leaks the container of a failed `RUN`.
 * - `buildArgs` values can be `Redacted`. The configured proxy is added as
 *   build args, unless they are set, as `docker build` does. Build args are
 *   redacted in spans.
 * - `auth` and `registries` are the credentials sent in `X-Registry-Config`,
 *   which only the classic builder uses: `auth` as given, `registries`
 *   resolved by the `DockerEngine`. Nothing else is sent.
 *
 * The rest are `POST /build`'s query parameters.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface BuildOptions {
  readonly dockerfile?: string | undefined
  readonly tags?: ReadonlyArray<string> | undefined
  readonly builder?: "classic" | "buildkit" | undefined
  readonly forceRemove?: boolean | undefined
  readonly remove?: boolean | undefined
  readonly target?: string | undefined
  readonly platform?: string | undefined
  readonly buildArgs?: Readonly<Record<string, string | Redacted.Redacted<string>>> | undefined
  readonly labels?: Readonly<Record<string, string>> | undefined
  readonly cacheFrom?: ReadonlyArray<string> | undefined
  readonly pull?: boolean | undefined
  readonly noCache?: boolean | undefined
  readonly quiet?: boolean | undefined
  readonly networkMode?: string | undefined
  readonly extraHosts?: ReadonlyArray<string> | undefined
  readonly shmSize?: number | undefined
  readonly memory?: number | undefined
  readonly memorySwap?: number | undefined
  readonly cpuShares?: number | undefined
  readonly cpuSetCpus?: string | undefined
  readonly cpuPeriod?: number | undefined
  readonly cpuQuota?: number | undefined
  readonly squash?: boolean | undefined
  readonly auth?: Readonly<Record<string, DockerConfig.Credential>> | undefined
  readonly registries?: ReadonlyArray<string> | undefined
}

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

/**
 * The Registry a search term names, as the Engine splits it: a first part
 * that contains `.` or `:` or is `localhost`, else Docker Hub.
 */
const searchRegistry = (term: string): string => {
  const slash = term.indexOf("/")
  const first = term.slice(0, slash)
  return slash !== -1 && (first.includes(".") || first.includes(":") || first === "localhost") ? first : "docker.io"
}

/**
 * The failure a progress or build message reports in band: its `errorDetail`,
 * or the deprecated `error` beside it.
 */
const inBandError = (
  errorDetail: { readonly message?: string | undefined } | undefined,
  error: string | undefined
): DockerError | undefined => {
  const text = errorDetail?.message ?? error
  return text === undefined && errorDetail === undefined
    ? undefined
    : new DockerError({ reason: new StreamFailed({ message: text ?? "" }) })
}

/** The messages of a progress stream, failing with `StreamFailed` on the first in-band error. */
const failOnError = <E>(
  messages: Stream.Stream<typeof DockerApi.Progress.Type, E>
): Stream.Stream<DockerSchema.ProgressMessage, E | DockerError> =>
  Stream.mapEffect(messages, ({ error, ...message }) => {
    const failure = inBandError(message.errorDetail, error)
    return failure === undefined ? Effect.succeed(message) : Effect.fail(failure)
  })

/** The ID a quiet build writes as its only output: `sha256:<hex>`. */
const quietId = /^(sha256:[0-9a-f]{64})\s*$/

const auxId = (aux: Schema.Json | undefined): string | undefined => {
  if (typeof aux !== "object" || aux === null || Array.isArray(aux)) return undefined
  const id = (aux as { readonly [key: string]: Schema.Json }).ID
  return typeof id === "string" ? id : undefined
}

/**
 * The progress of one build message, recording the image ID in `state`: from
 * `aux.ID` (classic builder, and BuildKit's `moby.image.id`), or the only
 * line of a quiet build. An in-band error fails with `StreamFailed`.
 */
const buildProgress = (
  state: { id: string | undefined },
  { error, ...message }: typeof DockerApi.BuildMessage.Type,
  quiet: boolean
): Effect.Effect<ReadonlyArray<BuildProgress>, DockerError> => {
  const failure = inBandError(message.errorDetail, error)
  if (failure !== undefined) return Effect.fail(failure)
  const id = auxId(message.aux)
  if (id !== undefined) {
    state.id = id
    return Effect.succeed([])
  }
  if (message.stream !== undefined) {
    // `q` discards everything but the image ID, `aux` included
    const quietMatch = quiet ? quietId.exec(message.stream) : null
    if (quietMatch !== null) state.id = quietMatch[1]
    return Effect.succeed([{ _tag: "Log", data: message.stream }])
  }
  if (message.status !== undefined || message.progressDetail !== undefined) {
    return Effect.succeed([{
      _tag: "Pull",
      ...(message.id !== undefined ? { id: message.id } : {}),
      ...(message.status !== undefined ? { status: message.status } : {}),
      ...(message.progressDetail?.current !== undefined ? { current: message.progressDetail.current } : {}),
      ...(message.progressDetail?.total !== undefined ? { total: message.progressDetail.total } : {})
    }])
  }
  // BuildKit's `moby.buildkit.trace` isn't decoded yet
  return Effect.succeed([])
}

// -----------------------------------------------------------------------------
// service
// -----------------------------------------------------------------------------

/**
 * The images API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.6
 */
export class DockerImages extends Context.Service<DockerImages, {
  /**
   * Lists images.
   *
   * **Details**
   *
   * [Engine API: ImageList](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageList).
   * `manifests` requires API 1.47 and `identity` 1.54.
   *
   * Typical reasons: `BadRequest`, `ConnectionFailed`, `OptionNotSupported`.
   */
  readonly list: (options?: {
    readonly all?: boolean | undefined
    readonly filters?: DockerApi.Filters | undefined
    readonly sharedSize?: boolean | undefined
    readonly digests?: boolean | undefined
    readonly manifests?: boolean | undefined
    readonly identity?: boolean | undefined
  }) => Effect.Effect<ReadonlyArray<DockerSchema.ImageSummary>, DockerError>
  /**
   * Inspects an image.
   *
   * **Details**
   *
   * [Engine API: ImageInspect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageInspect).
   * `manifests` requires API 1.48 and `platform` 1.49; they are mutually
   * exclusive.
   *
   * Typical reasons: `NotFound`, `ConnectionFailed`, `OptionNotSupported`.
   */
  readonly inspect: (
    name: string,
    options?: {
      readonly manifests?: boolean | undefined
      readonly platform?: DockerSchema.OCIPlatform | undefined
    }
  ) => Effect.Effect<DockerSchema.ImageInspect, DockerError>
  /**
   * Lists an image's layers.
   *
   * **Details**
   *
   * [Engine API: ImageHistory](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageHistory).
   * `platform` requires API 1.48.
   *
   * Typical reasons: `NotFound`, `ConnectionFailed`, `OptionNotSupported`.
   */
  readonly history: (
    name: string,
    options?: { readonly platform?: DockerSchema.OCIPlatform | undefined }
  ) => Effect.Effect<ReadonlyArray<DockerSchema.ImageHistoryResponseItem>, DockerError>
  /**
   * Lists the in-toto attestation statements attached to an image.
   *
   * **Details**
   *
   * [Engine API: ImageAttestations](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageAttestations).
   * The endpoint requires API 1.55. `type` filters by predicate type;
   * `statement` includes the verbatim statements.
   *
   * Typical reasons: `NotFound`, `NotImplemented`, `OptionNotSupported`,
   * `ConnectionFailed`.
   */
  readonly attestations: (
    name: string,
    options?: {
      readonly platform?: DockerSchema.OCIPlatform | undefined
      readonly type?: ReadonlyArray<string> | undefined
      readonly statement?: boolean | undefined
    }
  ) => Effect.Effect<ReadonlyArray<DockerSchema.AttestationStatement>, DockerError>
  /**
   * Tags an image.
   *
   * **Details**
   *
   * [Engine API: ImageTag](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageTag).
   * `target` is the new reference, such as `registry.example.com/app:1.0`; a
   * string is parsed with {@link parseReference}.
   *
   * Typical reasons: `NotFound`, `InvalidReference`, `BadRequest`, `Conflict`,
   * `ConnectionFailed`.
   */
  readonly tag: (name: string, target: string | ImageReference) => Effect.Effect<void, DockerError>
  /**
   * Removes an image.
   *
   * **Details**
   *
   * [Engine API: ImageDelete](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageDelete).
   * `platforms` requires API 1.50.
   *
   * Typical reasons: `NotFound`, `Conflict` (in use), `ConnectionFailed`,
   * `OptionNotSupported`.
   */
  readonly remove: (
    name: string,
    options?: {
      readonly force?: boolean | undefined
      readonly noPrune?: boolean | undefined
      readonly platforms?: ReadonlyArray<DockerSchema.OCIPlatform> | undefined
    }
  ) => Effect.Effect<ReadonlyArray<DockerSchema.ImageDeleteResponseItem>, DockerError>
  /**
   * Removes unused images.
   *
   * **Details**
   *
   * [Engine API: ImagePrune](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImagePrune).
   * Only dangling images are removed unless the `dangling: "false"` filter is
   * given.
   *
   * Typical reasons: `BadRequest`, `Conflict`, `ConnectionFailed`.
   */
  readonly prune: (options?: {
    readonly filters?: DockerApi.Filters | undefined
  }) => Effect.Effect<DockerSchema.ImagePruneResponse, DockerError>
  /**
   * Searches a Registry: the one the term starts with
   * (`registry.example.com/app`), else Docker Hub.
   *
   * **Details**
   *
   * [Engine API: ImageSearch](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageSearch).
   * The term names a Registry as the Engine reads it: its first `/`-separated
   * part, when that contains `.` or `:` or is `localhost`. The credential for
   * that Registry goes in `X-Registry-Auth`.
   *
   * Typical reasons: `Unauthorized`, `ServerError`, `CredentialsUnavailable`,
   * `ConnectionFailed`.
   */
  readonly search: (
    term: string,
    options?: {
      readonly limit?: number | undefined
      readonly filters?: DockerApi.Filters | undefined
      readonly auth?: DockerConfig.Credential | undefined
    }
  ) => Effect.Effect<ReadonlyArray<DockerSchema.ImageSearchResponseItem>, DockerError>
  /**
   * Creates an image from a container's changes.
   *
   * **Details**
   *
   * [Engine API: ImageCommit](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageCommit).
   * `config` is the image's `ContainerConfig`; `changes` are Dockerfile
   * instructions (`CMD`, `ENV`, …) applied to it, redacted in spans.
   *
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly commit: (
    container: string,
    options?: {
      readonly config?: DockerSchema.ContainerConfig | undefined
      readonly repo?: string | undefined
      readonly tag?: string | undefined
      readonly comment?: string | undefined
      readonly author?: string | undefined
      readonly pause?: boolean | undefined
      readonly changes?: ReadonlyArray<string> | undefined
    }
  ) => Effect.Effect<DockerSchema.IDResponse, DockerError>
  /**
   * Reads an image's descriptor and platforms from its Registry, without
   * pulling it.
   *
   * **Details**
   *
   * [Engine API: DistributionInspect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Distribution/operation/DistributionInspect).
   * A string reference is parsed with {@link parseReference}.
   *
   * Typical reasons: `Unauthorized`, `NotFound`, `InvalidReference`,
   * `CredentialsUnavailable`, `ConnectionFailed`.
   */
  readonly distribution: (
    reference: string | ImageReference,
    options?: { readonly auth?: DockerConfig.Credential | undefined }
  ) => Effect.Effect<DockerSchema.DistributionInspect, DockerError>
  /**
   * Exports images as a tar archive (`docker save`).
   *
   * **Details**
   *
   * [Engine API: ImageGet](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageGet)
   * and ImageGetAll for several names. `platform` requires API 1.48, and more
   * than one platform 1.52. The format is the Engine's: an OCI layout with a
   * `manifest.json` on Docker's containerd store.
   *
   * Typical reasons: `NotFound`, `ConnectionFailed`, `OptionNotSupported`.
   */
  readonly save: (
    names: string | ReadonlyArray<string>,
    options?: { readonly platform?: DockerSchema.OCIPlatform | ReadonlyArray<DockerSchema.OCIPlatform> | undefined }
  ) => Stream.Stream<Uint8Array, DockerError>
  /**
   * Loads images from a tar archive (`docker load`), and returns the progress
   * messages.
   *
   * **Details**
   *
   * [Engine API: ImageLoad](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageLoad).
   * The archive may be compressed; it streams to the Engine as
   * `application/x-tar`. `platform` requires API 1.48, and more than one
   * platform 1.52.
   *
   * Typical reasons: `BadRequest`, `StreamFailed`, `ConnectionFailed`,
   * `OptionNotSupported`.
   */
  readonly load: (
    archive: Stream.Stream<Uint8Array, DockerError>,
    options?: {
      readonly quiet?: boolean | undefined
      readonly platform?: DockerSchema.OCIPlatform | ReadonlyArray<DockerSchema.OCIPlatform> | undefined
    }
  ) => Stream.Stream<DockerSchema.ProgressMessage, DockerError>
  /**
   * Pulls an image, and returns the progress messages.
   *
   * **Details**
   *
   * [Engine API: ImageCreate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageCreate)
   * with `fromImage`. A string reference is parsed with
   * {@link parseReference}. Without a tag or digest, `latest` is pulled. The
   * configured platform applies unless `platform` is set. There is no
   * timeout.
   *
   * Typical reasons: `NotFound`, `Unauthorized`, `TooManyRequests`,
   * `StreamFailed`, `InvalidReference`, `CredentialsUnavailable`,
   * `ConnectionFailed`.
   */
  readonly pull: (
    reference: string | ImageReference,
    options?: {
      readonly platform?: string | undefined
      readonly auth?: DockerConfig.Credential | undefined
    }
  ) => Stream.Stream<DockerSchema.ProgressMessage, DockerError>
  /**
   * Pushes an image, and returns the progress messages.
   *
   * **Details**
   *
   * [Engine API: ImagePush](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImagePush).
   * A string reference is parsed with {@link parseReference}; its tag is
   * pushed, or every tag of the repository without one. `platform` selects one
   * manifest of a multi-platform image and requires API 1.46. The pushed
   * manifest is reported in an `aux` message.
   *
   * A Registry on `localhost` over plain HTTP works, as Docker treats it as
   * insecure by default.
   *
   * Typical reasons: `NotFound`, `Unauthorized`, `StreamFailed`,
   * `InvalidReference`, `CredentialsUnavailable`, `ConnectionFailed`,
   * `OptionNotSupported`.
   */
  readonly pushStream: (
    reference: string | ImageReference,
    options?: {
      readonly platform?: DockerSchema.OCIPlatform | undefined
      readonly auth?: DockerConfig.Credential | undefined
    }
  ) => Stream.Stream<DockerSchema.ProgressMessage, DockerError>
  /**
   * Pushes an image, and returns what the Engine reports about the pushed
   * manifest.
   *
   * **Details**
   *
   * Drains `pushStream`. The result is the `aux` with the manifest's
   * `Tag`, `Digest` and `Size`; Docker's containerd image store may report
   * only other data, and the fields are then absent.
   *
   * Typical reasons: as for `pushStream`.
   */
  readonly push: (
    reference: string | ImageReference,
    options?: {
      readonly platform?: DockerSchema.OCIPlatform | undefined
      readonly auth?: DockerConfig.Credential | undefined
    }
  ) => Effect.Effect<PushResult, DockerError>
  /**
   * Imports a filesystem tarball as an image, and returns the progress
   * messages.
   *
   * **Details**
   *
   * [Engine API: ImageCreate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageCreate)
   * with `fromSrc`. `source` is the tarball (streamed as `application/x-tar`)
   * or a URL the Engine fetches, redacted in spans. `changes` are Dockerfile
   * instructions applied to the image, redacted in spans. The configured
   * platform applies unless `platform` is set. Name the image with `repo` and
   * `tag`, then inspect it.
   *
   * Typical reasons: `BadRequest`, `StreamFailed`, `ConnectionFailed`.
   */
  readonly import: (
    source: Stream.Stream<Uint8Array, DockerError> | string,
    options?: {
      readonly repo?: string | undefined
      readonly tag?: string | undefined
      readonly message?: string | undefined
      readonly changes?: ReadonlyArray<string> | undefined
      readonly platform?: string | undefined
    }
  ) => Stream.Stream<DockerSchema.ProgressMessage, DockerError>
  /**
   * Builds an image, and returns its progress.
   *
   * **Details**
   *
   * [Engine API: ImageBuild](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageBuild).
   * See {@link BuildOptions} and `build`. The stream fails with
   * `StreamFailed` on the build's first error.
   */
  readonly buildStream: (
    context: Stream.Stream<Uint8Array, DockerError> | string,
    options?: BuildOptions
  ) => Stream.Stream<BuildProgress, DockerError>
  /**
   * Builds an image from a build context, and returns its ID.
   *
   * **Details**
   *
   * [Engine API: ImageBuild](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/ImageBuild).
   * The context is a tar, sent byte for byte: plain, or compressed with gzip,
   * bzip2, xz or zstd (the Engine decompresses it). The client doesn't
   * assemble it and applies no `.dockerignore`. Put the Dockerfile in it, and
   * name it with `dockerfile` when it isn't `Dockerfile`; for BuildKit, make
   * it the first entry, with a short ASCII path (a plain USTAR header), since
   * without a session BuildKit only recognizes such a context.
   *
   * The context can also be a URL the Engine fetches, redacted in spans: a Git
   * repository (`https://github.com/org/repo.git#ref:dir`, `git@…`), or the
   * HTTP(S) URL of a tar or of a lone Dockerfile. Nothing is uploaded, and
   * `dockerfile` is a path inside the fetched context.
   *
   * The ID comes from `aux.ID` (classic builder) or `moby.image.id`
   * (BuildKit); `Successfully built` is never scraped. A `quiet` build's only
   * output is the ID, which is then read from it.
   *
   * Credentials go only where they are asked for, see {@link BuildOptions}.
   * **BuildKit can't use them**: without a `/session`, which this client
   * doesn't speak, BuildKit pulls anonymously. To build from a private base
   * image with `builder: "buildkit"`, pull it first with `pull` and build
   * without `pull: true`: BuildKit then uses the local image.
   *
   * Typical reasons: `StreamFailed` (the build failed), `BadRequest` (on the
   * classic builder, a Dockerfile parse error), `CredentialsUnavailable`,
   * `ConnectionFailed`.
   *
   * **Example** (Building from a tar made with `effect/encoding/Tar`)
   *
   * ```ts import.meta.vitest
   * import { Effect, Stream } from "effect"
   * import { DockerImages } from "effect/docker"
   * import { Tar } from "effect/encoding"
   *
   * const program = Effect.gen(function*() {
   *   const images = yield* DockerImages.DockerImages
   *   const context = Stream.make(
   *     Tar.file("Dockerfile", "FROM alpine:3.22\nARG NODE_ENV\nRUN echo $NODE_ENV\n")
   *   ).pipe(Stream.pipeThroughChannel(Tar.encode()), Stream.orDie)
   *   const { id } = yield* images.build(context, {
   *     tags: ["my-app:dev"],
   *     buildArgs: { NODE_ENV: "production" }
   *   })
   *   return id
   * })
   * ```
   */
  readonly build: (
    context: Stream.Stream<Uint8Array, DockerError> | string,
    options?: BuildOptions
  ) => Effect.Effect<{ readonly id: string }, DockerError>
}>()("effect/docker/DockerImages") {}

/**
 * Builds the {@link DockerImages} service over the `DockerEngine` in context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make: Effect.Effect<DockerImages["Service"], never, DockerEngine> = Effect.gen(function*() {
  const engine = yield* DockerEngine
  const api = yield* apiClient(engine, DockerApi.Images, "docker.Images")
  const { config } = engine

  /** `X-Registry-Auth` for a registry: the call's `auth`, otherwise the engine's credential. */
  const registryAuthOf = (registry: string, auth: DockerConfig.Credential | undefined) =>
    registryAuth(engine, registry, auth)

  const load: DockerImages["Service"]["load"] = (archive, options) =>
    failOnError(api.load({ query: options ?? {}, payload: archive }))

  const pull: DockerImages["Service"]["pull"] = (input, options) =>
    Stream.unwrap(Effect.gen(function*() {
      const reference = yield* referenceOf(input)
      const auth = yield* registryAuthOf(reference.registry, options?.auth)
      return failOnError(api.pull({
        query: {
          fromImage: `${reference.registry}/${reference.repository}`,
          // a digest goes in `tag` too; without a tag, the Engine pulls every tag
          tag: reference.digest ?? reference.tag ?? "latest",
          platform: options?.platform ?? config.platform
        },
        headers: { "x-registry-auth": auth }
      }))
    }))

  const pushStream: DockerImages["Service"]["pushStream"] = (input, options) =>
    Stream.unwrap(Effect.gen(function*() {
      const reference = yield* referenceOf(input)
      const auth = yield* registryAuthOf(reference.registry, options?.auth)
      return failOnError(api.push({
        params: { name: `${reference.registry}/${reference.repository}` },
        query: { tag: reference.tag, platform: options?.platform },
        headers: { "x-registry-auth": auth }
      }))
    }))

  const importImage: DockerImages["Service"]["import"] = (source, options) => {
    const query = { ...options, platform: options?.platform ?? config.platform }
    return failOnError(
      typeof source === "string"
        ? api.importUrl({ query: { ...query, fromSrc: source } })
        : api.importArchive({ query: { ...query, fromSrc: "-" }, payload: source })
    )
  }

  /** The progress of a build, recording its image ID in `state`. */
  const buildWith = (
    context: Stream.Stream<Uint8Array, DockerError> | string,
    options: BuildOptions | undefined,
    state: { id: string | undefined }
  ): Stream.Stream<BuildProgress, DockerError> => {
    const { auth, buildArgs, registries, ...query } = options ?? {}
    // the configured proxy, unless the build sets the same args, as `docker build` adds it
    const proxyArgs = Object.fromEntries(DockerConfig.proxyVariables(config.proxy))
    const credentials = Effect.map(
      Effect.forEach(
        registries ?? [],
        (registry) => Effect.map(engine.credential(registry), (credential) => [registry, credential] as const)
      ),
      (resolved) => {
        // keyed and addressed as the Engine looks a registry up; a given credential wins
        const out: Record<string, DockerApi.AuthConfig> = {}
        for (const [registry, credential] of [...resolved, ...Object.entries(auth ?? {})]) {
          if (credential === undefined) continue
          const config = authConfig(registry, credential)
          out[DockerConfig.normalizeRegistry(registry)] = config
        }
        return Object.keys(out).length === 0 ? undefined : out
      }
    )
    return Stream.unwrap(Effect.map(credentials, (registryConfig) => {
      const request = {
        query: {
          ...query,
          builder: query.builder ?? config.builder,
          forceRemove: query.forceRemove ?? true,
          platform: query.platform ?? config.platform,
          buildArgs: buildArgs === undefined && Object.keys(proxyArgs).length === 0
            ? undefined
            : { ...proxyArgs, ...buildArgs }
        },
        headers: { "x-registry-config": registryConfig }
      }
      return (typeof context === "string"
        ? api.buildRemote({ ...request, query: { ...request.query, remote: context } })
        : api.build({ ...request, payload: context })).pipe(
          Stream.mapEffect((message) => buildProgress(state, message, query.quiet === true)),
          Stream.flattenIterable
        )
    }))
  }

  return DockerImages.of({
    list: (options) => api.list({ query: options ?? {} }),
    inspect: (name, options) => api.inspect({ params: { name }, query: options ?? {} }),
    history: (name, options) => api.history({ params: { name }, query: options ?? {} }),
    attestations: (name, options) => api.attestations({ params: { name }, query: options ?? {} }),
    tag: (name, target) =>
      Effect.flatMap(
        referenceOf(target),
        (target) =>
          api.tag({ params: { name }, query: { repo: `${target.registry}/${target.repository}`, tag: target.tag } })
      ),
    remove: (name, options) => api.remove({ params: { name }, query: options ?? {} }),
    prune: (options) => api.prune({ query: options ?? {} }),
    search: Effect.fnUntraced(function*(term, options) {
      const { auth: own, ...query } = options ?? {}
      const auth = yield* registryAuthOf(searchRegistry(term), own)
      return yield* api.search({ query: { ...query, term }, headers: { "x-registry-auth": auth } })
    }),
    commit: (container, options) => {
      const { config, ...query } = options ?? {}
      return api.commit({ query: { ...query, container }, payload: config ?? {} })
    },
    distribution: Effect.fnUntraced(function*(input, options) {
      const reference = yield* referenceOf(input)
      const auth = yield* registryAuthOf(reference.registry, options?.auth)
      return yield* api.distribution({
        params: { name: formatReference(reference) },
        headers: { "x-registry-auth": auth }
      })
    }),
    save: (names, options) =>
      typeof names === "string"
        ? api.save({ params: { name: names }, query: options ?? {} })
        : api.saveAll({ query: { ...options, names } }),
    load,
    pull,
    pushStream,
    push: (reference, options) =>
      pushStream(reference, options).pipe(
        // the manifest's `{ Tag, Digest, Size }`; Docker's containerd store sends other `aux` data too
        Stream.runFold(
          () => ({}) as Readonly<Record<string, Schema.Json>>,
          (result, message) =>
            message.aux !== undefined && (message.aux.Digest !== undefined || result.Digest === undefined)
              ? message.aux
              : result
        ),
        Effect.flatMap((aux) =>
          Effect.mapError(decodePushResult(aux), (cause) =>
            new DockerError({
              reason: new InvalidResponse({ issue: cause.message, operation: "docker.Images.push", cause })
            }))
        )
      ),
    import: importImage,
    buildStream: (context, options) => Stream.suspend(() => buildWith(context, options, { id: undefined })),
    build: (context, options) =>
      Effect.suspend(() => {
        const state: { id: string | undefined } = { id: undefined }
        return buildWith(context, options, state).pipe(
          Stream.runDrain,
          Effect.flatMap(() =>
            state.id !== undefined ? Effect.succeed({ id: state.id }) : Effect.fail(
              new DockerError({
                reason: new InvalidResponse({
                  issue: "the build ended without reporting an image ID",
                  operation: "docker.Images.build"
                })
              })
            )
          )
        )
      })
  })
})

/**
 * Provides {@link DockerImages} over the `DockerEngine` in context, built with
 * {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.6
 */
export const layer: Layer.Layer<DockerImages, never, DockerEngine> = Layer.effect(DockerImages, make)
