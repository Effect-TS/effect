import * as T from "@effect/core/io/Effect"
import * as L from "@effect/core/io/Layer"
import { Tag } from "@tsplus/stdlib/service/Tag"

export interface ConsoleService {
  readonly log: (message: string) => T.Effect<never, never, void>
}

export const ConsoleService = Tag<ConsoleService>()

export const LiveConsoleService = Layer.fromEffect(ConsoleService)(
  T.sync(() => ({
    log: (message: string) =>
      T.sync(() => {
        console.log(message)
      })
  }))
)

export interface LoggerService {
  readonly info: (message: string) => T.Effect<never, never, void>
}

export const LoggerService = Tag<LoggerService>()

export const LiveLoggerService = Layer.fromEffect(LoggerService)(
  T.gen(function*($) {
    const { log } = yield* $(ConsoleService)
    return {
      info: (message) => log(`info: ${message}`)
    }
  })
)

export const LiveApp = pipe(
  LiveConsoleService,
  L.provideToAndMerge(LiveLoggerService)
)
