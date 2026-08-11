/**
 * Low-level client for the Gemini Enterprise Agent Platform APIs.
 *
 * Provides a type-safe, Effect-based client for the Gemini `generateContent`,
 * `streamGenerateContent`, `predict`, and `embedContent` endpoints, including
 * authentication via `google-auth-library` (OAuth) or an API key (express
 * mode).
 *
 * @since 4.0.0
 */
import * as Arr from "effect/Array"
import type * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as AiError from "effect/unstable/ai/AiError"
import * as Sse from "effect/unstable/encoding/Sse"
import * as Headers from "effect/unstable/http/Headers"
import * as HttpBody from "effect/unstable/http/HttpBody"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import type * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import { GoogleAgentPlatformConfig } from "./GoogleAgentPlatformConfig.ts"
import * as InternalAuth from "./internal/auth.ts"
import * as Errors from "./internal/errors.ts"
import * as Schemas from "./internal/schemas.ts"
import { getModelPath } from "./internal/utilities.ts"

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Represents the Agent Platform client service with methods for the Gemini
 * `generateContent`, `streamGenerateContent`, `predict`, and `embedContent`
 * endpoints.
 *
 * @category models
 * @since 4.0.0
 */
export interface Service {
  /**
   * Generates content using the Gemini API and maps all errors to the unified
   * `AiError` type.
   */
  readonly generateContent: (options: {
    readonly model: string
    readonly request: Schemas.GenerateContentRequest
  }) => Effect.Effect<
    [body: Schemas.GenerateContentResponse, response: HttpClientResponse.HttpClientResponse],
    AiError.AiError
  >

  /**
   * Generates content using the Gemini streaming API. The returned Effect
   * yields the HTTP response and a stream of `GenerateContentResponse` chunks.
   */
  readonly streamGenerateContent: (options: {
    readonly model: string
    readonly request: Schemas.GenerateContentRequest
  }) => Effect.Effect<
    [
      response: HttpClientResponse.HttpClientResponse,
      stream: Stream.Stream<Schemas.GenerateContentResponse, AiError.AiError>
    ],
    AiError.AiError
  >

  /**
   * Computes text embeddings using the Agent Platform `predict` endpoint and
   * maps all errors to the unified `AiError` type.
   */
  readonly predict: (options: {
    readonly model: string
    readonly instances: ReadonlyArray<unknown>
    readonly parameters?: unknown
  }) => Effect.Effect<
    [body: Schemas.PredictResponse, response: HttpClientResponse.HttpClientResponse],
    AiError.AiError
  >

  /**
   * Computes an embedding using the Agent Platform `embedContent` endpoint and
   * maps all errors to the unified `AiError` type.
   */
  readonly embedContent: (options: {
    readonly model: string
    readonly request: Schemas.EmbedContentRequest
  }) => Effect.Effect<
    [body: Schemas.EmbedContentResponse, response: HttpClientResponse.HttpClientResponse],
    AiError.AiError
  >
}

// =============================================================================
// Service Identifier
// =============================================================================

/**
 * Service identifier for the Google Agent Platform client.
 *
 * @category services
 * @since 4.0.0
 */
export class GoogleAgentPlatformClient extends Context.Service<GoogleAgentPlatformClient, Service>()(
  "@effect/ai-google-agent-platform/GoogleAgentPlatformClient"
) {}

// =============================================================================
// Options
// =============================================================================

/**
 * Configuration options for creating a Google Agent Platform client.
 *
 * **Details**
 *
 * Provide exactly one authentication mechanism:
 * - `apiKey` — uses Gemini Enterprise Agent Platform express mode (the `x-goog-api-key` header)
 * - `accessToken` — a static or dynamic OAuth bearer token
 * - `googleAuthOptions` — builds a bearer token generator via `google-auth-library`
 *
 * @category models
 * @since 4.0.0
 */
export type Options = {
  /**
   * The Google Agent Platform API key for express mode authentication.
   */
  readonly apiKey?: Redacted.Redacted<string> | undefined

  /**
   * An OAuth bearer token used to authenticate requests. May be a static token
   * or an `Effect` that resolves a fresh token per request (useful for tokens
   * that expire).
   */
  readonly accessToken?:
    | Redacted.Redacted<string>
    | Effect.Effect<Redacted.Redacted<string>, AiError.AiError>
    | undefined

  /**
   * Options passed to `google-auth-library` to construct a bearer token
   * generator.
   */
  readonly googleAuthOptions?: GoogleAuthOptions | undefined

  /**
   * The Google Cloud project ID. Required for regional (OAuth) requests unless
   * `apiUrl` is provided.
   */
  readonly project?: string | undefined

  /**
   * The Google Cloud location/region (e.g. `us-central1`, `global`). Defaults
   * to `"global"`.
   */
  readonly location?: string | undefined

  /**
   * The base URL for the Google Agent Platform API. Override this to use a proxy or a
   * different endpoint. When omitted, it is derived from `project`/`location`
   * (OAuth) or set to the express-mode endpoint (`apiKey`).
   */
  readonly apiUrl?: string | undefined

  /**
   * Optional transformer for the underlying HTTP client, such as middleware,
   * logging, or custom request/response handling.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}

// =============================================================================
// Constructor
// =============================================================================

const RedactedHeaders = ["x-goog-api-key", "authorization"]

const invalidConfiguration = (description: string, method: string = "make"): AiError.AiError =>
  AiError.make({
    module: "GoogleAgentPlatformClient",
    method,
    reason: new AiError.InvalidRequestError({ description })
  })

const resolveBaseUrl = (options: Options): Effect.Effect<string, AiError.AiError> => {
  const authenticationOptions = [
    options.apiKey,
    options.accessToken,
    options.googleAuthOptions
  ].filter(Predicate.isNotUndefined)

  if (authenticationOptions.length > 1) {
    return Effect.fail(invalidConfiguration(
      "Authentication options are mutually exclusive; provide only one of `apiKey`, `accessToken`, or `googleAuthOptions`"
    ))
  }

  if (Predicate.isNotUndefined(options.apiUrl)) {
    return Effect.succeed(options.apiUrl)
  }
  if (Predicate.isNotUndefined(options.apiKey)) {
    return Effect.succeed("https://aiplatform.googleapis.com/v1/publishers/google")
  }
  if (Predicate.isUndefined(options.project)) {
    return Effect.fail(invalidConfiguration(
      "`project` is required when using the standard Agent Platform endpoint with OAuth authentication"
    ))
  }

  const region = options.location ?? "global"
  const host = `${region === "global" ? "" : region + "-"}aiplatform.googleapis.com`
  return Effect.succeed(
    `https://${host}/v1/projects/${options.project}/locations/${region}/publishers/google`
  )
}

const resolveEmbedContentBaseUrl = (options: Options): string | undefined => {
  if (Predicate.isNotUndefined(options.apiUrl)) {
    return options.apiUrl
  }
  if (Predicate.isNotUndefined(options.apiKey) || Predicate.isUndefined(options.project)) {
    return undefined
  }
  const location = options.location ?? "global"
  const host = location === "global"
    ? "aiplatform.googleapis.com"
    : `aiplatform.${location}.rep.googleapis.com`
  return `https://${host}/v1/projects/${options.project}/locations/${location}/publishers/google`
}

const resolveAccessToken = (options: Options): Options["accessToken"] => {
  if (Predicate.isNotUndefined(options.accessToken)) {
    return options.accessToken
  }
  if (Predicate.isNotUndefined(options.apiKey)) {
    return undefined
  }
  if (Predicate.isNotUndefined(options.googleAuthOptions)) {
    return InternalAuth.accessTokenFromGoogleAuth(options.googleAuthOptions)
  }
  // No explicit credentials: fall back to application default credentials,
  // unless a custom `apiUrl` was provided (e.g. a proxy that authenticates).
  return Predicate.isUndefined(options.apiUrl) ? InternalAuth.accessTokenFromGoogleAuth() : undefined
}

/**
 * Creates a Google Agent Platform client service with the given options.
 *
 * **Details**
 *
 * The client handles authentication (API key express mode or OAuth bearer
 * token), error mapping to the unified `AiError` type, and request/response
 * transformations via `GoogleAgentPlatformConfig`. It requires an `HttpClient` in the
 * context.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(
  function*(options: Options): Effect.fn.Return<Service, AiError.AiError, HttpClient.HttpClient> {
    const baseClient = yield* HttpClient.HttpClient
    const baseUrl = yield* resolveBaseUrl(options)
    const embedContentBaseUrl = resolveEmbedContentBaseUrl(options)
    const accessToken = resolveAccessToken(options)

    const makeHttpClient = (requestBaseUrl: string) =>
      baseClient.pipe(
        HttpClient.mapRequest((request) =>
          request.pipe(
            HttpClientRequest.prependUrl(requestBaseUrl),
            Predicate.isNotUndefined(options.apiKey)
              ? HttpClientRequest.setHeader("x-goog-api-key", Redacted.value(options.apiKey))
              : identity,
            HttpClientRequest.acceptJson
          )
        ),
        Predicate.isNotUndefined(options.transformClient) ? options.transformClient : identity
      )

    // Resolve a bearer token (if any) and attach it to the request. Kept out of
    // the `HttpClient` transform so that authentication failures surface as
    // `AiError` values rather than polluting the client's error channel.
    const authorize = (
      request: HttpClientRequest.HttpClientRequest
    ): Effect.Effect<HttpClientRequest.HttpClientRequest, AiError.AiError> => {
      if (Predicate.isUndefined(accessToken)) {
        return Effect.succeed(request)
      }
      return Effect.isEffect(accessToken)
        ? Effect.map(accessToken, (token) => HttpClientRequest.bearerToken(request, Redacted.value(token)))
        : Effect.succeed(HttpClientRequest.bearerToken(request, Redacted.value(accessToken)))
    }

    const resolveClient = Effect.fnUntraced(function*(requestBaseUrl: string) {
      const config = yield* GoogleAgentPlatformConfig.getOrUndefined
      const httpClient = makeHttpClient(requestBaseUrl)
      const client = Predicate.isNotUndefined(config?.transformClient)
        ? config.transformClient(httpClient)
        : httpClient
      return HttpClient.filterStatusOk(client)
    })

    const decodeJson =
      <S extends Schema.Top>(schema: S, method: string) => (response: HttpClientResponse.HttpClientResponse) =>
        Effect.flatMap(response.json, (body) =>
          Schema.decodeUnknownEffect(schema)(body).pipe(
            Effect.mapError((error) => Errors.mapSchemaError(error, method))
          ))

    const executeRequest = <S extends Schema.Top>(
      method: string,
      schema: S,
      request: HttpClientRequest.HttpClientRequest,
      requestBaseUrl: string = baseUrl
    ) =>
      Effect.flatMap(resolveClient(requestBaseUrl), (httpClientOk) =>
        authorize(request).pipe(
          Effect.flatMap((request) => httpClientOk.execute(request)),
          Effect.flatMap((response) =>
            Effect.map(
              decodeJson(schema, method)(response),
              (body): [S["Type"], HttpClientResponse.HttpClientResponse] => [body, response]
            )
          ),
          Effect.catchTag("HttpClientError", (error) => Errors.mapHttpClientError(error, method))
        ))

    const generateContent: Service["generateContent"] = (opts) =>
      executeRequest(
        "generateContent",
        Schemas.GenerateContentResponse,
        HttpClientRequest.post(`/${getModelPath(opts.model)}:generateContent`, {
          body: HttpBody.jsonUnsafe(opts.request)
        })
      )

    const streamGenerateContent: Service["streamGenerateContent"] = (opts) =>
      Effect.flatMap(resolveClient(baseUrl), (httpClientOk) =>
        authorize(
          HttpClientRequest.post(`/${getModelPath(opts.model)}:streamGenerateContent`, {
            urlParams: { alt: "sse" },
            body: HttpBody.jsonUnsafe(opts.request)
          })
        ).pipe(
          Effect.flatMap((request) => httpClientOk.execute(request)),
          Effect.map((response) => {
            const stream = response.stream.pipe(
              Stream.decodeText,
              Stream.pipeThroughChannel(Sse.decodeDataSchema(Schemas.GenerateContentResponse)),
              Stream.map((event) => event.data),
              Stream.catchTags({
                Retry: (error) => Stream.die(error),
                HttpClientError: (error) =>
                  Stream.fromEffect(Errors.mapHttpClientError(error, "streamGenerateContent")),
                SchemaError: (error) => Stream.fail(Errors.mapSchemaError(error, "streamGenerateContent"))
              })
            )
            return [response, stream] as [
              HttpClientResponse.HttpClientResponse,
              Stream.Stream<Schemas.GenerateContentResponse, AiError.AiError>
            ]
          }),
          Effect.catchTag("HttpClientError", (error) => Errors.mapHttpClientError(error, "streamGenerateContent"))
        ))

    const predict: Service["predict"] = (opts) =>
      executeRequest(
        "predict",
        Schemas.PredictResponse,
        HttpClientRequest.post(`/${getModelPath(opts.model)}:predict`, {
          body: HttpBody.jsonUnsafe({
            instances: opts.instances,
            ...(Predicate.isNotUndefined(opts.parameters) ? { parameters: opts.parameters } : undefined)
          })
        })
      )

    const embedContent: Service["embedContent"] = (opts) => {
      if (Predicate.isUndefined(embedContentBaseUrl)) {
        return Effect.fail(invalidConfiguration(
          "`embedContent` requires OAuth authentication with a Google Cloud `project`, or a custom `apiUrl`",
          "embedContent"
        ))
      }
      return executeRequest(
        "embedContent",
        Schemas.EmbedContentResponse,
        HttpClientRequest.post(`/${getModelPath(opts.model)}:embedContent`, {
          body: HttpBody.jsonUnsafe(opts.request)
        }),
        embedContentBaseUrl
      )
    }

    return GoogleAgentPlatformClient.of({ generateContent, streamGenerateContent, predict, embedContent })
  },
  Effect.updateService(Headers.CurrentRedactedNames, Arr.appendAll(RedactedHeaders))
)

// =============================================================================
// Layers
// =============================================================================

/**
 * Creates a layer for the Google Agent Platform client with the given options.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  options: Options
): Layer.Layer<GoogleAgentPlatformClient, AiError.AiError, HttpClient.HttpClient> =>
  Layer.effect(GoogleAgentPlatformClient, make(options))

/**
 * Creates a layer for the Google Agent Platform client, loading the requisite
 * configuration via Effect's `Config` module.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (options?: {
  readonly apiKey?: Config.Config<Redacted.Redacted<string> | undefined> | undefined
  readonly project?: Config.Config<string> | undefined
  readonly location?: Config.Config<string> | undefined
  readonly apiUrl?: Config.Config<string> | undefined
  readonly accessToken?: Options["accessToken"] | undefined
  readonly googleAuthOptions?: GoogleAuthOptions | undefined
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Layer.Layer<GoogleAgentPlatformClient, Config.ConfigError | AiError.AiError, HttpClient.HttpClient> =>
  Layer.effect(
    GoogleAgentPlatformClient,
    Effect.gen(function*() {
      const apiKey = Predicate.isNotUndefined(options?.apiKey) ? yield* options.apiKey : undefined
      const project = Predicate.isNotUndefined(options?.project) ? yield* options.project : undefined
      const location = Predicate.isNotUndefined(options?.location) ? yield* options.location : undefined
      const apiUrl = Predicate.isNotUndefined(options?.apiUrl) ? yield* options.apiUrl : undefined
      return yield* make({
        apiKey,
        project,
        location,
        apiUrl,
        accessToken: options?.accessToken,
        googleAuthOptions: options?.googleAuthOptions,
        transformClient: options?.transformClient
      })
    })
  )

// =============================================================================
// Authentication
// =============================================================================

/**
 * A subset of the options accepted by `google-auth-library`'s `GoogleAuth`
 * constructor, used to configure OAuth authentication.
 *
 * @category authentication
 * @since 4.0.0
 */
export type GoogleAuthOptions = InternalAuth.GoogleAuthOptions

/**
 * Creates an `Effect` that obtains a Google Cloud OAuth access token using
 * `google-auth-library`.
 *
 * **Details**
 *
 * The underlying auth client is created lazily on first use and reused for
 * subsequent calls (the library refreshes tokens internally). Pass the result
 * as the `accessToken` option when creating a client to authenticate requests
 * with a bearer token.
 *
 * @category authentication
 * @since 4.0.0
 */
export const accessTokenFromGoogleAuth: (
  options?: GoogleAuthOptions
) => Effect.Effect<Redacted.Redacted<string>, AiError.AiError> = InternalAuth.accessTokenFromGoogleAuth
