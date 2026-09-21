import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import type * as HttpClient from "effect/unstable/http/HttpClient"
import { notImplementedEffect, type ReleaseError } from "./Errors.ts"

/** A staged (uploaded, not yet approved) version as returned by `GET /-/stage`. */
export interface StagedItem {
  readonly id: string
  readonly packageName: string
  readonly version: string
  readonly tag: Option.Option<string>
  /** Registry status word (`validating`, `staged`, ...); left opaque here. */
  readonly status: Option.Option<string>
}

/**
 * Read-only registry queries. `isPublished` needs no credentials.
 * `listStaged` needs a token that can read the stage queue (a stage-only
 * granular token, pending the live probe); it is read from `NPM_STAGE_TOKEN`.
 * Nothing in this service writes to the registry.
 */
export class Registry extends Context.Service<Registry, {
  readonly isPublished: (name: string, version: string) => Effect.Effect<boolean, ReleaseError>
  readonly listStaged: Effect.Effect<ReadonlyArray<StagedItem>, ReleaseError>
}>()("@effect/release/Registry") {
  static readonly layer: Layer.Layer<Registry, never, HttpClient.HttpClient> = Layer.effect(
    Registry,
    notImplementedEffect("Registry.layer")
  )
}
