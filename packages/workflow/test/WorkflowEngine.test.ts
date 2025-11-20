import { describe, expect, it } from "@effect/vitest"
import { DurableClock, Workflow, WorkflowEngine } from "@effect/workflow"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/TestClock"

describe("WorkflowEngine", () => {
  it.effect("works with TestClock", () =>
    Effect.gen(function*() {
      const executionId = yield* LongWorkflow.execute({ id: "test-1" }, { discard: true })

      yield* TestClock.adjust("1 day")

      expect(yield* LongWorkflow.poll(executionId))
        .toEqual(new Workflow.Complete({ exit: Exit.void }))
    }).pipe(
      Effect.provide(LongWorkflowLayer.pipe(
        Layer.provideMerge(WorkflowEngine.layerMemory)
      ))
    ))

  it.effect("nested workflows", () =>
    Effect.gen(function*() {
      const executionId = yield* ParentWorkflow.execute({ id: "parent-1" }, { discard: true })

      yield* TestClock.adjust("1 hour")

      expect(yield* ParentWorkflow.poll(executionId))
        .toEqual(new Workflow.Complete({ exit: Exit.void }))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(ParentWorkflowLayer, ChildWorkflowLayer).pipe(
          Layer.provideMerge(WorkflowEngine.layerMemory)
        )
      )
    ))
})

const LongWorkflow = Workflow.make({
  name: "LongWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey: ({ id }) => id
})

const LongWorkflowLayer = LongWorkflow.toLayer(Effect.fnUntraced(function*() {
  yield* DurableClock.sleep({
    name: "LongWorkflow sleep",
    duration: "1 day"
  })
}))

const ChildWorkflow = Workflow.make({
  name: "ChildWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey: ({ id }) => id
})

const ChildWorkflowLayer = ChildWorkflow.toLayer(Effect.fnUntraced(function*() {
  yield* DurableClock.sleep({
    name: "ChildWorkflow sleep",
    duration: "1 hour"
  })
}))

const ParentWorkflow = Workflow.make({
  name: "ParentWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey: ({ id }) => id
})
const ParentWorkflowLayer = ParentWorkflow.toLayer(Effect.fnUntraced(function*() {
  yield* ChildWorkflow.execute({ id: "child-1" })
}))
