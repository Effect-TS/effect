/**
 * Managed plugins: list, inspect, install, pull, upgrade, enable, disable,
 * configure, create, push and remove.
 *
 * A plugin asks for privileges (host networking, mounts, devices,
 * capabilities), which the Engine grants only as they are sent back with
 * `pull` or `upgrade`: read them with `privileges`, and decide. Nothing here
 * accepts them on its own. `install` runs the whole sequence the `docker
 * plugin install` command does, with the decision as a function.
 *
 * Every operation that talks to a Registry (privileges, pull, upgrade, push)
 * sends the credential `DockerRegistryAuth` resolves for that Registry in
 * `X-Registry-Auth`, anonymous as `{}`; a per-call `auth` replaces it.
 * Progress streams fail with `StreamFailed` on the first in-band error, such
 * as `incorrect privileges` or a Registry's refusal, which the Engine reports
 * after its `200`.
 *
 * **Example** (Installing a plugin after reviewing its privileges)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { DockerPlugins } from "effect/docker"
 *
 * const program = DockerPlugins.DockerPlugins.use((plugins) =>
 *   plugins.install("vieux/sshfs", {
 *     // grant what it asks for, unless it wants the host's network
 *     accept: (privileges) =>
 *       privileges.some((privilege) => privilege.Name === "network" && privilege.Value?.includes("host"))
 *         ? Effect.fail("refused")
 *         : Effect.succeed(privileges),
 *     args: ["DEBUG=1"]
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
import type * as Redacted from "../Redacted.ts"
import * as Stream from "../Stream.ts"
import * as DockerApi from "./DockerApi.ts"
import type * as DockerConfig from "./DockerConfig.ts"
import { apiClient, DockerEngine, withOperation, withStreamOperation } from "./DockerEngine.ts"
import type { DockerError } from "./DockerError.ts"
import * as DockerImages from "./DockerImages.ts"
import { DockerRegistryAuth, registryAuthHeader } from "./DockerRegistryAuth.ts"
import type * as DockerSchema from "./DockerSchema.ts"

// -----------------------------------------------------------------------------
// service
// -----------------------------------------------------------------------------

/**
 * The plugins API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.6
 */
export class DockerPlugins extends Context.Service<DockerPlugins, {
  /**
   * Lists installed plugins.
   *
   * **Details**
   *
   * [Engine API: PluginList](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Plugin/operation/PluginList).
   * Filters: `capability` and `enable` (`true`, `false`).
   *
   * Typical reasons: `BadRequest` for an invalid filter, `ConnectionFailed`.
   */
  readonly list: (options?: {
    readonly filters?: DockerApi.Filters | undefined
  }) => Effect.Effect<ReadonlyArray<DockerSchema.Plugin>, DockerError>
  /**
   * Inspects an installed plugin.
   *
   * **Details**
   *
   * [Engine API: PluginInspect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Plugin/operation/PluginInspect).
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly inspect: (name: string) => Effect.Effect<DockerSchema.Plugin, DockerError>
  /**
   * Returns the privileges a plugin in a Registry asks for, which `pull` and
   * `upgrade` must send back.
   *
   * **Details**
   *
   * [Engine API: GetPluginPrivileges](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Plugin/operation/GetPluginPrivileges).
   * A Registry that refuses the credential fails with `ServerError`, not
   * `Unauthorized`.
   *
   * Typical reasons: `ServerError`, `BadRequest`, `InvalidReference`,
   * `CredentialsUnavailable`, `ConnectionFailed`.
   */
  readonly privileges: (
    remote: string,
    options?: { readonly auth?: DockerConfig.Credential | undefined }
  ) => Effect.Effect<DockerApi.Privileges, DockerError>
  /**
   * Pulls and installs a plugin, disabled, and returns the progress
   * messages.
   *
   * **Details**
   *
   * [Engine API: PluginPull](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Plugin/operation/PluginPull).
   * `privileges` are the ones granted: all of those `privileges` returns, or
   * the stream fails with `StreamFailed` (`incorrect privileges`) once the
   * download is done, and nothing is installed. `name` is the local name, by
   * default the remote reference.
   *
   * Typical reasons: `BadRequest` (the name is taken), `StreamFailed`,
   * `ServerError`, `InvalidReference`, `CredentialsUnavailable`,
   * `ConnectionFailed`.
   */
  readonly pull: (
    remote: string,
    options: {
      readonly privileges: DockerApi.Privileges
      readonly name?: string | undefined
      readonly auth?: DockerConfig.Credential | undefined
    }
  ) => Stream.Stream<DockerSchema.ProgressMessage, DockerError>
  /**
   * Installs a plugin as `docker plugin install` does, and returns its name.
   *
   * **Details**
   *
   * It reads the privileges, asks `accept`, pulls with the accepted ones,
   * applies `args`, and enables the plugin unless `disabled`. When the pull,
   * the settings or the enabling fail, it removes the plugin again and fails
   * with that error.
   *
   * - `accept` decides on the privileges the plugin asks for: it returns the
   *   ones to grant, which must be all of them for the Engine to install it,
   *   or fails to refuse, and `install` fails with that error before
   *   anything is pulled.
   * - `name` is the local name, by default the remote reference.
   * - `args` are `set`'s `KEY=value` settings, applied before enabling; any
   *   of them can be `Redacted`.
   * - `disabled` leaves the plugin disabled.
   * - `auth` replaces the credential `DockerRegistryAuth` resolves.
   * - `timeout` is `enable`'s.
   *
   * Typical reasons: `pull`'s, `set`'s and `enable`'s, and `accept`'s own
   * error.
   */
  readonly install: <E = never, R = never>(
    remote: string,
    options: {
      readonly accept: (privileges: DockerApi.Privileges) => Effect.Effect<DockerApi.Privileges, E, R>
      readonly name?: string | undefined
      readonly args?: ReadonlyArray<string | Redacted.Redacted<string>> | undefined
      readonly disabled?: boolean | undefined
      readonly auth?: DockerConfig.Credential | undefined
      readonly timeout?: number | undefined
    }
  ) => Effect.Effect<string, DockerError | E, R>
  /**
   * Upgrades a disabled plugin to another image, and returns the progress
   * messages.
   *
   * **Details**
   *
   * [Engine API: PluginUpgrade](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Plugin/operation/PluginUpgrade).
   * `privileges` are as `pull`'s, for `remote`. The Engine doesn't check
   * that `remote` is the same plugin: an unrelated one replaces it, and its
   * settings reset to the new defaults.
   *
   * Typical reasons: `Conflict` (enabled), `NotFound`, `StreamFailed`,
   * `ServerError`, `InvalidReference`, `CredentialsUnavailable`,
   * `ConnectionFailed`.
   */
  readonly upgrade: (
    name: string,
    remote: string,
    options: {
      readonly privileges: DockerApi.Privileges
      readonly auth?: DockerConfig.Credential | undefined
    }
  ) => Stream.Stream<DockerSchema.ProgressMessage, DockerError>
  /**
   * Enables a plugin.
   *
   * **Details**
   *
   * [Engine API: PluginEnable](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Plugin/operation/PluginEnable).
   * `timeout` (seconds, default 0) is the Engine's timeout for each request
   * to the plugin while activating it, not a deadline for the call: a plugin
   * that never answers fails after about 30 seconds whatever it is. Bound the
   * call with `Effect.timeout` when that matters.
   *
   * Typical reasons: `Conflict` (already enabled), `NotFound`,
   * `ServerError` (the plugin didn't start), `ConnectionFailed`.
   */
  readonly enable: (
    name: string,
    options?: { readonly timeout?: number | undefined }
  ) => Effect.Effect<void, DockerError>
  /**
   * Disables a plugin.
   *
   * **Details**
   *
   * [Engine API: PluginDisable](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Plugin/operation/PluginDisable).
   * `force` disables it while something uses it.
   *
   * Typical reasons: `Conflict` (already disabled), `NotFound`,
   * `ServerError` (in use), `ConnectionFailed`.
   */
  readonly disable: (
    name: string,
    options?: { readonly force?: boolean | undefined }
  ) => Effect.Effect<void, DockerError>
  /**
   * Configures a disabled plugin with `KEY=value` settings.
   *
   * **Details**
   *
   * [Engine API: PluginSet](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Plugin/operation/PluginSet).
   * A setting can be an env variable, `source` of a mount
   * (`<mount>.source=…`), `path` of a device or the args, as the plugin
   * declares them settable. A setting can be `Redacted`, and is sent
   * unwrapped.
   *
   * Typical reasons: `NotFound`, `ServerError` (not settable, or enabled),
   * `ConnectionFailed`.
   */
  readonly set: (
    name: string,
    settings: ReadonlyArray<string | Redacted.Redacted<string>>
  ) => Effect.Effect<void, DockerError>
  /**
   * Creates a plugin, disabled, from a tar of its root filesystem and
   * config.
   *
   * **Details**
   *
   * [Engine API: PluginCreate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Plugin/operation/PluginCreate).
   * The tar holds `config.json` (the plugin's config, see the Engine's
   * plugin docs) and `rootfs/`. `name` is the plugin's reference, with a tag.
   *
   * Typical reasons: `Conflict` (the name is taken), `ServerError` (no
   * `config.json`, or an invalid name), `ConnectionFailed`.
   */
  readonly create: (
    name: string,
    context: Stream.Stream<Uint8Array, DockerError>
  ) => Effect.Effect<void, DockerError>
  /**
   * Pushes a plugin to its Registry, and returns the progress messages.
   *
   * **Details**
   *
   * [Engine API: PluginPush](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Plugin/operation/PluginPush).
   * A Registry that refuses the credential fails the stream with
   * `StreamFailed`.
   *
   * Typical reasons: `NotFound`, `StreamFailed`, `InvalidReference`,
   * `CredentialsUnavailable`, `ConnectionFailed`.
   */
  readonly pushStream: (
    name: string,
    options?: { readonly auth?: DockerConfig.Credential | undefined }
  ) => Stream.Stream<DockerSchema.ProgressMessage, DockerError>
  /**
   * Pushes a plugin to its Registry, and returns the pushed manifest.
   *
   * **Details**
   *
   * See `pushStream`; this runs it to the end.
   *
   * Typical reasons: `pushStream`'s, and `InvalidResponse`.
   */
  readonly push: (
    name: string,
    options?: { readonly auth?: DockerConfig.Credential | undefined }
  ) => Effect.Effect<DockerImages.PushResult, DockerError>
  /**
   * Removes a plugin.
   *
   * **Details**
   *
   * [Engine API: PluginDelete](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Plugin/operation/PluginDelete).
   * An enabled plugin needs `force`.
   *
   * Typical reasons: `Conflict` (enabled), `NotFound`, `ConnectionFailed`.
   */
  readonly remove: (
    name: string,
    options?: { readonly force?: boolean | undefined }
  ) => Effect.Effect<void, DockerError>
}>()("effect/docker/DockerPlugins") {}

/**
 * Builds the {@link DockerPlugins} service over the `DockerEngine` and
 * `DockerRegistryAuth` in context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make: Effect.Effect<DockerPlugins["Service"], never, DockerEngine | DockerRegistryAuth> = Effect.gen(
  function*() {
    const engine = yield* DockerEngine
    const registryAuth = yield* DockerRegistryAuth
    const api = yield* apiClient(engine, DockerApi.Plugins, "docker.Plugins")

    /** `X-Registry-Auth` for a plugin reference: the call's `auth`, otherwise the resolved credential. */
    const registryAuthOf = (reference: string, auth: DockerConfig.Credential | undefined) =>
      Effect.flatMap(
        Effect.fromResult(DockerImages.parseReference(reference)),
        ({ registry }) => registryAuthHeader(registryAuth, registry, auth)
      )

    const privilegesOf: DockerPlugins["Service"]["privileges"] = (remote, options) =>
      Effect.flatMap(
        registryAuthOf(remote, options?.auth),
        (auth) => api.privileges({ query: { remote }, headers: { "x-registry-auth": auth } })
      ).pipe(withOperation(engine, "docker.Plugins.privileges", remote))

    /** A pull's progress, and the name the plugin is installed as. */
    const pullWith = (remote: string, options: Parameters<DockerPlugins["Service"]["pull"]>[1]) =>
      Effect.flatMap(registryAuthOf(remote, options.auth), (auth) =>
        Effect.map(
          api.pull({
            query: { remote, name: options.name },
            headers: { "x-registry-auth": auth },
            payload: options.privileges
          }),
          ({ body, headers }) => ({
            name: headers["docker-plugin-name"] ?? options.name ?? remote,
            progress: DockerImages.failOnError(body)
          })
        ))

    const enable: DockerPlugins["Service"]["enable"] = (name, options) =>
      api.enable({ params: { name }, query: { timeout: options?.timeout ?? 0 } })
    const set: DockerPlugins["Service"]["set"] = (name, settings) => api.set({ params: { name }, payload: settings })
    const remove: DockerPlugins["Service"]["remove"] = (name, options) =>
      api.remove({ params: { name }, query: options ?? {} })
    const pushStream: DockerPlugins["Service"]["pushStream"] = (name, options) =>
      Stream.unwrap(Effect.map(
        registryAuthOf(name, options?.auth),
        (auth) => DockerImages.failOnError(api.push({ params: { name }, headers: { "x-registry-auth": auth } }))
      )).pipe(withStreamOperation(engine, "docker.Plugins.pushStream", name))

    return DockerPlugins.of({
      list: (options) => api.list({ query: options ?? {} }),
      inspect: (name) => api.inspect({ params: { name } }),
      privileges: privilegesOf,
      pull: (remote, options) =>
        Stream.unwrap(Effect.map(pullWith(remote, options), ({ progress }) => progress)).pipe(
          withStreamOperation(engine, "docker.Plugins.pull", remote)
        ),
      install: (remote, options) =>
        Effect.gen(function*() {
          const asked = yield* privilegesOf(remote, { auth: options.auth })
          const accepted = yield* options.accept(asked)
          const pulled = yield* pullWith(remote, { privileges: accepted, name: options.name, auth: options.auth })
          yield* Effect.gen(function*() {
            yield* Stream.runDrain(pulled.progress)
            if (options.args !== undefined && options.args.length > 0) yield* set(pulled.name, options.args)
            if (options.disabled !== true) yield* enable(pulled.name, { timeout: options.timeout })
          }).pipe(
            // nothing is left behind; a pull that failed installed nothing
            Effect.onError(() => Effect.ignore(remove(pulled.name, { force: true })))
          )
          return pulled.name
        }).pipe(Effect.withSpan("docker.Plugins.install", { attributes: { "docker.resource_id": remote } })),
      upgrade: (name, remote, options) =>
        Stream.unwrap(Effect.flatMap(registryAuthOf(remote, options.auth), (auth) =>
          Effect.map(
            api.upgrade({
              params: { name },
              query: { remote },
              headers: { "x-registry-auth": auth },
              payload: options.privileges
            }),
            ({ body }) => DockerImages.failOnError(body)
          ))).pipe(withStreamOperation(engine, "docker.Plugins.upgrade", name)),
      enable,
      disable: (name, options) => api.disable({ params: { name }, query: options ?? {} }),
      set,
      create: (name, context) => api.create({ query: { name }, payload: context }),
      pushStream,
      push: (name, options) =>
        DockerImages.pushResultOf(pushStream(name, options), "docker.Plugins.push").pipe(
          withOperation(engine, "docker.Plugins.push", name)
        ),
      remove
    })
  }
)

/**
 * Provides {@link DockerPlugins} over the `DockerEngine` and `DockerRegistryAuth`
 * in context, built with {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.6
 */
export const layer: Layer.Layer<DockerPlugins, never, DockerEngine | DockerRegistryAuth> = Layer.effect(
  DockerPlugins,
  make
)
