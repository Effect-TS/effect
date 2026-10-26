/**
 * The `AmazonBedrockClient` module defines the low-level Effect service used to
 * call the Amazon Bedrock Runtime Converse API. It wraps an `HttpClient` with
 * AWS Signature Version 4 signing or Bedrock API key authentication, request
 * defaults, response decoding, event stream decoding and error mapping to the
 * unified `AiError` type.
 *
 * **Mental model**
 *
 * `HttpClient.HttpClient` provides the transport. {@link make} turns
 * {@link Options} into an {@link AmazonBedrockClient} service, while
 * {@link layer} and {@link layerConfig} provide that service as a layer. The
 * service exposes helpers for the `converse` and `converse-stream` endpoints.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as AiError from "effect/ai/AiError"
import * as Array from "effect/Array"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Headers from "effect/http/Headers"
import * as HttpBody from "effect/http/HttpBody"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { AmazonBedrockConfig } from "./AmazonBedrockConfig.ts"
import type { ConverseRequest } from "./AmazonBedrockSchema.ts"
import { ConverseResponse, ConverseStreamEvent, ConverseStreamException } from "./AmazonBedrockSchema.ts"
import * as Errors from "./internal/errors.ts"
import * as EventStream from "./internal/eventStream.ts"
import * as SigV4 from "./internal/sigv4.ts"

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Represents the Amazon Bedrock client service with methods for the Converse
 * API, including regular and streaming message creation.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export interface Service {
  /**
   * The underlying `HttpClient`, with the base URL and authentication applied.
   */
  readonly client: HttpClient.HttpClient

  /**
   * Calls the Converse operation and maps all errors to the unified `AiError`
   * type. `modelId` names the model in the URL; the other fields form the
   * request body.
   */
  readonly converse: (
    request: typeof ConverseRequest.Encoded
  ) => Effect.Effect<ConverseResponse, AiError.AiError>

  /**
   * Calls the ConverseStream operation and decodes the event stream, mapping
   * all errors to the unified `AiError` type. An exception frame in the
   * stream, such as a `throttlingException`, fails the stream.
   */
  readonly converseStream: (
    request: typeof ConverseRequest.Encoded
  ) => Stream.Stream<ConverseStreamEvent, AiError.AiError>
}

// =============================================================================
// Service Identifier
// =============================================================================

/**
 * Service tag for the Amazon Bedrock client.
 *
 * @see {@link make} for constructing a client effectfully
 * @see {@link layer} for providing a client from explicit options
 * @see {@link layerConfig} for providing a client from `Config`
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class AmazonBedrockClient extends Context.Service<AmazonBedrockClient, Service>()(
  "@effect/ai-amazon-bedrock/AmazonBedrockClient"
) {}

// =============================================================================
// Options
// =============================================================================

/**
 * AWS credentials, in the shape of the AWS SDK's `AwsCredentialIdentity`, so
 * the SDK's credential providers fit without an adapter.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Credentials {
  readonly accessKeyId: string
  readonly secretAccessKey: string
  /** An empty token is sent as no token. */
  readonly sessionToken?: string | undefined
}

/**
 * Configuration for creating an Amazon Bedrock client.
 *
 * **Details**
 *
 * The client authenticates in one of three ways, in this order of precedence:
 *
 * - `apiKey`, a Bedrock API key, sent as `Authorization: Bearer <key>`.
 * - `credentials`, an effect resolved before every request, signed with
 *   SigV4. This is where a credential provider such as `fromNodeProviderChain()`
 *   from `@aws-sdk/credential-providers` plugs in, wrapped in
 *   `Effect.promise`; wrap the effect in `Effect.cachedWithTTL` to avoid
 *   resolving credentials on every request.
 * - `accessKeyId` and `secretAccessKey`, with an optional `sessionToken`,
 *   signed with SigV4.
 *
 * Without any of them, every request fails with an `AuthenticationError` of
 * kind `MissingKey`.
 *
 * @stability unstable
 * @category options
 * @since 4.0.0
 */
export interface Options {
  /**
   * The AWS region.
   *
   * @default "us-east-1"
   */
  readonly region?: string | undefined
  /**
   * The base URL for the Bedrock Runtime API. Override to use a proxy or a
   * different endpoint.
   *
   * @default `https://bedrock-runtime.${region}.amazonaws.com`
   */
  readonly apiUrl?: string | undefined
  readonly accessKeyId?: string | undefined
  readonly secretAccessKey?: Redacted.Redacted<string> | undefined
  readonly sessionToken?: Redacted.Redacted<string> | undefined
  /**
   * A Bedrock API key, sent as `Authorization: Bearer <key>` in place of a
   * SigV4 signature.
   */
  readonly apiKey?: Redacted.Redacted<string> | undefined
  /**
   * Resolves the AWS credentials of each request.
   */
  readonly credentials?: Effect.Effect<Credentials, AiError.AiError> | undefined
  /**
   * Optional transformer for the underlying HTTP client, such as middleware,
   * logging, or custom request/response handling.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}

// =============================================================================
// Constructor
// =============================================================================

type RequestCredentials =
  | { readonly _tag: "Bearer"; readonly apiKey: Redacted.Redacted<string> }
  | { readonly _tag: "SigV4"; readonly credentials: SigV4.SigningCredentials }

/**
 * The credentials of the request in flight. The client resolves them before
 * `HttpClient.execute` and provides them around it, so that a resolution
 * failure is not an `HttpClientError` that a retry policy would retry, and so
 * that every retry inside `execute` signs again with them.
 */
const CurrentRequestCredentials = Context.Reference<RequestCredentials | undefined>(
  "@effect/ai-amazon-bedrock/AmazonBedrockClient/CurrentRequestCredentials",
  { defaultValue: () => undefined }
)

const RedactedAmazonBedrockHeaders = {
  AmzSecurityToken: "x-amz-security-token"
}

const appendRedactedHeaders = Array.appendAll(Object.values(RedactedAmazonBedrockHeaders))

const withRedactedHeaders = Effect.updateService(Headers.CurrentRedactedNames, appendRedactedHeaders)

const emptyToUndefined = (value: string | undefined): string | undefined =>
  value === undefined || value === "" ? undefined : value

const missingKey = (method: string, description: string) =>
  AiError.make({
    module: "AmazonBedrockClient",
    method,
    reason: new AiError.AuthenticationError({ kind: "MissingKey", description })
  })

const makeResolveCredentials = (
  options: Options
): (method: string) => Effect.Effect<RequestCredentials, AiError.AiError> => {
  if (Predicate.isNotUndefined(options.apiKey)) {
    const credentials: RequestCredentials = { _tag: "Bearer", apiKey: options.apiKey }
    return () => Effect.succeed(credentials)
  }
  if (Predicate.isNotUndefined(options.credentials)) {
    const resolve = options.credentials
    return (method) =>
      Effect.flatMap(resolve, (credentials) =>
        credentials.accessKeyId === "" || credentials.secretAccessKey === ""
          ? Effect.fail(
            missingKey(method, "The credentials effect returned an empty access key ID or secret access key")
          )
          : Effect.succeed<RequestCredentials>({
            _tag: "SigV4",
            credentials: {
              accessKeyId: credentials.accessKeyId,
              secretAccessKey: credentials.secretAccessKey,
              sessionToken: emptyToUndefined(credentials.sessionToken)
            }
          }))
  }
  if (Predicate.isNotUndefined(options.accessKeyId) && Predicate.isNotUndefined(options.secretAccessKey)) {
    const credentials: RequestCredentials = {
      _tag: "SigV4",
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: Redacted.value(options.secretAccessKey),
        sessionToken: emptyToUndefined(
          Predicate.isUndefined(options.sessionToken) ? undefined : Redacted.value(options.sessionToken)
        )
      }
    }
    return () => Effect.succeed(credentials)
  }
  return (method) =>
    Effect.fail(missingKey(
      method,
      "AmazonBedrockClient has no credentials: set `apiKey`, `credentials`, or `accessKeyId` with `secretAccessKey`"
    ))
}

const authenticateRequest = (region: string) =>
  Effect.fnUntraced(function*(request: HttpClientRequest.HttpClientRequest) {
    const credentials = yield* CurrentRequestCredentials
    if (Predicate.isUndefined(credentials)) {
      return yield* Effect.die(new Error("AmazonBedrockClient sent a request without resolving its credentials"))
    }
    switch (credentials._tag) {
      case "Bearer": {
        return HttpClientRequest.bearerToken(request, credentials.apiKey)
      }
      case "SigV4": {
        return yield* SigV4.sign(request, { region, credentials: credentials.credentials })
      }
    }
  })

const knownStreamEvents = new Set([
  "messageStart",
  "contentBlockStart",
  "contentBlockDelta",
  "contentBlockStop",
  "messageStop",
  "metadata"
])

const decodeStreamEvent = Schema.decodeUnknownEffect(ConverseStreamEvent)
const decodeStreamException = Schema.decodeUnknownEffect(ConverseStreamException)

/**
 * Creates an Amazon Bedrock client service with the given options.
 *
 * @see {@link layer} for providing the client as a `Layer` from explicit options
 * @see {@link layerConfig} for providing the client as a `Layer` with `Config`-based settings
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(
  function*(options: Options): Effect.fn.Return<Service, never, HttpClient.HttpClient> {
    const region = options.region ?? "us-east-1"
    const baseClient = yield* HttpClient.HttpClient
    const resolveCredentials = makeResolveCredentials(options)

    const httpClient = baseClient.pipe(
      HttpClient.mapRequest((request) =>
        request.pipe(
          HttpClientRequest.prependUrl(options.apiUrl ?? `https://bedrock-runtime.${region}.amazonaws.com`),
          HttpClientRequest.acceptJson
        )
      ),
      HttpClient.mapRequestEffect(authenticateRequest(region)),
      Predicate.isNotUndefined(options.transformClient) ? options.transformClient : identity
    )

    const httpClientOk = HttpClient.filterStatusOk(httpClient)

    const withConfigClient = Effect.fnUntraced(function*() {
      const config = yield* AmazonBedrockConfig.getOrUndefined
      return Predicate.isNotUndefined(config?.transformClient) ? config.transformClient(httpClientOk) : httpClientOk
    })

    const makeRequest = (path: string, body: Omit<typeof ConverseRequest.Encoded, "modelId">) =>
      HttpClientRequest.post(path, { body: HttpBody.jsonUnsafe(body) })

    const converse: Service["converse"] = Effect.fnUntraced(function*({ modelId, ...body }) {
      const client = yield* withConfigClient()
      const credentials = yield* resolveCredentials("converse")
      const request = makeRequest(`/model/${encodeURIComponent(modelId)}/converse`, body)
      return yield* client.execute(request).pipe(
        Effect.provideService(CurrentRequestCredentials, credentials),
        Effect.flatMap(HttpClientResponse.schemaBodyJson(ConverseResponse)),
        Effect.catchTags({
          HttpClientError: (error) => Errors.mapHttpClientError(error, "converse"),
          SchemaError: (error) => Effect.fail(Errors.mapSchemaError(error, "converse"))
        }),
        withRedactedHeaders
      )
    })

    const decodeFrame = Effect.fnUntraced(function*(frame: EventStream.Frame) {
      const messageType = frame.headers[":message-type"]
      switch (messageType) {
        case "event": {
          const eventType = frame.headers[":event-type"]
          // An event this provider does not model is skipped, not fatal.
          if (Predicate.isUndefined(eventType) || !knownStreamEvents.has(eventType)) {
            return undefined
          }
          const payload = yield* EventStream.parseJsonPayload(frame)
          return yield* decodeStreamEvent({ [eventType]: payload })
        }
        case "exception": {
          const payload = yield* EventStream.parseJsonPayload(frame)
          const exception = yield* decodeStreamException(payload)
          return yield* Errors.mapStreamException(
            frame.headers[":exception-type"] ?? "unknown exception",
            exception.message,
            "converseStream"
          )
        }
        case "error": {
          return yield* new EventStream.EventStreamError({
            reason: "ErrorFrame",
            description: `Event stream error frame [${frame.headers[":error-code"] ?? "unknown"}]: ${
              frame.headers[":error-message"] ?? "no error message provided"
            }`
          })
        }
        default: {
          return undefined
        }
      }
    })

    const converseStream: Service["converseStream"] = ({ modelId, ...body }) =>
      Stream.unwrap(
        Effect.gen(function*() {
          const client = yield* withConfigClient()
          const credentials = yield* resolveCredentials("converseStream")
          const request = makeRequest(`/model/${encodeURIComponent(modelId)}/converse-stream`, body)
          return client.execute(request).pipe(
            Effect.provideService(CurrentRequestCredentials, credentials),
            Effect.map((response) => response.stream),
            Stream.unwrap,
            EventStream.decode,
            Stream.mapEffect(decodeFrame),
            Stream.filter(Predicate.isNotUndefined),
            Stream.catchTags({
              HttpClientError: (error) => Stream.fromEffect(Errors.mapHttpClientError(error, "converseStream")),
              SchemaError: (error) => Stream.fail(Errors.mapSchemaError(error, "converseStream")),
              EventStreamError: (error) => Stream.fail(Errors.mapEventStreamError(error, "converseStream"))
            }),
            Stream.updateService(Headers.CurrentRedactedNames, appendRedactedHeaders)
          )
        })
      )

    return AmazonBedrockClient.of({
      client: httpClient,
      converse,
      converseStream
    })
  },
  withRedactedHeaders
)

// =============================================================================
// Layers
// =============================================================================

/**
 * Creates a layer for the Amazon Bedrock client with the given options.
 *
 * @see {@link make} for constructing the client service effectfully
 * @see {@link layerConfig} for loading client settings from `Config`
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: Options): Layer.Layer<AmazonBedrockClient, never, HttpClient.HttpClient> =>
  Layer.effect(AmazonBedrockClient, make(options))

/**
 * Creates a layer for the Amazon Bedrock client, loading credentials and other
 * settings via Effect's `Config` module.
 *
 * **Details**
 *
 * Each setting defaults to the environment variable that the AWS tools read:
 * `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
 * `AWS_SESSION_TOKEN` and, for a Bedrock API key, `AWS_BEARER_TOKEN_BEDROCK`.
 * Every one of them is optional; see {@link Options} for which of them are
 * used when several are set.
 *
 * @see {@link layer} for providing the client from explicit options instead of `Config`
 * @see {@link make} for constructing the client service effectfully
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (options?: {
  readonly region?: Config.Config<string | undefined> | undefined
  readonly apiUrl?: Config.Config<string | undefined> | undefined
  readonly accessKeyId?: Config.Config<string | undefined> | undefined
  readonly secretAccessKey?: Config.Config<Redacted.Redacted<string> | undefined> | undefined
  readonly sessionToken?: Config.Config<Redacted.Redacted<string> | undefined> | undefined
  readonly apiKey?: Config.Config<Redacted.Redacted<string> | undefined> | undefined
  readonly credentials?: Effect.Effect<Credentials, AiError.AiError> | undefined
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Layer.Layer<AmazonBedrockClient, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.effect(
    AmazonBedrockClient,
    Effect.gen(function*() {
      return yield* make({
        region: yield* options?.region ?? optionalString("AWS_REGION"),
        apiUrl: yield* options?.apiUrl ?? Effect.undefined,
        accessKeyId: yield* options?.accessKeyId ?? optionalString("AWS_ACCESS_KEY_ID"),
        secretAccessKey: yield* options?.secretAccessKey ?? optionalRedacted("AWS_SECRET_ACCESS_KEY"),
        sessionToken: yield* options?.sessionToken ?? optionalRedacted("AWS_SESSION_TOKEN"),
        apiKey: yield* options?.apiKey ?? optionalRedacted("AWS_BEARER_TOKEN_BEDROCK"),
        credentials: options?.credentials,
        transformClient: options?.transformClient
      })
    })
  )

const optionalString = (name: string): Config.Config<string | undefined> =>
  Config.String(name).pipe(Config.withDefault(undefined))

const optionalRedacted = (name: string): Config.Config<Redacted.Redacted<string> | undefined> =>
  Config.Redacted(name).pipe(Config.withDefault(undefined))
