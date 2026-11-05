import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as RcRef from "effect/RcRef"
import * as Terminal from "effect/Terminal"
import * as Input from "./input.ts"

/** @internal */
export const make = (input: Input.InputShape): Terminal.Shape["readLine"] =>
  Effect.suspend(() =>
    Queue.poll(input.lines).pipe(
      Effect.flatMap(Option.match({
        onNone: () => Effect.scoped(Effect.andThen(RcRef.get(input.readline), Queue.take(input.lines))),
        onSome: Effect.succeed
      })),
      Effect.mapError(() => new Terminal.QuitError({}))
    )
  )

/** @internal */
export const layer: Layer.Layer<"effect/Terminal/readLine"> = Layer.effect(
  Terminal.readLine,
  Effect.map(Effect.service(Input.Input), make)
).pipe(Layer.provide(Input.layer))
