import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import { SpikeError } from "./Errors.ts"

export const REGISTRY = "https://registry.npmjs.org/"

/** Minimal shape of a staged item; every other field is kept in `raw`. */
export const StageItem = Schema.Struct({
  id: Schema.String,
  packageName: Schema.String,
  version: Schema.String,
  tag: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.String),
  createdAt: Schema.optionalKey(Schema.String)
})
export type StageItem = typeof StageItem.Type

const StageListPage = Schema.Struct({
  items: Schema.Array(Schema.Unknown),
  total: Schema.Number
})

const decodeStageItem = Schema.decodeUnknownEffect(StageItem)
const decodeStageListPage = Schema.decodeUnknownEffect(StageListPage)

export interface RegistryResponse {
  readonly url: string
  readonly status: number
  readonly body: unknown
  readonly text: string
  readonly headers: Record<string, string>
  readonly durationMs: number
}

const escapeName = (name: string) => name.replaceAll("/", "%2F")

const tryJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/**
 * Executes a GET against the registry. Non-2xx responses are returned, not
 * raised: the point of the spike is to record what the registry says.
 */
export const registryGet = Effect.fn("registryGet")(function*(
  url: string,
  options: {
    readonly token: Option.Option<Redacted.Redacted<string>>
    readonly headers?: Record<string, string> | undefined
  }
) {
  const client = yield* HttpClient.HttpClient
  let request = HttpClientRequest.get(url).pipe(
    HttpClientRequest.acceptJson,
    HttpClientRequest.setHeaders({ "user-agent": "effect-release-spike", ...options.headers })
  )
  if (Option.isSome(options.token)) {
    request = HttpClientRequest.bearerToken(request, options.token.value)
  }
  const startedAt = Date.now()
  const response = yield* client.execute(request).pipe(
    Effect.mapError((cause) => new SpikeError({ message: `Request to ${url} failed`, cause }))
  )
  const text = yield* response.text.pipe(
    Effect.mapError((cause) => new SpikeError({ message: `Could not read body from ${url}`, cause }))
  )
  const headers: Record<string, string> = {}
  for (const name of ["content-type", "npm-notice", "www-authenticate", "retry-after", "x-github-request-id"]) {
    const value = response.headers[name]
    if (typeof value === "string") headers[name] = value
  }
  const result: RegistryResponse = {
    url,
    status: response.status,
    body: tryJson(text),
    text,
    headers,
    durationMs: Date.now() - startedAt
  }
  return result
})

/** Headers pnpm sends on stage endpoints; mirrored so the registry sees the same client shape. */
export const stageHeaders = { "npm-auth-type": "web", "npm-command": "stage" }

export const stageListUrl = (page: number, pkg: Option.Option<string>) => {
  const url = new URL("-/stage", REGISTRY)
  url.searchParams.set("page", String(page))
  url.searchParams.set("perPage", "100")
  if (Option.isSome(pkg)) url.searchParams.set("package", pkg.value)
  return url.href
}

export const stageViewUrl = (stageId: string) => new URL(`-/stage/${stageId}`, REGISTRY).href

export const packumentUrl = (name: string) => new URL(escapeName(name), REGISTRY).href

export const attestationsUrl = (name: string, version: string) =>
  new URL(`-/npm/v1/attestations/${escapeName(name)}@${version}`, REGISTRY).href

/** Lists every staged item visible to the caller, paging like the npm CLI does. */
export const listStaged = Effect.fn("listStaged")(function*(
  token: Option.Option<Redacted.Redacted<string>>,
  pkg: Option.Option<string>,
  onResponse: (response: RegistryResponse) => Effect.Effect<void, SpikeError> = () => Effect.void
) {
  const items: Array<{ readonly item: StageItem; readonly raw: unknown }> = []
  const responses: Array<RegistryResponse> = []
  for (let page = 0; page < 50; page++) {
    const response = yield* registryGet(stageListUrl(page, pkg), { token, headers: stageHeaders })
    responses.push(response)
    yield* onResponse(response)
    if (response.status !== 200) break
    const decoded = yield* decodeStageListPage(response.body).pipe(
      Effect.mapError((cause) => new SpikeError({ message: "Unexpected stage list shape", cause }))
    )
    for (const raw of decoded.items) {
      const item = yield* decodeStageItem(raw).pipe(
        Effect.mapError((cause) => new SpikeError({ message: "Unexpected stage item shape", cause }))
      )
      items.push({ item, raw })
    }
    if (items.length >= decoded.total || decoded.items.length < 100) break
  }
  return { items, responses }
})

export const viewStaged = Effect.fn("viewStaged")(function*(
  token: Option.Option<Redacted.Redacted<string>>,
  stageId: string,
  onResponse: (response: RegistryResponse) => Effect.Effect<void, SpikeError> = () => Effect.void
) {
  const response = yield* registryGet(stageViewUrl(stageId), { token, headers: stageHeaders })
  yield* onResponse(response)
  const item = response.status === 200
    ? Option.some(
      yield* decodeStageItem(response.body).pipe(
        Effect.mapError((cause) => new SpikeError({ message: "Unexpected stage item shape", cause }))
      )
    )
    : Option.none<StageItem>()
  return { response, item }
})

/** Field names present on a raw item beyond the ones the harness models. */
export const extraFields = (raw: unknown): ReadonlyArray<string> =>
  raw !== null && typeof raw === "object"
    ? Object.keys(raw).filter((key) => !(key in StageItem.fields)).sort()
    : []
