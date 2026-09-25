import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { ReleaseError } from "./Errors.ts"
import { versionKey } from "./Routing.ts"
import { optionalSecret } from "./Secrets.ts"

/** A staged (uploaded, not yet approved) version as returned by `GET /-/stage`. */
export interface StagedItem {
  readonly id: string
  readonly packageName: string
  readonly version: string
  readonly tag: Option.Option<string>
  /** Registry status word (`validating`, `staged`, ...); left opaque here. */
  readonly status: Option.Option<string>
}

/** Wire shape of one staged item (`GET /-/stage` entries and `GET /-/stage/<id>`). */
export const StagedItemSchema = Schema.Struct({
  id: Schema.String,
  packageName: Schema.String,
  version: Schema.String,
  tag: Schema.OptionFromOptionalKey(Schema.String),
  status: Schema.OptionFromOptionalKey(Schema.String)
})

export const REGISTRY = "https://registry.npmjs.org/"
export const STAGE_TOKEN = "NPM_STAGE_TOKEN"

/** The headers every stage-queue request carries; the token is the caller's credential. */
export const stageRequest = (token: Redacted.Redacted<string>) => (self: HttpClientRequest.HttpClientRequest) =>
  self.pipe(
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(token),
    HttpClientRequest.setHeaders({ "npm-auth-type": "web", "npm-command": "stage" })
  )

const escapeName = (name: string) => name.replaceAll("/", "%2F")

const StagePage = Schema.Struct({ items: Schema.Array(StagedItemSchema), total: Schema.Number })

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
        const token = yield* optionalSecret(STAGE_TOKEN)
        if (Option.isNone(token)) {
          // stderr on purpose: `release route` prints JSON on stdout for the workflow to parse.
          yield* Console.error(`warning: ${STAGE_TOKEN} is not set; treating the stage queue as empty`)
          return []
        }
        const items: Array<StagedItem> = []
        for (let page = 0; page < MAX_PAGES; page++) {
          const url = new URL("-/stage", REGISTRY)
          url.searchParams.set("page", String(page))
          url.searchParams.set("perPage", String(PER_PAGE))
          const response = yield* client.execute(HttpClientRequest.get(url.href).pipe(stageRequest(token.value))).pipe(
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
          items.push(...decoded.items)
          if (items.length >= decoded.total) return items
          if (decoded.items.length < PER_PAGE) {
            return yield* new ReleaseError({
              message: `Stage queue ended after ${items.length} of ${decoded.total} reported items`
            })
          }
        }
        return yield* new ReleaseError({
          message: `Stage queue exceeded ${MAX_PAGES} pages with more than ${items.length} reported items`
        })
      })

      return Registry.of({ isPublished, listStaged })
    })
  )
}

/** `name@version` keys of every package the registry already serves at that version, probed 8 at a time. */
export const publishedKeys = (
  registry: Registry["Service"],
  packages: ReadonlyArray<{ readonly name: string; readonly version: string }>
): Effect.Effect<ReadonlySet<string>, ReleaseError> =>
  Effect.filter(packages, (pkg) => registry.isPublished(pkg.name, pkg.version), { concurrency: 8 }).pipe(
    Effect.map((served) => new Set(served.map((pkg) => versionKey(pkg.name, pkg.version))))
  )
