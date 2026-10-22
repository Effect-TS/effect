/**
 * Swarm secrets: list, inspect, create, update and remove. Only a manager
 * answers; elsewhere every operation fails with `SwarmUnavailable`.
 *
 * A secret's `Data` is `Redacted` bytes, sent as the padded standard base64
 * the Engine requires. The Engine never returns it, and only `Labels` can
 * change after creation.
 *
 * **Example** (Creating a secret)
 *
 * ```ts import.meta.vitest
 * import { Effect, Redacted } from "effect"
 * import { DockerSecrets } from "effect/docker"
 *
 * const program = DockerSecrets.DockerSecrets.use((secrets) =>
 *   secrets.create({
 *     Name: "db-password",
 *     Data: Redacted.make(new TextEncoder().encode("s3cret"))
 *   })
 * )
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as DockerApi from "./DockerApi.ts"
import { apiClient, DockerEngine, modifyWith, withOperation } from "./DockerEngine.ts"
import type { DockerError } from "./DockerError.ts"
import type * as DockerSchema from "./DockerSchema.ts"

// -----------------------------------------------------------------------------
// service
// -----------------------------------------------------------------------------

/**
 * The secrets API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.6
 */
export class DockerSecrets extends Context.Service<DockerSecrets, {
  /**
   * Lists secrets.
   *
   * **Details**
   *
   * [Engine API: SecretList](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Secret/operation/SecretList).
   * Filters: `id`, `label`, `name` and `names`.
   *
   * Typical reasons: `SwarmUnavailable`, `BadRequest` for an invalid filter,
   * `ConnectionFailed`.
   */
  readonly list: (options?: {
    readonly filters?: DockerApi.Filters | undefined
  }) => Effect.Effect<ReadonlyArray<DockerApi.Secret>, DockerError>
  /**
   * Inspects a secret, by ID or name. Its `Data` isn't returned.
   *
   * **Details**
   *
   * [Engine API: SecretInspect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Secret/operation/SecretInspect).
   * Typical reasons: `NotFound`, `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly inspect: (id: string) => Effect.Effect<DockerApi.Secret, DockerError>
  /**
   * Creates a secret, and returns its ID.
   *
   * **Details**
   *
   * [Engine API: SecretCreate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Secret/operation/SecretCreate).
   * `Data` is at most 500 KB. A secret with a `Driver` takes its data from
   * that driver instead.
   *
   * Typical reasons: `Conflict` (the name is taken), `BadRequest`,
   * `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly create: (spec: DockerApi.SecretSpec) => Effect.Effect<DockerSchema.SecretCreateResponse, DockerError>
  /**
   * Updates a secret's labels.
   *
   * **Details**
   *
   * [Engine API: SecretUpdate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Secret/operation/SecretUpdate).
   * Only `Labels` can change: start from `inspect`'s `Spec`, and leave `Data`
   * out. Any other change fails with `BadRequest`. `version` is `inspect`'s
   * `Version.Index`; when the secret changed since, the Engine fails with
   * `ServerError` and the message `update out of sequence`.
   *
   * Typical reasons: `BadRequest`, `NotFound`, `ServerError` (out of
   * sequence), `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly update: (
    id: string,
    spec: DockerApi.SecretSpec,
    options: { readonly version: number }
  ) => Effect.Effect<void, DockerError>
  /**
   * Removes a secret.
   *
   * **Details**
   *
   * [Engine API: SecretDelete](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Secret/operation/SecretDelete).
   * Typical reasons: `NotFound`, `BadRequest` (a service uses it),
   * `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly remove: (id: string) => Effect.Effect<void, DockerError>
  /**
   * Updates a secret's labels from its current spec: inspects the secret, and
   * updates it with `f` of its `Spec` at the version read.
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
    f: (spec: DockerApi.SecretSpec) => DockerApi.SecretSpec
  ) => Effect.Effect<void, DockerError>
}>()("effect/docker/DockerSecrets") {}

/**
 * Builds the {@link DockerSecrets} service over the `DockerEngine` in
 * context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make: Effect.Effect<DockerSecrets["Service"], never, DockerEngine> = Effect.gen(function*() {
  const engine = yield* DockerEngine
  const api = yield* apiClient(engine, DockerApi.Secrets, "docker.Secrets")
  const inspect: DockerSecrets["Service"]["inspect"] = (id) => api.inspect({ params: { id } })
  const update: DockerSecrets["Service"]["update"] = (id, spec, options) =>
    api.update({ params: { id }, query: options, payload: spec })
  return DockerSecrets.of({
    list: (options) => api.list({ query: options ?? {} }),
    inspect,
    create: (spec) => api.create({ payload: spec }),
    update,
    remove: (id) => api.remove({ params: { id } }),
    modify: (id, f) =>
      modifyWith(
        inspect(id),
        (spec, version) => update(id, spec, { version }),
        f
      ).pipe(withOperation(engine, "docker.Secrets.modify", id))
  })
})

/**
 * Provides {@link DockerSecrets} over the `DockerEngine` in context, built
 * with {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.6
 */
export const layer: Layer.Layer<DockerSecrets, never, DockerEngine> = Layer.effect(DockerSecrets, make)
