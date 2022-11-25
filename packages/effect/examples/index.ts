import { Context, Effect, Layer, Logger, pipe } from "effect"

export interface Name {
  getName: Effect.Effect<never, never, string>
}

export const Name = Context.Tag<Name>()

export const program = Effect.gen(function*($) {
  const { getName } = yield* $(Effect.service(Name))

  yield* $(Effect.log(`Hello ${yield* $(getName)}`))
})

export const NameLive = Layer.fromEffect(Name)(
  Effect.sync(() => ({
    getName: Effect.succeed("Mike")
  }))
)

pipe(
  program,
  Effect.provideLayer(NameLive),
  Effect.provideLayer(Logger.console()),
  Effect.unsafeFork
)
