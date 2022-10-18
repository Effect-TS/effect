import * as E from "@effect/core/io/Effect"
import * as Layer from "@effect/core/io/Layer"
import * as Logger from "@effect/core/io/Logger"
import * as STM from "@effect/core/stm/STM"

interface Service {
  base: number
}

const Service = Tag<Service>()

const ServiceLive = Layer.fromEffect(Service)(E.succeed({ base: 0 }))

const stm = STM.gen(function*() {
  const a = yield* STM.succeed(0)
  const b = yield* STM.succeed(1)
  return a + b
})

const program = E.withSpan("program")(pipe(
  E.gen(function*(_) {
    const { base } = yield* _(Service)

    const fromSTM = yield* stm

    const a = yield* E.withSpan("A")(
      pipe(
        E.succeed(base + fromSTM),
        E.map((n) => n + 1),
        E.flatMap((n) => E.succeed(n + 1)),
        E.map((n) => n + 1)
      )
    )

    const b = yield* E.withSpan("D")(
      E.succeed(0)
    )

    yield* E.withSpan("C")(
      pipe(
        E.fail(`sum: ${a + b}`),
        E.map(() => 1),
        E.map(() => 1)
      )
    )
  }),
  E.flatMap(() => E.succeed(0)),
  E.map(() => 1),
  E.map(() => 1)
))

pipe(
  program,
  E.sandbox,
  E.catchAll((cause) => E.logErrorCause(cause)),
  E.provideSomeLayer(Logger.console() + ServiceLive),
  E.unsafeRunPromise
)
