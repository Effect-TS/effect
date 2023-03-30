/**
 * @since 1.0.0
 */
import * as Context from "@effect/data/Context"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"

// TODO: move this to a better place

/**
 * @since 1.0.0
 * @category models
 */
export interface Console {
  log(text: string): Effect.Effect<never, never, void>
}

/** @internal */
class ConsoleImpl implements Console {
  log(text: string): Effect.Effect<never, never, void> {
    return Effect.sync(() => {
      console.log(text)
    })
  }
}

/**
 * @since 1.0.0
 * @category context
 */
export const Console = Context.Tag<Console>()

/**
 * @since 1.0.0
 * @category context
 */
export const layer: Layer.Layer<never, never, Console> = Layer.sync(Console, () => new ConsoleImpl())

/**
 * @since 1.0.0
 * @category accessors
 */
export const log = (text: string): Effect.Effect<Console, never, void> =>
  Effect.flatMap(Console, (console) => console.log(text))
