import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Semver from "semver"
import { NpmPromoteError, PromotionError } from "./NpmPromoteError.ts"
import * as Process from "./Process.ts"

export { NpmPromoteError, PromotionError } from "./NpmPromoteError.ts"

/**
 * A public workspace package and the version it has at HEAD.
 */
export interface ReleasePackage {
  readonly name: string
  readonly version: string
}

/**
 * The `npm` commands the promoter runs.
 */
export class NpmCli extends Context.Service<NpmCli, {
  readonly addDistTag: (options: {
    readonly name: string
    readonly version: string
    readonly tag: string
  }) => Effect.Effect<void, NpmPromoteError>
}>()("@effect/npm-promote/NpmCli") {
  /**
   * Runs `npm dist-tag add`. Authentication comes from the npm config, for
   * example a user config containing `//registry.npmjs.org/:_authToken=${TOKEN}`.
   */
  static readonly layer = Layer.effect(
    NpmCli,
    Effect.gen(function*() {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
      return NpmCli.of({
        addDistTag: ({ name, tag, version }) =>
          Process.run("npm", ["dist-tag", "add", `${name}@${version}`, tag]).pipe(
            Effect.asVoid,
            Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner)
          )
      })
    })
  )
}

export type PromoteResult =
  /** At least one target version is missing from the registry metadata. Nothing was promoted. */
  | {
    readonly _tag: "NotVisible"
    readonly pending: ReadonlyArray<ReleasePackage>
  }
  /** Every target version is visible. `promoted` lists the packages whose `latest` was moved, in order. */
  | {
    readonly _tag: "Promoted"
    readonly promoted: ReadonlyArray<ReleasePackage>
  }

export const registryUrl = "https://registry.npmjs.org"

const abbreviatedMetadata = "application/vnd.npm.install-v1+json"

const encodePackageName = (name: string): string => encodeURIComponent(name).replace(/^%40/, "@")

const PackageMetadata = Schema.Struct({
  "dist-tags": Schema.Record(Schema.String, Schema.String),
  versions: Schema.Record(Schema.String, Schema.Unknown)
})

/**
 * Retries connection failures and transient statuses (408, 429, 5xx) a few
 * times. Anything that still fails is an error, never "not visible".
 */
const withRetries = (client: HttpClient.HttpClient) =>
  client.pipe(HttpClient.retryTransient({
    schedule: Schedule.exponential("1 second"),
    times: 3
  }))

/**
 * Reads a package's abbreviated metadata document. A 404 means the package has
 * never been published and yields `None`.
 */
const fetchMetadata = Effect.fnUntraced(function*(name: string) {
  const client = withRetries(yield* HttpClient.HttpClient)
  return yield* client.execute(
    HttpClientRequest.get(`${registryUrl}/${encodePackageName(name)}`).pipe(
      HttpClientRequest.accept(abbreviatedMetadata)
    )
  ).pipe(
    Effect.flatMap(HttpClientResponse.matchStatus({
      200: (response) => Effect.map(HttpClientResponse.schemaBodyJson(PackageMetadata)(response), Option.some),
      404: () => Effect.succeed(Option.none()),
      orElse: (response) =>
        Effect.fail(
          new NpmPromoteError({ message: `Registry returned status ${response.status} for ${name}` })
        )
    })),
    Effect.mapError((cause) =>
      Schema.is(NpmPromoteError)(cause) ? cause : new NpmPromoteError({
        message: `Could not read registry metadata for ${name}`,
        cause
      })
    )
  )
})

/**
 * Reads the current `latest` tag from the dist-tags endpoint. Unlike the
 * abbreviated metadata, which the registry CDN caches for minutes, this
 * endpoint is not cached, so it is the value to trust before a write.
 */
export const liveLatest = Effect.fnUntraced(function*(name: string) {
  const client = withRetries(yield* HttpClient.HttpClient)
  return yield* client.execute(
    HttpClientRequest.get(`${registryUrl}/-/package/${encodePackageName(name)}/dist-tags`).pipe(
      HttpClientRequest.acceptJson
    )
  ).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Record(Schema.String, Schema.String))),
    Effect.map((tags): string | undefined => tags.latest),
    Effect.mapError((cause) => new NpmPromoteError({ message: `Could not read the dist-tags of ${name}`, cause }))
  )
})

/**
 * Puts `effect` first and keeps the input order for everything else.
 */
const promotionOrder = (packages: ReadonlyArray<ReleasePackage>): ReadonlyArray<ReleasePackage> => [
  ...packages.filter((pkg) => pkg.name === "effect"),
  ...packages.filter((pkg) => pkg.name !== "effect")
]

/**
 * `latest` needs to move when it is missing or lower than the target. A
 * `latest` that is not valid semver is an error rather than a guess.
 */
const needsPromotion = (pkg: ReleasePackage, latest: string | undefined): Effect.Effect<boolean, NpmPromoteError> => {
  if (latest === undefined) {
    return Effect.succeed(true)
  }
  if (Semver.valid(latest) === null) {
    return Effect.fail(new NpmPromoteError({ message: `${pkg.name} has an invalid latest version: ${latest}` }))
  }
  return Effect.succeed(Semver.lt(latest, pkg.version))
}

/**
 * Moves `latest` to the target version of every package once all target
 * versions are visible in the registry's abbreviated metadata.
 *
 * `effect` is promoted first. Packages whose `latest` already equals the
 * target, or is higher than it, are left alone. Before each write the live
 * `latest` is read again, because the abbreviated metadata can be stale. A
 * failed write stops promotion with a `PromotionError`, so no package moves
 * ahead of the ones before it. With `dryRun` the result is the same plan, but
 * no dist-tag is changed.
 */
export const promote = Effect.fnUntraced(function*(
  packages: ReadonlyArray<ReleasePackage>,
  options?: { readonly dryRun?: boolean | undefined }
): Effect.fn.Return<PromoteResult, NpmPromoteError | PromotionError, HttpClient.HttpClient | NpmCli> {
  for (const pkg of packages) {
    if (Semver.valid(pkg.version) === null) {
      return yield* new NpmPromoteError({ message: `${pkg.name} has an invalid target version: ${pkg.version}` })
    }
  }

  const ordered = promotionOrder(packages)
  const metadata = yield* Effect.forEach(ordered, (pkg) => fetchMetadata(pkg.name), { concurrency: 8 })

  const pending = ordered.filter((pkg, i) =>
    Option.match(metadata[i], {
      onNone: () => true,
      onSome: (doc) => !Object.hasOwn(doc.versions, pkg.version)
    })
  )
  if (pending.length > 0) {
    return { _tag: "NotVisible", pending }
  }

  const npm = yield* NpmCli
  const promoted: Array<ReleasePackage> = []
  for (let i = 0; i < ordered.length; i++) {
    const pkg = ordered[i]
    const cachedLatest = Option.getOrThrow(metadata[i])["dist-tags"].latest
    if (!(yield* needsPromotion(pkg, cachedLatest)) || !(yield* needsPromotion(pkg, yield* liveLatest(pkg.name)))) {
      continue
    }
    if (options?.dryRun !== true) {
      yield* npm.addDistTag({ name: pkg.name, version: pkg.version, tag: "latest" }).pipe(
        Effect.mapError((cause) =>
          new PromotionError({
            message: `Could not move latest to ${pkg.name}@${pkg.version}: ${cause.message}`,
            pkg,
            reason: cause.message,
            cause
          })
        )
      )
    }
    promoted.push(pkg)
  }
  return { _tag: "Promoted", promoted }
})

/**
 * Why a target version is missing from the abbreviated metadata, according to
 * the version-specific registry document.
 *
 * - `Published`: the version document exists, so the abbreviated metadata is
 *   lagging behind.
 * - `Missing`: the registry returned 404, so the publish most likely failed.
 * - `Unknown`: the check itself failed. This is never treated as missing.
 * - `PromotionFailed`: the version is visible, but moving `latest` to it failed.
 */
export type Diagnosis =
  | { readonly _tag: "Published"; readonly pkg: ReleasePackage }
  | { readonly _tag: "Missing"; readonly pkg: ReleasePackage }
  | { readonly _tag: "Unknown"; readonly pkg: ReleasePackage; readonly reason: string }
  | { readonly _tag: "PromotionFailed"; readonly pkg: ReleasePackage; readonly reason: string }

const diagnose = Effect.fnUntraced(function*(pkg: ReleasePackage) {
  const client = withRetries(yield* HttpClient.HttpClient)
  return yield* client.execute(
    HttpClientRequest.get(`${registryUrl}/${encodePackageName(pkg.name)}/${encodeURIComponent(pkg.version)}`).pipe(
      HttpClientRequest.acceptJson
    )
  ).pipe(
    Effect.map(HttpClientResponse.matchStatus({
      200: (): Diagnosis => ({ _tag: "Published", pkg }),
      404: (): Diagnosis => ({ _tag: "Missing", pkg }),
      orElse: (response): Diagnosis => ({ _tag: "Unknown", pkg, reason: `registry returned status ${response.status}` })
    })),
    Effect.catch((error) => Effect.succeed<Diagnosis>({ _tag: "Unknown", pkg, reason: error.message }))
  )
})

/**
 * Checks the version-specific registry document of every pending package.
 * Never fails: transport errors become `Unknown`.
 */
export const diagnosePending = (
  pending: ReadonlyArray<ReleasePackage>
): Effect.Effect<ReadonlyArray<Diagnosis>, never, HttpClient.HttpClient> =>
  Effect.forEach(pending, diagnose, { concurrency: 8 })
