import { Effect, FileSystem, Layer, Path } from "effect"
import { Docker, DockerApi, DockerConfig, DockerEngine, DockerRegistryAuth } from "effect/docker"
import { Etag, FetchHttpClient, HttpClient, HttpPlatform, HttpRouter } from "effect/http"
import { type HttpApi, HttpApiBuilder, type HttpApiGroup } from "effect/http-api"

/** The services `HttpApiBuilder` needs, without a file system. */
const PlatformLayer = Layer.mergeAll(Path.layer, Etag.layerWeak, HttpPlatform.layer).pipe(
  Layer.provideMerge(FileSystem.layerNoop({}))
)

/** The Engine's error middlewares only declare errors, so a server passes requests through them. */
const ErrorsLayer = Layer.mergeAll(
  Layer.succeed(DockerApi.EngineErrors, (effect) => effect),
  Layer.succeed(DockerApi.SwarmErrors, (effect) => effect)
)

/**
 * A fake Engine: `api`'s groups served by `handlers` with `HttpApiBuilder`,
 * reached in memory through `FetchHttpClient`, and every `effect/docker`
 * service over it. The version is pinned, so the fake needn't answer
 * `/_ping`, and the `/v1.xx` prefix is dropped, as the Engine also serves
 * unversioned paths. Upgrades (attach, exec) need a real connection.
 */
export const fakeEngine = <Groups extends HttpApiGroup.Constraint, E, R>(
  api: HttpApi.HttpApi<"docker", Groups>,
  handlers: Layer.Layer<HttpApiGroup.ToService<"docker", Groups>, E, R>
) =>
  Layer.unwrap(Effect.gen(function*() {
    const { handler } = yield* Effect.acquireRelease(
      Effect.sync(() =>
        HttpRouter.toWebHandler(
          HttpApiBuilder.layer(api).pipe(
            Layer.provide(handlers),
            Layer.provide(ErrorsLayer),
            Layer.provide(PlatformLayer)
          ) as Layer.Layer<never>,
          { disableLogger: true }
        )
      ),
      ({ dispose }) => Effect.promise(dispose)
    )
    const fetch: typeof globalThis.fetch = Object.assign((input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const url = new URL(request.url)
      url.pathname = url.pathname.replace(/^\/v\d+\.\d+\//, "/")
      return handler(new Request(url, request))
    }, { preconnect() {} })
    const httpClient = yield* HttpClient.HttpClient.pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.provideService(FetchHttpClient.Fetch, fetch)
    )
    const EngineLayer = Layer.effect(DockerEngine.DockerEngine, DockerEngine.make(httpClient)).pipe(
      Layer.provide(DockerConfig.layer({ apiVersion: "1.56" }))
    )
    // nothing here talks to a registry
    const RegistryAuthLayer = Layer.succeed(
      DockerRegistryAuth.DockerRegistryAuth,
      DockerRegistryAuth.DockerRegistryAuth.of({ credential: () => Effect.succeed(undefined) })
    )
    return Docker.layer.pipe(Layer.provideMerge(Layer.mergeAll(EngineLayer, RegistryAuthLayer)))
  }))
