import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import type * as Supervisor from "effect/Supervisor"

const supervisor: Supervisor.Supervisor = {
  onStart: () => {},
  onEnd: () => {},
  onBlock: () => {},
  onUnblock: () => {}
}

const program = Effect.gen(function*() {
  const fiber = yield* Effect.forkChild(Effect.sleep("10 millis"))
  yield* Fiber.join(fiber)
})

Effect.runFork(Effect.withSupervisor(program, supervisor))
