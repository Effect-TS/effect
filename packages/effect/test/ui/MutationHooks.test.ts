import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Layer, Schema } from "effect"
import { TestClock } from "effect/testing"
import { Command, Component, type MessageLog } from "effect/ui"
import * as services from "effect/ui/internal/services"
import { TestHost } from "effect/ui/testing"

// The three points the runtime calls for the cache (EFF-3558 step 5), observed through a hook that
// records. Nothing here needs a cache: the default hooks are no-ops.

const work = (id: string) => Effect.as(Effect.sleep("1 second"), id)
const Plain = Command.make("Plain", work)
const Queued = Command.make("Queued", work, { mode: "queue" })
const Dropping = Command.make("Dropping", work, { mode: "drop" })
const Switching = Command.make("Switching", work, { mode: "switch" })
const Dying = Command.make("Dying", (_id: string) => Effect.die("boom"))
const Refused = Command.make("Refused", work)
class Failing extends Command.Service<Failing>()(
  "Failing",
  Effect.succeed((id: string) => Effect.fail(`no ${id}` as const)),
  { invalidates: () => [] }
) {}
class Slow extends Context.Service<Slow, string>()("test/Slow") {}
class NeedsSlow extends Command.Service<NeedsSlow>()(
  "NeedsSlow",
  Effect.map(Effect.service(Slow), (slow) => (id: string) => Effect.succeed(`${slow} ${id}`)),
  { invalidates: () => [] }
) {}

const factories = { Plain, Queued, Dropping, Switching, Dying, Refused }

const Message = Schema.TaggedUnion({
  Issue: { name: Schema.Literals(["Plain", "Queued", "Dropping", "Switching", "Dying", "Refused"]), id: Schema.String },
  IssueAndStop: { id: Schema.String },
  Fail: { id: Schema.String },
  Stop: { name: Schema.Literals(["Plain", "Queued", "Switching"]) },
  Got: { text: Schema.String }
})
const got = (text: string) => Message.make({ _tag: "Got", text })

const setup = () => {
  const events: Array<string> = []
  const runs: Array<services.MutationRun> = []
  const label = (run: services.MutationRun) => `${run.command.name}(${run.args.join(",")})`
  const hooks: services.MutationHooks = {
    onIssue(run) {
      if (run.command.name === "Refused") throw new Error("refused")
      runs.push(run)
      events.push(`issue ${label(run)}`)
    },
    onExit(run, exit) {
      assert.include(runs, run)
      const how = Exit.isSuccess(exit)
        ? `success ${exit.value}`
        : Cause.hasInterruptsOnly(exit.cause)
        ? "interrupt"
        : Cause.hasDies(exit.cause)
        ? "defect"
        : `failure ${Cause.squash(exit.cause)}`
      events.push(`exit ${label(run)} ${how}`)
    },
    onCancel(run) {
      assert.include(runs, run)
      events.push(`cancel ${label(run)}`)
    }
  }
  const Lab = Component.make({
    name: "Lab",
    model: Schema.Array(Schema.String),
    message: Message,
    init: (): ReadonlyArray<string> => [],
    update: (model, message, $) =>
      Message.match(message, {
        Issue: ({ id, name }) => $.set(model).run(factories[name](id).pipe(Command.map(got))),
        IssueAndStop: ({ id }) => $.set(model).run(Plain(id).pipe(Command.map(got))).run(Command.interrupt(Plain)),
        Fail: ({ id }) => $.set(model).run(Failing.make(id).pipe(Command.match({ onSuccess: got, onFailure: got }))),
        Stop: ({ name }) => $.set(model).run(Command.interrupt(factories[name])),
        Got: ({ text }) => {
          events.push(`message ${text}`)
          return [...model, text]
        }
      }),
    view: (model, h) => h.text(model.join(","))
  }).pipe(Component.provide(Failing.layer))
  const provide = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(Effect.provideService(services.MutationHooks, hooks), Effect.provide(TestHost.layer()))
  const issue = (name: keyof typeof factories, id: string) => Message.make({ _tag: "Issue", name, id })
  return { events, hooks, Lab, provide, issue }
}

describe("MutationHooks", () => {
  describe("(a) a mutation Command is issued", () => {
    it.effect("fires at issue for a run that waits in a queue, long before its work begins", () => {
      const { events, issue, Lab, provide } = setup()
      return provide(Effect.gen(function*() {
        const root = yield* TestHost.mount(Lab, {})
        root.send(issue("Queued", "a"))
        root.send(issue("Queued", "b"))
        yield* TestHost.settle
        assert.deepStrictEqual(events, ["issue Queued(a)", "issue Queued(b)"])
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.deepStrictEqual(events.slice(2), ["exit Queued(a) success a", "message a"])
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.deepStrictEqual(events.slice(4), ["exit Queued(b) success b", "message b"])
      }))
    })

    it.effect("registers nothing for a run its mode drops", () => {
      const { events, issue, Lab, provide } = setup()
      return provide(Effect.gen(function*() {
        const root = yield* TestHost.mount(Lab, {})
        root.send(issue("Dropping", "a"))
        root.send(issue("Dropping", "b"))
        yield* TestHost.settle
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.deepStrictEqual(events, ["issue Dropping(a)", "exit Dropping(a) success a", "message a"])
      }))
    })

    it.effect("switch registers the new run while the one it replaces is still running", () => {
      const { events, issue, Lab, provide } = setup()
      return provide(Effect.gen(function*() {
        const root = yield* TestHost.mount(Lab, {})
        root.send(issue("Switching", "a"))
        yield* TestHost.settle
        root.send(issue("Switching", "b"))
        yield* TestHost.settle
        assert.deepStrictEqual(events, ["issue Switching(a)", "issue Switching(b)", "exit Switching(a) interrupt"])
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.deepStrictEqual(events.slice(3), ["exit Switching(b) success b", "message b"])
      }))
    })

    it.effect("a hook that throws keeps the run from starting and fails the instance, as a throwing update does", () => {
      const { events, issue, Lab, provide } = setup()
      return provide(Effect.gen(function*() {
        const root = yield* TestHost.mount(Lab, {}, { fallback: (_, h) => h.text("failed") })
        root.send(issue("Refused", "a"))
        yield* TestHost.settle
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.deepStrictEqual(events, [])
        assert.strictEqual(root.text(), "failed")
        const failed = root.log().filter((entry): entry is MessageLog.Failed => entry._tag === "Failed")
        assert.deepStrictEqual(failed.map((entry) => [entry.source, entry.name]), [["update", "Refused"]])
        // The run never started, so nothing about it ended or was interrupted either.
        assert.deepStrictEqual(root.log().filter((entry) => entry._tag.startsWith("Command")), [])
      }))
    })
  })

  describe("(b) the run's fiber exits", () => {
    it.effect("fires with the exit before the result message is dispatched: success, typed failure, defect", () => {
      const { events, issue, Lab, provide } = setup()
      return provide(Effect.gen(function*() {
        const root = yield* TestHost.mount(Lab, {}, { fallback: (_, h) => h.text("failed") })
        root.send(issue("Plain", "a"))
        root.send(Message.make({ _tag: "Fail", id: "b" }))
        yield* TestHost.settle
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.sameMembers(events.slice(0, 2), ["issue Plain(a)", "issue Failing(b)"])
        assert.deepStrictEqual(events.slice(2), [
          "exit Failing(b) failure no b",
          "message no b",
          "exit Plain(a) success a",
          "message a"
        ])
        events.length = 0
        root.send(issue("Dying", "c"))
        yield* TestHost.settle
        assert.deepStrictEqual(events, ["issue Dying(c)", "exit Dying(c) defect"])
        assert.strictEqual(root.text(), "failed")
      }))
    })

    it.effect("fires when the fiber has exited, not when the stop is requested", () => {
      const { events, issue, Lab, provide } = setup()
      return provide(Effect.gen(function*() {
        const root = yield* TestHost.mount(Lab, {})
        root.send(issue("Plain", "a"))
        yield* TestHost.settle
        root.send(Message.make({ _tag: "Stop", name: "Plain" }))
        yield* TestHost.settle
        assert.deepStrictEqual(events, ["issue Plain(a)", "exit Plain(a) interrupt"])
        const order = root.log().flatMap((entry) => entry._tag === "CommandInterrupted" ? [entry._tag] : [])
        assert.deepStrictEqual(order, ["CommandInterrupted"])
      }))
    })

    it.effect("an instance that unmounts interrupts its runs, and each fires with the interrupt", () => {
      const { events, issue, Lab, provide } = setup()
      return provide(Effect.gen(function*() {
        yield* Effect.gen(function*() {
          const root = yield* TestHost.mount(Lab, {})
          root.send(issue("Plain", "a"))
          root.send(issue("Queued", "b"))
          root.send(issue("Queued", "c"))
          yield* TestHost.settle
        }).pipe(Effect.scoped)
        yield* TestHost.settle
        assert.sameMembers(events.slice(3), [
          "exit Plain(a) interrupt",
          "exit Queued(b) interrupt",
          "cancel Queued(c)"
        ])
        assert.strictEqual(events.length, 6)
      }))
    })
  })

  describe("(c) a run is stopped before its work began", () => {
    it.effect("a queued run that is interrupted cancels, and never exits", () => {
      const { events, issue, Lab, provide } = setup()
      return provide(Effect.gen(function*() {
        const root = yield* TestHost.mount(Lab, {})
        root.send(issue("Queued", "a"))
        root.send(issue("Queued", "b"))
        yield* TestHost.settle
        root.send(Message.make({ _tag: "Stop", name: "Queued" }))
        yield* TestHost.settle
        yield* TestClock.adjust("2 seconds")
        yield* TestHost.settle
        assert.sameMembers(events.slice(2), ["exit Queued(a) interrupt", "cancel Queued(b)"])
        assert.strictEqual(events.length, 4)
      }))
    })

    it.effect("a run stopped in the update that issued it cancels before its first step", () => {
      const { events, Lab, provide } = setup()
      return provide(Effect.gen(function*() {
        const root = yield* TestHost.mount(Lab, {})
        root.send(Message.make({ _tag: "IssueAndStop", id: "a" }))
        yield* TestHost.settle
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.deepStrictEqual(events, ["issue Plain(a)", "cancel Plain(a)"])
      }))
    })

    it.effect("a run that waits for a provided Layer is registered at issue and cancels if the instance closes first", () => {
      const { events, hooks } = setup()
      const Waiting = Component.make({
        name: "Waiting",
        model: Schema.String,
        message: Schema.String,
        init: ($) => $.set("...").run(NeedsSlow.make("a")),
        update: (_, message) => message,
        view: (text, h) => h.text(text)
      }).pipe(
        Component.provide(
          NeedsSlow.layer.pipe(Layer.provideMerge(Layer.effect(Slow, Effect.as(Effect.sleep("1 second"), "slow"))))
        )
      )
      return Effect.gen(function*() {
        yield* Effect.gen(function*() {
          const root = yield* TestHost.mount(Waiting, {})
          yield* TestHost.settle
          assert.strictEqual(root.text(), "...")
          assert.deepStrictEqual(events, ["issue NeedsSlow(a)"])
        }).pipe(Effect.scoped)
        yield* TestHost.settle
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.deepStrictEqual(events, ["issue NeedsSlow(a)", "cancel NeedsSlow(a)"])
      }).pipe(Effect.provideService(services.MutationHooks, hooks), Effect.provide(TestHost.layer()))
    })
  })
})
