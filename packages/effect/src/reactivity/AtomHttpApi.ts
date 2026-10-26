/**
 * Connects typed `HttpApi` clients to atoms.
 *
 * The service created here exposes the generated HTTP API client plus
 * atom-based query and mutation helpers. Query atoms call endpoints and track
 * their asynchronous result, while mutations run endpoint calls that can
 * invalidate reactivity keys after a successful request. Query atoms can also be
 * cached, serialized for hydration, and kept alive with a time-to-live.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import type * as Sse from "../encoding/Sse.ts"
import type * as HttpApi from "../http-api/HttpApi.ts"
import * as HttpApiClient from "../http-api/HttpApiClient.ts"
import * as HttpApiEndpoint from "../http-api/HttpApiEndpoint.ts"
import type * as HttpApiGroup from "../http-api/HttpApiGroup.ts"
import type * as HttpApiMiddleware from "../http-api/HttpApiMiddleware.ts"
import * as HttpApiSchema from "../http-api/HttpApiSchema.ts"
import type * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientError from "../http/HttpClientError.ts"
import * as Layer from "../Layer.ts"
import * as Schema from "../Schema.ts"
import type { SchemaError } from "../Schema.ts"
import type * as Stream from "../Stream.ts"
import type { Mutable, NoInfer, Simplify } from "../Types.ts"
import * as AsyncResult from "./AsyncResult.ts"
import * as Atom from "./Atom.ts"
import * as Reactivity from "./Reactivity.ts"

/**
 * A `Context.Service` for an HTTP API client integrated with atom reactivity.
 *
 * **Details**
 *
 * It exposes the generated HTTP API client, an atom runtime, mutation helpers that
 * return `AtomResultFn`s, and query helpers that return atoms of endpoint results.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export interface AtomHttpApiClient<Self, Id extends string, Groups extends HttpApiGroup.Constraint>
  extends Context.Service<Self, HttpApiClient.Client<Groups, never, never>>
{
  new(_: never): Context.ServiceClass.Shape<Id, HttpApiClient.Client<Groups, never, never>>

  readonly runtime: Atom.AtomRuntime<Self>

  readonly mutation: <
    GroupIdentifier extends HttpApiGroup.Identifier<Groups>,
    EndpointIdentifier extends HttpApiEndpoint.Identifier<HttpApiGroup.Endpoints<Group>>,
    Group extends HttpApiGroup.Constraint = HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>,
    Endpoint extends HttpApiEndpoint.Constraint = HttpApiEndpoint.WithIdentifier<
      HttpApiGroup.Endpoints<Group>,
      EndpointIdentifier
    >,
    const ResponseMode extends HttpApiEndpoint.ClientResponseMode = "decoded-only"
  >(
    group: GroupIdentifier,
    endpoint: EndpointIdentifier,
    options?: {
      readonly responseMode?: ResponseMode | undefined
    }
  ) => [Endpoint] extends [
    HttpApiEndpoint.HttpApiEndpoint<
      infer _Identifier,
      infer _Method,
      infer _Path,
      infer _Params,
      infer _Query,
      infer _Payload,
      infer _Headers,
      infer _Success,
      infer _Error,
      infer _Middleware,
      infer _RE
    >
  ] ? Atom.AtomResultFn<
      Simplify<
        HttpApiEndpoint.ClientRequest<_Params, _Query, _Payload, _Headers, "decoded-only"> & {
          readonly reactivityKeys?: Reactivity.KeysInput | undefined
        }
      >,
      ResponseByMode<Endpoint, ResponseMode>,
      ErrorByMode<_Error, _Middleware, ResponseMode>
    >
    : never

  /**
   * Creates an endpoint query. Supply `staleTime` to enable shared freshness
   * and hydration for finite, decoded results; omit it for the default behavior.
   */
  readonly query: <
    GroupIdentifier extends HttpApiGroup.Identifier<Groups>,
    EndpointIdentifier extends HttpApiEndpoint.Identifier<HttpApiGroup.Endpoints<Group>>,
    Group extends HttpApiGroup.Constraint = HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>,
    Endpoint extends HttpApiEndpoint.Constraint = HttpApiEndpoint.WithIdentifier<
      HttpApiGroup.Endpoints<Group>,
      EndpointIdentifier
    >,
    const ResponseMode extends HttpApiEndpoint.ClientResponseMode = "decoded-only"
  >(
    group: GroupIdentifier,
    endpoint: EndpointIdentifier,
    request: [Endpoint] extends [
      HttpApiEndpoint.HttpApiEndpoint<
        infer _Identifier,
        infer _Method,
        infer _Path,
        infer _Params,
        infer _Query,
        infer _Payload,
        infer _Headers,
        infer _Success,
        infer _Error,
        infer _R,
        infer _RE
      >
    ] ? HttpApiEndpoint.ClientRequest<_Params, _Query, _Payload, _Headers, ResponseMode> & {
        readonly reactivityKeys?: Reactivity.KeysInput | undefined
        readonly timeToLive?: Duration.Input | undefined
        readonly serializationKey?: string | undefined
      } & QueryFreshness<NoInfer<_Success>, NoInfer<ResponseMode>>
      : never
  ) => [Endpoint] extends [
    HttpApiEndpoint.HttpApiEndpoint<
      infer _Identifier,
      infer _Method,
      infer _Path,
      infer _Params,
      infer _Query,
      infer _Payload,
      infer _Headers,
      infer _Success,
      infer _Error,
      infer _Middleware,
      infer _RE
    >
  ] ? Atom.Atom<
      AsyncResult.AsyncResult<
        ResponseByMode<Endpoint, ResponseMode>,
        ErrorByMode<_Error, _Middleware, ResponseMode>
      >
    >
    : never
}

declare global {
  interface ErrorConstructor {
    stackTraceLimit: number
  }
}

/**
 * Creates a `Context.Service` class for an HTTP API client backed by an atom
 * runtime.
 *
 * **Details**
 *
 * The options provide the API definition, HTTP client layer, optional client and
 * response transforms, base URL, and runtime factory used by the query and
 * mutation helpers.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const Service =
  <Self>() =>
  <const Id extends string, ApiId extends string, Groups extends HttpApiGroup.Constraint>(
    id: Id,
    options: {
      readonly api: HttpApi.HttpApi<ApiId, Groups>
      readonly httpClient:
        | Layer.Layer<
          | HttpApiGroup.ClientServices<Groups>
          | HttpClient.HttpClient
        >
        | ((get: Atom.AtomContext) => Layer.Layer<
          | HttpApiGroup.ClientServices<Groups>
          | HttpClient.HttpClient
        >)
      readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
      readonly transformResponse?:
        | ((effect: Effect.Effect<unknown, unknown, unknown>) => Effect.Effect<unknown, unknown, unknown>)
        | undefined
      readonly baseUrl?: URL | string | undefined
      readonly runtime?: Atom.RuntimeFactory | undefined
    }
  ): AtomHttpApiClient<Self, Id, Groups> => {
    const self: Mutable<AtomHttpApiClient<Self, Id, Groups>> = Context.Service<
      Self,
      HttpApiClient.Client<Groups, never, never>
    >()(id) as any

    const layer = Layer.effect(
      self,
      HttpApiClient.make(options.api, options)
    )
    const runtimeFactory = options.runtime ?? Atom.runtime
    self.runtime = runtimeFactory(
      typeof options.httpClient === "function" ?
        (get) =>
          Layer.provide(
            layer,
            (options.httpClient as (get: Atom.AtomContext) => Layer.Layer<
              | HttpApiGroup.ClientServices<Groups>
              | HttpClient.HttpClient
            >)(get)
          ) as Layer.Layer<Self> :
        Layer.provide(layer, options.httpClient) as Layer.Layer<Self>
    )

    const catchErrors = Effect.catch((e: unknown) =>
      Schema.isSchemaError(e) || HttpClientError.isHttpClientError(e) ? Effect.die(e) : Effect.fail(e)
    )
    const groups = options.api.groups as unknown as Record<string, HttpApiGroup.Top>

    const mutationFamily = Atom.family(({ endpoint, group, responseMode }: MutationKey) => {
      const atom = self.runtime.fn<{
        params: any
        query: any
        headers: any
        payload: any
        sseOptions?: Sse.DecodeOptions | undefined
        reactivityKeys?: Reactivity.KeysInput | undefined
      }>()(
        Effect.fnUntraced(function*(opts) {
          const client = (yield* self) as any
          const groupClient = groups[group].topLevel ? client : client[group]
          const effect = catchErrors(groupClient[endpoint]({
            ...opts,
            responseMode
          }) as Effect.Effect<any>)
          return yield* opts.reactivityKeys
            ? Reactivity.mutation(effect, opts.reactivityKeys)
            : effect
        })
      )
      if (responseMode === "decoded-only") {
        const definition = groups[group].endpoints[endpoint]
        return Atom.serializable(atom, {
          key: `AtomHttpApi:mutation:${JSON.stringify([id, group, endpoint])}`,
          schema: AsyncResult.Schema({
            success: Schema.Union(HttpApiEndpoint.getSuccessSchemas(definition)),
            error: Schema.Union(HttpApiEndpoint.getErrorSchemas(definition))
          }) as any
        })
      }
      return atom
    }) as any

    self.mutation = ((group: string, endpoint: string, options?: {
      readonly responseMode?: HttpApiEndpoint.ClientResponseMode | undefined
    }) =>
      mutationFamily({
        group,
        endpoint,
        responseMode: options?.responseMode ?? "decoded-only"
      })) as any

    const queryFamily = Atom.family((opts: QueryKey) => {
      const endpoint = groups[opts.group].endpoints[opts.endpoint]
      const freshness = opts.staleTime !== undefined
      if (
        freshness &&
        (opts.responseMode !== "decoded-only" || Array.from(endpoint.success).some(isNonFiniteSuccess))
      ) {
        throw new TypeError("AtomHttpApi.query freshness requires a finite decoded-only response")
      }
      const effect = self.use((client_) => {
        const client = client_ as any
        const groupClient = groups[opts.group].topLevel ? client : client[opts.group]
        return catchErrors(groupClient[opts.endpoint](opts) as Effect.Effect<
          any,
          HttpClientError.HttpClientError | SchemaError
        >)
      })
      let atom = freshness
        ? self.runtime.query(effect as Effect.Effect<unknown, unknown, Self>, opts)
        : self.runtime.atom(effect)
      if (!freshness && opts.reactivityKeys) {
        atom = self.runtime.factory.withReactivity(opts.reactivityKeys)(atom)
      }
      if (opts.responseMode === "decoded-only" && opts.serializationKey) {
        atom = Atom.serializable(atom, {
          key: `AtomHttpApi:${opts.group}:${opts.endpoint}:${opts.serializationKey}`,
          schema: AsyncResult.Schema({
            success: Schema.Union(HttpApiEndpoint.getSuccessSchemas(endpoint)),
            error: Schema.Union(HttpApiEndpoint.getErrorSchemas(endpoint))
          }) as any
        })
      }
      if (!freshness && opts.timeToLive) {
        atom = Duration.isFinite(opts.timeToLive)
          ? Atom.setIdleTTL(atom, opts.timeToLive)
          : Atom.keepAlive(atom)
      }
      return atom
    })

    self.query = ((
      group: string,
      endpoint: string,
      request: {
        readonly params?: any
        readonly query?: any
        readonly payload?: any
        readonly headers?: any
        readonly responseMode?: HttpApiEndpoint.ClientResponseMode
        readonly sseOptions?: Sse.DecodeOptions | undefined
        readonly reactivityKeys?: Reactivity.KeysInput | undefined
        readonly timeToLive?: Duration.Input | undefined
        readonly serializationKey?: string | undefined
        readonly staleTime?: Duration.Input | undefined
        readonly revalidateOnFocus?: boolean | "always" | undefined
        readonly focusSignal?: Atom.Atom<any> | undefined
      }
    ) => {
      const key: QueryKey = {
        group,
        endpoint,
        params: request.params,
        query: request.query,
        payload: request.payload,
        headers: request.headers,
        responseMode: request.responseMode ?? "decoded-only",
        sseOptions: request.sseOptions,
        reactivityKeys: request.reactivityKeys,
        timeToLive: request.timeToLive !== undefined
          ? Duration.fromInputUnsafe(request.timeToLive)
          : undefined,
        serializationKey: request.serializationKey,
        staleTime: request.staleTime !== undefined
          ? Duration.fromInputUnsafe(request.staleTime)
          : undefined,
        revalidateOnFocus: request.revalidateOnFocus,
        focusSignal: request.focusSignal
      }
      return queryFamily(key)
    }) as any

    return self as AtomHttpApiClient<Self, Id, Groups>
  }

interface MutationKey {
  group: string
  endpoint: string
  responseMode: HttpApiEndpoint.ClientResponseMode
}

interface QueryKey {
  group: string
  endpoint: string
  params: any
  query: any
  headers: any
  payload: any
  responseMode: HttpApiEndpoint.ClientResponseMode
  reactivityKeys: Reactivity.KeysInput | undefined
  sseOptions: Sse.DecodeOptions | undefined
  timeToLive: Duration.Duration | undefined
  serializationKey: string | undefined
  staleTime: Duration.Duration | undefined
  revalidateOnFocus: boolean | "always" | undefined
  focusSignal: Atom.Atom<any> | undefined
}

type QueryFreshness<Success, ResponseMode> =
  | {
    readonly staleTime?: undefined
    readonly revalidateOnFocus?: undefined
    readonly focusSignal?: undefined
  }
  | ([ResponseMode] extends ["decoded-only"] ? [NonFiniteSuccess<Success>] extends [never] ? {
        readonly staleTime: Duration.Input
        readonly revalidateOnFocus?: boolean | "always" | undefined
        readonly focusSignal?: Atom.Atom<any> | undefined
      }
    : never
    : never)

type NonFiniteSuccess<Success> = Success extends HttpApiSchema.WithHeaders<infer Inner, infer _Headers>
  ? NonFiniteSuccess<Inner>
  : Extract<HttpApiClient.SuccessType<Success>, Stream.Stream<any, any, any> | HttpApiClient.Upgraded<any>>

const isNonFiniteSuccess = (schema: unknown): boolean => {
  while (HttpApiSchema.isWithHeaders(schema)) schema = schema.schema
  return HttpApiSchema.isStreamSchema(schema) || HttpApiSchema.isUpgrade(schema)
}

type ResponseByMode<
  Endpoint extends HttpApiEndpoint.Constraint,
  ResponseMode extends HttpApiEndpoint.ClientResponseMode
> = HttpApiClient.Client.Response<
  HttpApiClient.SuccessType<Extract<Endpoint, HttpApiEndpoint.ConstraintRequest>["~Success"]>,
  ResponseMode
>

type ErrorByMode<
  Error extends Schema.Constraint,
  Middleware,
  ResponseMode extends HttpApiEndpoint.ClientResponseMode
> =
  | HttpApiMiddleware.Error<Middleware>
  | HttpApiMiddleware.ClientError<Middleware>
  | ([ResponseMode] extends ["response-only"] ? never : Error["Type"])
