import { assert, it } from "@effect/vitest"
import { Workflow, WorkflowEngine } from "@effect/workflow"
import { Effect, Exit, Fiber, Layer, Schema, Scope } from "effect"

it.effect("memory engine shutdown runs workflow compensations", () =>
  Effect.gen(function*() {
    const ready = yield* Effect.makeLatch()
    const compensated: Array<string> = []
    const Stuck = Workflow.make({
      name: "WorkflowEngine/ShutdownCompensation",
      payload: { id: Schema.String },
      idempotencyKey: ({ id }) => id
    })
    const layer = Stuck.toLayer(() =>
      Effect.gen(function*() {
        yield* Effect.succeed("a").pipe(
          Stuck.withCompensation((value) => Effect.sync(() => compensated.push(value)))
        )
        yield* ready.open
        return yield* Effect.never
      })
    ).pipe(Layer.provideMerge(WorkflowEngine.layerMemory))
    const scope = yield* Scope.make()
    const context = yield* Layer.build(layer).pipe(Scope.extend(scope))
    const fiber = yield* Stuck.execute({ id: "one" }).pipe(Effect.provide(context), Effect.fork)
    yield* ready.await
    yield* Scope.close(scope, Exit.void)
    const exit = yield* Fiber.await(fiber)
    assert(Exit.isInterrupted(exit))
    assert.deepStrictEqual(compensated, ["a"])
  }))
