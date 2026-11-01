/**
 * Serves Agent User Interaction (AG-UI) runs over HTTP.
 *
 * AG-UI clients POST a `RunAgentInput` as JSON and read the run's events as
 * Server-Sent Events, one JSON event per `data:` line. This module defines that
 * binding as an `HttpApiEndpoint`, so it can join an existing `HttpApi`, and
 * provides a layer that mounts a single run handler on an `HttpRouter`.
 *
 * **Example** (Serving a model as an AG-UI agent)
 *
 * ```ts
 * import { AgUi, AgUiServer, LanguageModel } from "effect/ai"
 *
 * const AgentRoute = AgUiServer.layerHttp({
 *   path: "/agent",
 *   run: (input) =>
 *     LanguageModel.streamText({ prompt: AgUi.toPrompt(input) }).pipe(
 *       AgUi.fromStreamParts
 *     )
 * })
 * ```
 *
 * @stability experimental
 * @since 4.1.0
 */
import * as Effect from "../Effect.ts"
import type * as FileSystem from "../FileSystem.ts"
import * as HttpApi from "../http-api/HttpApi.ts"
import * as HttpApiBuilder from "../http-api/HttpApiBuilder.ts"
import * as HttpApiEndpoint from "../http-api/HttpApiEndpoint.ts"
import * as HttpApiGroup from "../http-api/HttpApiGroup.ts"
import * as HttpApiSchema from "../http-api/HttpApiSchema.ts"
import type * as Etag from "../http/Etag.ts"
import type * as HttpPlatform from "../http/HttpPlatform.ts"
import type * as HttpRouter from "../http/HttpRouter.ts"
import * as Layer from "../Layer.ts"
import type * as Path from "../Path.ts"
import * as Schema from "../Schema.ts"
import * as Stream from "../Stream.ts"
import * as AgUi from "./AgUi.ts"
import * as AgUiSchema from "./AgUiSchema.ts"

/**
 * Creates the `POST` endpoint declaration for AG-UI runs.
 *
 * **When to use**
 *
 * Use to add an AG-UI agent to an existing `HttpApi`, and implement it with
 * {@link handler}.
 *
 * **Details**
 *
 * The payload is a JSON `RunAgentInput`, so an invalid body is rejected with
 * `400` before the event stream opens. The success response is a
 * `text/event-stream` of AG-UI events sent as `data:` lines, with
 * `Cache-Control: no-cache` and a keepalive comment every 15 seconds.
 *
 * @see {@link handler} for implementing the endpoint
 * @see {@link layerHttp} for serving a single agent without declaring an `HttpApi`
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const endpoint = <const Name extends string, const Path extends HttpRouter.PathInput>(
  name: Name,
  path: Path
) =>
  HttpApiEndpoint.post(name, path, {
    payload: AgUiSchema.RunAgentInput,
    success: HttpApiSchema.WithHeaders(
      HttpApiSchema.StreamSse({ data: AgUiSchema.Event, keepAlive: "15 seconds" }),
      { "cache-control": Schema.Literal("no-cache") }
    )
  })

/**
 * Creates an `HttpApiBuilder` handler for an {@link endpoint} from a function
 * that streams the events of one run.
 *
 * **Details**
 *
 * The stream returned by `run` is wrapped with `AgUi.withRunLifecycle`, so the
 * client receives `RUN_STARTED` first and exactly one `RUN_FINISHED` or
 * `RUN_ERROR` last. Failures of the stream, including events that cannot be
 * encoded as JSON, are logged and reported, and reach the client as a
 * `RUN_ERROR` without error details. The stream runs with the
 * services available to the handler.
 *
 * @see {@link endpoint} for declaring the endpoint
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const handler = <E, R>(
  run: (input: AgUiSchema.RunAgentInput) => Stream.Stream<AgUiSchema.Event, E, R>
) =>
({ payload }: { readonly payload: AgUiSchema.RunAgentInput }) =>
  Effect.map(Effect.context<R>(), (context) =>
    HttpApiSchema.withHeaders({
      body: run(payload).pipe(
        // Serialize here so an unencodable event becomes a sanitized RUN_ERROR
        // rather than an HttpApi stream failure frame. The parsed result is
        // plain JSON data, so HttpApi encoding it again cannot fail.
        Stream.mapEffect(normalizeEvent),
        AgUi.withRunLifecycle(payload),
        Stream.provideContext(context)
      ),
      headers: { "cache-control": "no-cache" as const }
    }))

const encodeEvent = Schema.encodeUnknownEffect(Schema.fromJsonString(AgUiSchema.Event))

const normalizeEvent = (event: AgUiSchema.Event) =>
  Effect.map(encodeEvent(event), (json): AgUiSchema.Event => JSON.parse(json))

/**
 * Creates a layer that serves AG-UI runs at `path` on the current
 * `HttpRouter`.
 *
 * **Details**
 *
 * The route follows {@link endpoint}, and each request is answered by `run`
 * as described in {@link handler}. The returned layer needs the services
 * `HttpApiBuilder.layer` needs, which HTTP server layers usually provide.
 *
 * **Gotchas**
 *
 * Every field of the input comes from the client. Convert it with
 * `AgUi.toPrompt`, which drops client-supplied instructions by default.
 *
 * @see {@link endpoint} for adding an AG-UI agent to an existing `HttpApi`
 *
 * @stability experimental
 * @category layers
 * @since 4.1.0
 */
export const layerHttp = <E, R>(options: {
  readonly path: HttpRouter.PathInput
  readonly run: (input: AgUiSchema.RunAgentInput) => Stream.Stream<AgUiSchema.Event, E, R>
}): Layer.Layer<
  never,
  never,
  HttpRouter.HttpRouter | Etag.Generator | FileSystem.FileSystem | HttpPlatform.HttpPlatform | Path.Path | R
> => {
  const api = HttpApi.make("effect/ai/AgUiServer").add(
    HttpApiGroup.make("agUi").add(endpoint("run", options.path))
  )
  return Layer.unwrap(Effect.map(Effect.context<R>(), (context) => {
    // Exclude<R, R> does not reduce for a generic R
    const run = (input: AgUiSchema.RunAgentInput) =>
      Stream.provideContext(options.run(input), context) as Stream.Stream<AgUiSchema.Event, E>
    return HttpApiBuilder.layer(api).pipe(
      Layer.provide(HttpApiBuilder.group(api, "agUi", (handlers) => handlers.handle("run", handler(run))))
    )
  }))
}
