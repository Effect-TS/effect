import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type * as Redacted from "effect/Redacted"
import { ReleaseError } from "./Errors.ts"

/** A redacted value from the environment variable `name`, if set. */
export const optionalSecret = (name: string): Effect.Effect<Option.Option<Redacted.Redacted<string>>, ReleaseError> =>
  Config.option(Config.Redacted(name)).pipe(
    Effect.mapError((cause) => new ReleaseError({ message: `Could not read ${name}`, cause }))
  )

/** Like {@link optionalSecret}, but a missing variable fails with `missing`. */
export const requireSecret = (name: string, missing: string): Effect.Effect<Redacted.Redacted<string>, ReleaseError> =>
  optionalSecret(name).pipe(
    Effect.flatMap(Option.match({
      onNone: () => new ReleaseError({ message: missing }),
      onSome: Effect.succeed
    }))
  )
