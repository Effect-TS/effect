import * as Activity from "@effect/cluster-workflow/Activity"
import * as ActivityContext from "@effect/cluster-workflow/ActivityContext"
import * as CrashableRuntime from "@effect/cluster-workflow/CrashableRuntime"
import * as DurableExecutionEvent from "@effect/cluster-workflow/DurableExecutionEvent"
import * as DurableExecutionJournal from "@effect/cluster-workflow/DurableExecutionJournal"
import * as DurableExecutionJournalInMemory from "@effect/cluster-workflow/DurableExecutionJournalInMemory"
import * as utils from "@effect/cluster-workflow/test/utils"
import * as Workflow from "@effect/cluster-workflow/Workflow"
import * as WorkflowEngine from "@effect/cluster-workflow/WorkflowEngine"
import * as Message from "@effect/cluster/Message"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { describe, expect, it } from "vitest"

describe.concurrent("Workflow", () => {
  const withTestEnv = <R, E, A>(fa: Effect.Effect<R, E, A>) =>
    pipe(
      fa,
      Effect.provide(DurableExecutionJournalInMemory.activityJournalInMemory),
      Logger.withMinimumLogLevel(LogLevel.Debug),
      Effect.scoped
    )

  class StartWorkflowRequest
    extends Message.TaggedMessage<StartWorkflowRequest>()("StartWorkflow", Schema.String, Schema.Number, {
      executionId: Schema.String
    }, (_) => _.executionId)
  {}

  it("Should run as expected if not crashed", () => {
    return Effect.gen(function*(_) {
      const mocked = utils.mockEffect(() => Exit.succeed(42))

      const activity = pipe(
        mocked.effect,
        Activity.make("activity", Schema.Number, Schema.Never)
      )

      const workflow = Workflow.make(StartWorkflowRequest, () => activity)
      const engine = yield* _(WorkflowEngine.makeScoped(workflow))

      const exit = yield* _(
        engine.send(new StartWorkflowRequest({ executionId: "wf" })),
        Effect.exit
      )

      expect(mocked.spy).toHaveBeenCalledOnce()
      expect(exit).toEqual(Exit.succeed(42))
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Should fail as expected if not crashed", () => {
    return Effect.gen(function*(_) {
      const mocked = utils.mockEffect(() => Exit.fail("error"))

      const activity = pipe(
        mocked.effect,
        Activity.make("activity", Schema.Number, Schema.String)
      )

      const workflow = Workflow.make(StartWorkflowRequest, () => activity)
      const engine = yield* _(WorkflowEngine.makeScoped(workflow))

      const exit = yield* _(
        engine.send(new StartWorkflowRequest({ executionId: "wf" })),
        Effect.exit
      )

      expect(mocked.spy).toHaveBeenCalledOnce()
      expect(exit).toEqual(Exit.fail("error"))
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Should be able to compose different workflows", () => {
    const firstActivity = utils.mockActivity("activity1", Schema.Number, Schema.Never, () => Exit.succeed(1))
    const secondActivity = utils.mockActivity("activity2", Schema.Number, Schema.Never, () => Exit.succeed(2))

    class FirstWorkflow extends Message.TaggedMessage<FirstWorkflow>()("FirstWorkflow", Schema.Never, Schema.Number, {
      id: Schema.String
    }, (_) => _.id) {}

    const firstWorkflow = Workflow.make(FirstWorkflow, () => firstActivity.activity)

    class SecondWorkflow
      extends Message.TaggedMessage<SecondWorkflow>()("SecondWorkflow", Schema.Never, Schema.Number, {
        id: Schema.String
      }, (_) => _.id)
    {}

    const secondWorkflow = Workflow.make(SecondWorkflow, () => secondActivity.activity)

    const mergedWorkflow = Workflow.union(firstWorkflow, secondWorkflow)

    return Effect.gen(function*(_) {
      const engine = yield* _(WorkflowEngine.makeScoped(mergedWorkflow))
      const exit = yield* _(engine.send(new FirstWorkflow({ id: "wf1" })), Effect.exit)

      expect(exit).toEqual(Exit.succeed(1))
      expect(firstActivity.spy).toHaveBeenCalledOnce()
      expect(secondActivity.spy).not.toHaveBeenCalled()

      const exit2 = yield* _(engine.send(new SecondWorkflow({ id: "wf2" })), Effect.exit)

      expect(exit2).toEqual(Exit.succeed(2))
      expect(firstActivity.spy).toHaveBeenCalledOnce()
      expect(secondActivity.spy).toHaveBeenCalledOnce()
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Activity should store in journal the result", () => {
    return Effect.gen(function*(_) {
      const mocked = utils.mockEffect(() => Exit.succeed(Math.random()))

      const activity = pipe(mocked.effect, Activity.make("activity", Schema.Number, Schema.Never))

      const workflow = Workflow.make(StartWorkflowRequest, () => activity)
      const engine = yield* _(WorkflowEngine.makeScoped(workflow))

      const exit1 = yield* _(
        engine.send(new StartWorkflowRequest({ executionId: "wf" })),
        Effect.exit
      )
      const exit2 = yield* _(
        engine.send(new StartWorkflowRequest({ executionId: "wf" })),
        Effect.exit
      )

      expect(mocked.spy).toHaveBeenCalledOnce()
      expect(exit1).toEqual(exit2)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Ensure that acquireUseRelease gets interrupted without calling release inside workflow", () => {
    return Effect.gen(function*(_) {
      const mockedAcquire = utils.mockActivity("acquire", Schema.Number, Schema.Never, () => Exit.succeed(1))
      const mockedUse = utils.mockActivity("use", Schema.Number, Schema.Never, () => Exit.succeed(2))
      const mockedRelease = utils.mockActivity("release", Schema.Number, Schema.Never, () => Exit.succeed(3))

      const executeAttempt = (shouldCrash: boolean) =>
        CrashableRuntime.runWithCrash((crash) =>
          Effect.gen(function*(_) {
            const workflow = Workflow.make(StartWorkflowRequest, () =>
              Effect.acquireUseRelease(
                mockedAcquire.activity,
                () => mockedUse.activityWithBody(shouldCrash ? crash : Effect.succeed(2)),
                () => mockedRelease.activity
              ))

            const engine = yield* _(WorkflowEngine.makeScoped(workflow))

            return yield* _(engine.send(new StartWorkflowRequest({ executionId: "wf" })))
          }).pipe(Effect.scoped)
        )

      // first execution should crash
      yield* _(
        executeAttempt(true),
        Effect.exit
      )

      expect(mockedAcquire.spy).toHaveBeenCalledOnce()
      expect(mockedUse.spy).toHaveBeenCalledOnce()
      expect(mockedRelease.spy).not.toHaveBeenCalled()

      // now the workflow gets executed again without crashing
      yield* _(
        executeAttempt(false),
        Effect.exit
      )

      expect(mockedAcquire.spy).toHaveBeenCalledOnce()
      expect(mockedUse.spy).toHaveBeenCalledTimes(2)
      expect(mockedRelease.spy).toHaveBeenCalled()
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Upon crash on release, when restarted should resume release", () => {
    return Effect.gen(function*(_) {
      const mockedAcquire = utils.mockActivity("acquire", Schema.Number, Schema.Never, () => Exit.succeed(1))
      const mockedUse = utils.mockActivity("use", Schema.Number, Schema.Never, () => Exit.succeed(2))
      const mockedRelease = utils.mockActivity("release", Schema.Number, Schema.Never, () => Exit.succeed(3))

      const executeAttempt = (shouldCrash: boolean) =>
        CrashableRuntime.runWithCrash((crash) =>
          Effect.gen(function*(_) {
            const workflow = Workflow.make(StartWorkflowRequest, () =>
              Effect.acquireUseRelease(
                mockedAcquire.activity,
                () => mockedUse.activity,
                () => mockedRelease.activityWithBody(shouldCrash ? crash : Effect.succeed(3))
              ))
            const engine = yield* _(WorkflowEngine.makeScoped(workflow))

            return yield* _(engine.send(new StartWorkflowRequest({ executionId: "wf" })))
          }).pipe(Effect.scoped)
        )

      // first execution should crash
      yield* _(
        executeAttempt(true),
        Effect.exit
      )

      expect(mockedAcquire.spy).toHaveBeenCalledOnce()
      expect(mockedUse.spy).toHaveBeenCalledOnce()
      expect(mockedRelease.spy).toHaveBeenCalledOnce()

      // now the workflow gets executed again without crashing
      yield* _(
        executeAttempt(false),
        Effect.exit
      )

      expect(mockedAcquire.spy).toHaveBeenCalledOnce()
      expect(mockedUse.spy).toHaveBeenCalledOnce()
      expect(mockedRelease.spy).toHaveBeenCalledTimes(2)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Current attempt should reflect actual execution attempt number", () => {
    return Effect.gen(function*(_) {
      const valueRef = yield* _(Ref.make(0))

      yield* _(
        CrashableRuntime.retryWhileCrashes((runtime) =>
          runtime.run(() =>
            Effect.gen(function*(_) {
              const activity = pipe(
                Activity.currentAttempt,
                Effect.flatMap((attempt) =>
                  pipe(
                    Ref.get(valueRef),
                    Effect.tap((_) => Effect.sync(() => expect(_).toEqual(attempt))),
                    Effect.flatMap(() =>
                      attempt < 3
                        ? pipe(
                          Ref.update(valueRef, (_) => _ + 1),
                          Effect.zipRight(runtime.crash),
                          Effect.zipRight(Effect.die("error"))
                        )
                        : Effect.succeed(42)
                    )
                  )
                ),
                Activity.make("activity", Schema.Number, Schema.Never)
              )

              const workflow = Workflow.make(StartWorkflowRequest, () => activity)
              const engine = yield* _(WorkflowEngine.makeScoped(workflow))

              return yield* _(engine.send(new StartWorkflowRequest({ executionId: "wf" })))
            }).pipe(Effect.scoped)
          )
        )
      )

      const value = yield* _(Ref.get(valueRef))

      expect(value).toEqual(3)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("On graceful interrupt, should not persist exit into DurableExecutionJournal", () => {
    return Effect.gen(function*(_) {
      const mockedActivity = utils.mockActivity("activity", Schema.Number, Schema.Never, () => Exit.succeed(1))
      const mockedRelease = utils.mockEffect(() => Exit.succeed(1))
      const mockedUse = utils.mockEffect(() => Exit.succeed(1))
      const latch = yield* _(Deferred.make<void>())
      const persistenceIdRef = yield* _(Ref.make(""))

      const workflow = Workflow.make(
        StartWorkflowRequest,
        () =>
          mockedActivity.activityWithBody(
            Effect.acquireUseRelease(Effect.succeed(1), () =>
              pipe(
                mockedUse.effect,
                Effect.zipRight(
                  Effect.flatMap(ActivityContext.ActivityContext, (ctx) => Ref.set(persistenceIdRef, ctx.persistenceId))
                ),
                Effect.zipRight(Effect.never),
                Effect.zipLeft(Deferred.succeed(latch, undefined), { concurrent: true })
              ), () => mockedRelease.effect)
          )
      )

      const exit = yield* _(
        WorkflowEngine.makeScoped(workflow),
        Effect.flatMap((engine) => engine.send(new StartWorkflowRequest({ executionId: "wf" }))),
        Effect.forkScoped,
        Effect.zipLeft(Deferred.await(latch)),
        Effect.scoped,
        Effect.flatMap((_) => _.await)
      )

      const workflowJournalEntryCount = yield* _(
        DurableExecutionJournal.DurableExecutionJournal,
        Effect.flatMap((journal) =>
          journal.read("wf", Schema.Never, Schema.Number, 0, false).pipe(
            Stream.runCollect,
            Effect.map(Chunk.toReadonlyArray)
          )
        )
      )

      const persistenceId = yield* _(Ref.get(persistenceIdRef))
      const activityJournalEntryCount = yield* _(
        DurableExecutionJournal.DurableExecutionJournal,
        Effect.flatMap((journal) =>
          journal.read(persistenceId, Schema.Never, Schema.Number, 0, false).pipe(
            Stream.runCollect,
            Effect.map(Chunk.toReadonlyArray)
          )
        )
      )

      expect(mockedUse.spy).toHaveBeenCalled()
      expect(mockedActivity.spy).toHaveBeenCalledOnce()
      expect(activityJournalEntryCount.length).toEqual(1)
      expect(activityJournalEntryCount[0]._tag).toEqual(DurableExecutionEvent.Attempted("")(0)._tag)
      expect(workflowJournalEntryCount.length).toEqual(2)
      expect(workflowJournalEntryCount[0]._tag).toEqual(DurableExecutionEvent.Attempted("")(0)._tag)
      expect(workflowJournalEntryCount[1]._tag).toEqual(DurableExecutionEvent.Forked(persistenceId)(1)._tag)
      expect(Exit.isInterrupted(exit)).toEqual(true)
      expect(mockedRelease.spy).toHaveBeenCalledOnce()
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("On replay activities should fork/complete in the same order to allow Effect.race-like combinators", () => {
    return Effect.gen(function*(_) {
      function testWorkflow(firstFastest: boolean) {
        return Effect.gen(function*(_) {
          const activity1 = utils.mockActivity("activity1", Schema.Number, Schema.Never, () => Exit.succeed(1))
            .activityWithBody(pipe(Effect.sleep(firstFastest ? 0 : 1000), Effect.as(1)))
          const activity2 = utils.mockActivity("activity2", Schema.Number, Schema.Never, () => Exit.succeed(1))
            .activityWithBody(pipe(Effect.sleep(!firstFastest ? 0 : 1000), Effect.as(2)))

          const workflow = Workflow.make(StartWorkflowRequest, () => Effect.race(activity1, activity2))

          const engine = yield* _(WorkflowEngine.makeScoped(workflow))

          return yield* _(engine.send(new StartWorkflowRequest({ executionId: "wf" })))
        }).pipe(Effect.scoped)
      }

      const exit1 = yield* _(testWorkflow(true))
      const exit2 = yield* _(testWorkflow(false))

      expect(exit1).toEqual(exit2)
    }).pipe(withTestEnv, Effect.runPromise)
  })
})
