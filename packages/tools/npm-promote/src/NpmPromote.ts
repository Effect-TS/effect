import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import * as Schema from "effect/Schema"

export class NpmPromoteError extends Schema.TaggedError<NpmPromoteError>()("NpmPromoteError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect())
}) {}

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
}>()("@effect/npm-promote/NpmCli") {}

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

/**
 * Moves `latest` to the target version of every package once all target
 * versions are visible in the registry's abbreviated metadata.
 *
 * `effect` is promoted first. Packages whose `latest` already equals the
 * target, or is higher than it, are left alone.
 */
export const promote = (
  _packages: ReadonlyArray<ReleasePackage>,
  _options?: { readonly dryRun?: boolean | undefined }
): Effect.Effect<PromoteResult, NpmPromoteError, HttpClient.HttpClient | NpmCli> => Effect.die("not implemented")
