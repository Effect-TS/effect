import type * as Effect from "effect/Effect"
import type * as Option from "effect/Option"

export interface Persistance {
  readonly get: (key: string) => Effect.Effect<never, never, Option.Option<unknown>>
  readonly getMany: (key: string) => Effect.Effect<never, never, Array<Option.Option<unknown>>>
  readonly set: (key: string, value: unknown) => Effect.Effect<never, never, void>
  readonly remove: (key: string) => Effect.Effect<never, never, void>
}
