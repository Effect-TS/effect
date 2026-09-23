import { assert, describe, describeWrapped, makeMethods, test } from "@effect/vitest"
import { Context, Effect, Layer, Schema } from "effect"

class Greeting extends Context.Service<Greeting, string>()("Greeting") {
  static layer = Layer.succeed(Greeting)("hello")
}

describe("makeMethods with fixtures", () => {
  const it = makeMethods(test.extend("value", () => 1))

  it.effect("passes fixtures to it.effect", ({ value }) =>
    Effect.sync(() => {
      assert.strictEqual(value, 1)
    }))

  it.live("passes fixtures to it.live", ({ value }) =>
    Effect.sync(() => {
      assert.strictEqual(value, 1)
    }))

  it.effect.each([1, 2])("passes fixtures to it.effect.each %s", (n, { value }) =>
    Effect.sync(() => {
      assert.isTrue(n > 0)
      assert.strictEqual(value, 1)
    }))

  it.layer(Greeting.layer)("named layer", (it) => {
    it.effect("passes fixtures and layer services", ({ value }) =>
      Effect.gen(function*() {
        assert.strictEqual(yield* Greeting, "hello")
        assert.strictEqual(value, 1)
      }))
  })

  it.layer(Greeting.layer)((it) => {
    it.effect("passes fixtures and anonymous layer services", ({ value }) =>
      Effect.gen(function*() {
        assert.strictEqual(yield* Greeting, "hello")
        assert.strictEqual(value, 1)
      }))
  })
})

describe("makeMethods registration", { concurrent: false }, () => {
  const setups: Array<string> = []
  const it = makeMethods(test.extend("setup", { auto: true }, ({ task }) => {
    setups.push(task.name)
  }))

  it.effect.fails("it.effect.fails", () => Effect.fail("expected failure"))

  it.live.fails("it.live.fails", () => Effect.fail("expected failure"))

  it.prop("it.prop", [Schema.Boolean], () => true)

  test("registers every variant through the given test API", () => {
    assert.deepStrictEqual(setups, ["it.effect.fails", "it.live.fails", "it.prop"])
  })
})

describeWrapped("named layers in describeWrapped", (wrapped) => {
  let open = false
  const it = makeMethods(wrapped.extend("value", () => 1))
  const resource = Layer.effectDiscard(Effect.acquireRelease(
    Effect.sync(() => {
      open = true
    }),
    () =>
      Effect.sync(() => {
        open = false
      })
  ))

  it.layer(resource)("named layer", (it) => {
    it.effect("uses the named suite's open layer and fixtures", ({ task, value }) =>
      Effect.sync(() => {
        assert.strictEqual(task.suite?.name, "named layer")
        assert.isTrue(task.suite?.tasks.includes(task))
        assert.isTrue(open)
        assert.strictEqual(value, 1)
      }))
  })
})

describe("fixture lifecycle", { concurrent: false }, () => {
  const events: Array<string> = []
  const it = makeMethods(test.extend("resource", ({ task }, { onCleanup }) => {
    events.push(`${task.name}: fixture setup`)
    onCleanup(() => {
      events.push(`${task.name}: fixture teardown`)
    })
    return task.name
  }))

  it.effect("uses the fixture", ({ resource }) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        events.push(`${resource}: acquire`)
      }),
      () =>
        Effect.sync(() => {
          events.push(`${resource}: release`)
        })
    ))

  it.effect("ignores the fixture", () =>
    Effect.sync(() => {
      events.push("ignores the fixture: run")
    }))

  test("sets up requested fixtures around the test's scope", () => {
    assert.deepStrictEqual(events, [
      "uses the fixture: fixture setup",
      "uses the fixture: acquire",
      "uses the fixture: release",
      "uses the fixture: fixture teardown",
      "ignores the fixture: run"
    ])
  })
})
