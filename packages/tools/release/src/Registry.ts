import * as Config from "effect/Config"
import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import { ReleaseError } from "./Errors.ts"

/** A staged (uploaded, not yet approved) version as returned by `GET /-/stage`. */
export interface StagedItem {
  readonly id: string
  readonly packageName: string
  readonly version: string
  readonly tag: Option.Option<string>
  /** Registry status word (`validating`, `staged`, ...); left opaque here. */
  readonly status: Option.Option<string>
}

export const REGISTRY = "https://registry.npmjs.org/"

const escapeName = (name: string) => name.replaceAll("/", "%2F")

const StagePage = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      packageName: Schema.String,
      version: Schema.String,
      tag: Schema.optionalKey(Schema.String),
      status: Schema.optionalKey(Schema.String)
    })
  ),
  total: Schema.Number
})

const decodeStagePage = Schema.decodeUnknownEffect(Schema.fromJsonString(StagePage))

const PER_PAGE = 100
const MAX_PAGES = 50

/**
 * Read-only registry queries. `isPublished` needs no credentials.
 * `listStaged` needs a token that can read the stage queue (a stage-only
 * granular token, pending the live probe); it is read from `NPM_STAGE_TOKEN`.
 * Without that token the queue is reported empty with a warning, so routing
 * still works and only the "already staged" skip is lost.
 * Nothing in this service writes to the registry.
 */
export class Registry extends Context.Service<Registry, {
  readonly isPublished: (name: string, version: string) => Effect.Effect<boolean, ReleaseError>
  readonly listStaged: Effect.Effect<ReadonlyArray<StagedItem>, ReleaseError>
}>()("@effect/release/Registry") {
  static readonly layer: Layer.Layer<Registry, never, HttpClient.HttpClient> = Layer.effect(
    Registry,
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient

      const isPublished = Effect.fn("Registry.isPublished")(function*(name: string, version: string) {
        const url = `${REGISTRY}${escapeName(name)}/${version}`
        const response = yield* client.execute(HttpClientRequest.get(url).pipe(HttpClientRequest.acceptJson)).pipe(
          Effect.mapError((cause) => new ReleaseError({ message: `Request to ${url} failed`, cause }))
        )
        if (response.status === 200) return true
        if (response.status === 404) return false
        return yield* new ReleaseError({ message: `Unexpected status ${response.status} from ${url}` })
      })

      const listStaged = Effect.gen(function*() {
        const token = yield* Config.option(Config.Redacted("NPM_STAGE_TOKEN")).pipe(
          Effect.mapError((cause) => new ReleaseError({ message: "Could not read NPM_STAGE_TOKEN", cause }))
        )
        if (Option.isNone(token)) {
          // stderr on purpose: `release route` prints JSON on stdout for the workflow to parse.
          yield* Console.error("warning: NPM_STAGE_TOKEN is not set; treating the stage queue as empty")
          return []
        }
        const items: Array<StagedItem> = []
        for (let page = 0; page < MAX_PAGES; page++) {
          const url = new URL("-/stage", REGISTRY)
          url.searchParams.set("page", String(page))
          url.searchParams.set("perPage", String(PER_PAGE))
          const request = HttpClientRequest.get(url.href).pipe(
            HttpClientRequest.acceptJson,
            HttpClientRequest.bearerToken(token.value),
            HttpClientRequest.setHeaders({ "npm-auth-type": "web", "npm-command": "stage" })
          )
          const response = yield* client.execute(request).pipe(
            Effect.mapError((cause) => new ReleaseError({ message: `Request to ${url.href} failed`, cause }))
          )
          if (response.status !== 200) {
            return yield* new ReleaseError({ message: `Unexpected status ${response.status} from ${url.href}` })
          }
          const text = yield* response.text.pipe(
            Effect.mapError((cause) => new ReleaseError({ message: `Could not read ${url.href}`, cause }))
          )
          const decoded = yield* decodeStagePage(text).pipe(
            Effect.mapError((cause) =>
              new ReleaseError({ message: `Unexpected stage queue shape from ${url.href}`, cause })
            )
          )
          for (const item of decoded.items) {
            items.push({
              id: item.id,
              packageName: item.packageName,
              version: item.version,
              tag: Option.fromUndefinedOr(item.tag),
              status: Option.fromUndefinedOr(item.status)
            })
          }
          if (items.length >= decoded.total || decoded.items.length < PER_PAGE) break
        }
        return items
      })

      return Registry.of({ isPublished, listStaged })
    })
  )
}
