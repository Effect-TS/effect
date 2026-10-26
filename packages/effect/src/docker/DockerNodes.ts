/**
 * The nodes of a Swarm: list, inspect, update and remove. Only a manager
 * answers; elsewhere every operation fails with `SwarmUnavailable`.
 *
 * Request bodies are the generated `DockerSchema` types.
 *
 * **Example** (Draining a node)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { DockerNodes } from "effect/docker"
 *
 * const drain = (id: string) =>
 *   Effect.gen(function*() {
 *     const nodes = yield* DockerNodes.DockerNodes
 *     const { Spec, Version } = yield* nodes.inspect(id)
 *     yield* nodes.update(id, { ...Spec, Availability: "drain" }, { version: Version?.Index ?? 0 })
 *   })
 * ```
 *
 * @stability unstable
 * @since 4.0.7
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as DockerApi from "./DockerApi.ts"
import { DockerEngine } from "./DockerEngine.ts"
import type { DockerError } from "./DockerError.ts"
import type * as DockerSchema from "./DockerSchema.ts"
import { apiClient, modifyWith, withOperation } from "./internal/engine.ts"

// -----------------------------------------------------------------------------
// service
// -----------------------------------------------------------------------------

/**
 * The nodes API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.7
 */
export class DockerNodes extends Context.Service<DockerNodes, {
  /**
   * Lists the Swarm's nodes.
   *
   * **Details**
   *
   * [Engine API: NodeList](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Node/operation/NodeList).
   * Filters: `id`, `label` (an Engine label), `membership`
   * (`accepted`, `pending`), `name`, `node.label` and `role` (`manager`,
   * `worker`).
   *
   * Typical reasons: `SwarmUnavailable`, `BadRequest` for an invalid filter,
   * `ConnectionFailed`.
   */
  readonly list: (options?: {
    readonly filters?: DockerApi.Filters | undefined
  }) => Effect.Effect<ReadonlyArray<DockerSchema.Node>, DockerError>
  /**
   * Inspects a node, by ID or name.
   *
   * **Details**
   *
   * [Engine API: NodeInspect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Node/operation/NodeInspect).
   * Typical reasons: `NotFound`, `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly inspect: (id: string) => Effect.Effect<DockerSchema.Node, DockerError>
  /**
   * Updates a node's spec: its name, labels, role and availability.
   *
   * **Details**
   *
   * [Engine API: NodeUpdate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Node/operation/NodeUpdate).
   * The spec replaces the current one: start from `inspect`'s `Spec`.
   * `version` is `inspect`'s `Version.Index`; when the node changed since,
   * the Engine fails with `ServerError` and the message `update out of
   * sequence`, and the update needs a fresh `inspect`.
   *
   * Typical reasons: `NotFound`, `BadRequest`, `ServerError` (out of
   * sequence), `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly update: (
    id: string,
    spec: DockerSchema.NodeSpec,
    options: { readonly version: number }
  ) => Effect.Effect<void, DockerError>
  /**
   * Removes a node from the Swarm.
   *
   * **Details**
   *
   * [Engine API: NodeDelete](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Node/operation/NodeDelete).
   * A node that is still up needs `force`.
   *
   * Typical reasons: `NotFound`, `BadRequest` (still up, or a manager),
   * `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly remove: (id: string, options?: { readonly force?: boolean | undefined }) => Effect.Effect<void, DockerError>
  /**
   * Updates a node from its current spec: inspects the node, and updates it
   * with `f` of its `Spec` at the version read.
   *
   * **Details**
   *
   * When another update comes first (`update out of sequence`), it starts
   * over from a fresh `inspect`, at most 5 times in all; any other failure
   * ends it.
   *
   * Typical reasons: `inspect`'s and `update`'s.
   */
  readonly modify: (
    id: string,
    f: (spec: DockerSchema.NodeSpec) => DockerSchema.NodeSpec
  ) => Effect.Effect<void, DockerError>
}>()("effect/docker/DockerNodes") {}

/**
 * Builds the {@link DockerNodes} service over the `DockerEngine` in context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.7
 */
export const make: Effect.Effect<DockerNodes["Service"], never, DockerEngine> = Effect.gen(function*() {
  const engine = yield* DockerEngine
  const api = yield* apiClient(engine, DockerApi.Nodes, "docker.Nodes")
  const inspect: DockerNodes["Service"]["inspect"] = (id) => api.inspect({ params: { id } })
  const update: DockerNodes["Service"]["update"] = (id, spec, options) =>
    api.update({ params: { id }, query: options, payload: spec })
  return DockerNodes.of({
    list: (options) => api.list({ query: options ?? {} }),
    inspect,
    update,
    remove: (id, options) => api.remove({ params: { id }, query: options ?? {} }),
    modify: (id, f) =>
      modifyWith(
        inspect(id),
        (spec, version) => update(id, spec, { version }),
        f
      ).pipe(withOperation(engine, "docker.Nodes.modify", id))
  })
})

/**
 * Provides {@link DockerNodes} over the `DockerEngine` in context, built with
 * {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.7
 */
export const layer: Layer.Layer<DockerNodes, never, DockerEngine> = Layer.effect(DockerNodes, make)
