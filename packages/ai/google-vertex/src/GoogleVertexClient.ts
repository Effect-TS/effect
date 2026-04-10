/**
 * @since 1.0.0
 */
import * as Generated from "@effect/ai-google/Generated"
import * as AiError from "@effect/ai/AiError"
import * as Sse from "@effect/experimental/Sse"
import * as Headers from "@effect/platform/Headers"
import * as HttpBody from "@effect/platform/HttpBody"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as UrlParams from "@effect/platform/UrlParams"
import * as Arr from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import { GoogleVertexConfig } from "./GoogleVertexConfig.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class GoogleVertexClient extends Context.Tag(
  "@effect/ai-google-vertex/GoogleVertexClient"
)<GoogleVertexClient, Service>() {}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  readonly streamRequest: <A, I, R>(
    request: HttpClientRequest.HttpClientRequest,
    schema: Schema.Schema<A, I, R>
  ) => Stream.Stream<A, AiError.AiError, R>

  readonly generateContent: (
    request: typeof Generated.GenerateContentRequest.Encoded
  ) => Effect.Effect<Generated.GenerateContentResponse, AiError.AiError>

  readonly generateContentStream: (
    request: typeof Generated.GenerateContentRequest.Encoded
  ) => Stream.Stream<Generated.GenerateContentResponse, AiError.AiError>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  /**
   * The GCP project ID.
   */
  readonly project: string

  /**
   * The GCP location / region (e.g. `"us-central1"`).
   */
  readonly location: string

  /**
   * An OAuth2 access token for authenticating with Vertex AI.
   *
   * Sent as `Authorization: Bearer <token>`. When omitted, authentication
   * must be handled via `transformClient` (e.g. injecting a fresh token on
   * each request from ADC or a token-refresh Effect).
   */
  readonly accessToken?: Redacted.Redacted | undefined

  /**
   * The Vertex AI API version.
   *
   * Defaults to `"v1"`.
   */
  readonly apiVersion?: "v1" | "v1beta1" | undefined

  /**
   * Override the base URL for the Vertex AI API.
   *
   * Defaults to the regional endpoint:
   * `https://{location}-aiplatform.googleapis.com`
   */
  readonly apiUrl?: string | undefined

  /**
   * A method which can be used to transform the underlying `HttpClient` which
   * will be used to communicate with the Vertex AI API.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Effect.Effect<Service, never, HttpClient.HttpClient | Scope.Scope> =>
  Effect.gen(function*() {
    const authHeader = "authorization"

    yield* Effect.locallyScopedWith(Headers.currentRedactedNames, Arr.append(authHeader))

    const baseUrl = options.apiUrl ?? `https://${options.location}-aiplatform.googleapis.com`
    const apiVersion = options.apiVersion ?? "v1"
    const pathPrefix =
      `/${apiVersion}/projects/${options.project}/locations/${options.location}/publishers/google/models`

    let httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest((request) =>
        request.pipe(
          HttpClientRequest.prependUrl(baseUrl),
          options.accessToken
            ? (r) => HttpClientRequest.bearerToken(r, options.accessToken!)
            : identity,
          HttpClientRequest.acceptJson
        )
      )
    )

    httpClient = options.transformClient ? options.transformClient(httpClient) : httpClient

    const httpClientOk = HttpClient.filterStatusOk(httpClient)

    const streamRequest = <A, I, R>(
      request: HttpClientRequest.HttpClientRequest,
      schema: Schema.Schema<A, I, R>
    ): Stream.Stream<A, AiError.AiError, R> => {
      const decodeEvents = Schema.decode(Schema.ChunkFromSelf(Schema.parseJson(schema)))
      return httpClientOk.execute(request).pipe(
        Effect.map((r) => r.stream),
        Stream.unwrap,
        Stream.decodeText(),
        Stream.pipeThroughChannel(Sse.makeChannel()),
        Stream.mapChunksEffect((chunk) => decodeEvents(Chunk.map(chunk, (event) => event.data))),
        Stream.catchTags({
          RequestError: (error) =>
            AiError.HttpRequestError.fromRequestError({
              module: "GoogleVertexClient",
              method: "streamRequest",
              error
            }),
          ResponseError: (error) =>
            AiError.HttpResponseError.fromResponseError({
              module: "GoogleVertexClient",
              method: "streamRequest",
              error
            }),
          ParseError: (error) =>
            AiError.MalformedOutput.fromParseError({
              module: "GoogleVertexClient",
              method: "streamRequest",
              error
            })
        })
      )
    }

    const decodeResponse = Schema.decodeUnknown(Generated.GenerateContentResponse)

    const generateContent: (
      request: typeof Generated.GenerateContentRequest.Encoded
    ) => Effect.Effect<Generated.GenerateContentResponse, AiError.AiError> = Effect.fnUntraced(
      function*(request) {
        const config = yield* GoogleVertexConfig.getOrUndefined
        const effectiveClient = config?.transformClient
          ? HttpClient.filterStatusOk(config.transformClient(httpClient))
          : httpClientOk
        const url = `${pathPrefix}/${request.model}:generateContent`
        const httpRequest = HttpClientRequest.post(url, {
          body: HttpBody.unsafeJson(request)
        })
        return yield* effectiveClient.execute(httpRequest).pipe(
          Effect.flatMap((r) => r.json),
          Effect.flatMap(decodeResponse),
          Effect.scoped,
          Effect.catchTags({
            RequestError: (error) =>
              AiError.HttpRequestError.fromRequestError({
                module: "GoogleVertexClient",
                method: "generateContent",
                error
              }),
            ResponseError: (error) =>
              AiError.HttpResponseError.fromResponseError({
                module: "GoogleVertexClient",
                method: "generateContent",
                error
              }),
            ParseError: (error) =>
              AiError.MalformedOutput.fromParseError({
                module: "GoogleVertexClient",
                method: "generateContent",
                error
              })
          })
        )
      }
    )

    const generateContentStream = (
      request: typeof Generated.GenerateContentRequest.Encoded
    ): Stream.Stream<Generated.GenerateContentResponse, AiError.AiError> => {
      const url = `${pathPrefix}/${request.model}:streamGenerateContent`
      const httpRequest = HttpClientRequest.post(url, {
        urlParams: UrlParams.fromInput({ "alt": "sse" }),
        body: HttpBody.unsafeJson(request)
      })
      return streamRequest(httpRequest, Generated.GenerateContentResponse).pipe(
        Stream.takeUntil(hasFinishReason)
      )
    }

    return GoogleVertexClient.of({
      streamRequest,
      generateContent,
      generateContentStream
    })
  })

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly project: string
  readonly location: string
  readonly accessToken?: Redacted.Redacted | undefined
  readonly apiVersion?: "v1" | "v1beta1" | undefined
  readonly apiUrl?: string | undefined
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Layer.Layer<
  GoogleVertexClient,
  never,
  HttpClient.HttpClient
> => Layer.scoped(GoogleVertexClient, make(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerConfig = (
  options: {
    readonly project: Config.Config<string>
    readonly location: Config.Config<string>
    readonly accessToken?: Config.Config<Redacted.Redacted | undefined> | undefined
    readonly apiVersion?: Config.Config<"v1" | "v1beta1" | undefined> | undefined
    readonly apiUrl?: Config.Config<string | undefined> | undefined
    readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
  }
): Layer.Layer<GoogleVertexClient, ConfigError, HttpClient.HttpClient> => {
  const { transformClient, ...configs } = options
  return Config.all(configs).pipe(
    Effect.flatMap((configs) => make({ ...configs, transformClient })),
    Layer.scoped(GoogleVertexClient)
  )
}

// =============================================================================
// Utilities
// =============================================================================

const hasFinishReason = (event: Generated.GenerateContentResponse): boolean =>
  Predicate.isNotUndefined(event.candidates) &&
  event.candidates.some((candidate) => Predicate.isNotUndefined(candidate.finishReason))
