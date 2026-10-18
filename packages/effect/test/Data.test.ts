import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as InternalRecord from "effect/internal/record"
import assert from "node:assert/strict"
import { describe, it } from "vitest"

describe("Data", () => {
  describe("Class", () => {
    class Person extends Data.Class<{ readonly name: string; readonly age: number }> {}

    it("assigns fields from constructor args", () => {
      const p = new Person({ name: "Alice", age: 30 })
      assert.strictEqual(p.name, "Alice")
      assert.strictEqual(p.age, 30)
    })

    it("structural equality via Equal.equals", () => {
      const a = new Person({ name: "Bob", age: 25 })
      const b = new Person({ name: "Bob", age: 25 })
      assert.strictEqual(Equal.equals(a, b), true)
    })

    it("not equal when fields differ", () => {
      const a = new Person({ name: "Bob", age: 25 })
      const b = new Person({ name: "Bob", age: 26 })
      assert.strictEqual(Equal.equals(a, b), false)
    })

    it("supports .pipe()", () => {
      const p = new Person({ name: "C", age: 1 })
      const result = p.pipe((x) => x.name)
      assert.strictEqual(result, "C")
    })

    it("allows classes without fields to be constructed without args", () => {
      class Empty extends Data.Class {}
      const e = new Empty()
      assert.ok(e instanceof Empty)
    })

    it("fields are enumerable", () => {
      const p = new Person({ name: "D", age: 2 })
      assert.deepStrictEqual(Object.keys(p).sort(), ["age", "name"])
    })
  })

  describe("TaggedClass", () => {
    class Foo extends Data.TaggedClass("Foo")<{ readonly value: number }> {}

    it("sets _tag to the provided tag", () => {
      const f = new Foo({ value: 1 })
      assert.strictEqual(f._tag, "Foo")
    })

    it("assigns fields", () => {
      const f = new Foo({ value: 42 })
      assert.strictEqual(f.value, 42)
    })

    it("structural equality includes _tag", () => {
      const a = new Foo({ value: 1 })
      const b = new Foo({ value: 1 })
      assert.strictEqual(Equal.equals(a, b), true)
    })

    it("different tags are not equal", () => {
      class Bar extends Data.TaggedClass("Bar")<{ readonly value: number }> {}
      const a = new Foo({ value: 1 })
      const b = new Bar({ value: 1 })
      assert.strictEqual(Equal.equals(a, b), false)
    })

    it("allows tagged classes without fields to be constructed without args", () => {
      class Empty extends Data.TaggedClass("Empty") {}
      const e = new Empty()
      assert.strictEqual(e._tag, "Empty")
    })

    it("supports .pipe()", () => {
      const f = new Foo({ value: 10 })
      const result = f.pipe((x) => x._tag)
      assert.strictEqual(result, "Foo")
    })
  })

  describe("taggedEnum", () => {
    type Shape = Data.TaggedEnum<{
      Circle: { readonly radius: number }
      Rect: { readonly width: number; readonly height: number }
    }>
    const Shape = Data.taggedEnum<Shape>()

    describe("constructors", () => {
      it("creates a variant with _tag", () => {
        const c = Shape.Circle({ radius: 5 })
        assert.strictEqual(c._tag, "Circle")
        assert.strictEqual(c.radius, 5)
      })

      it("creates different variants", () => {
        const r = Shape.Rect({ width: 3, height: 4 })
        assert.strictEqual(r._tag, "Rect")
        assert.strictEqual(r.width, 3)
        assert.strictEqual(r.height, 4)
      })
    })

    describe("$is", () => {
      it("returns true for matching variant", () => {
        const c = Shape.Circle({ radius: 1 })
        assert.strictEqual(Shape.$is("Circle")(c), true)
      })

      it("returns false for non-matching variant", () => {
        const r = Shape.Rect({ width: 1, height: 1 })
        assert.strictEqual(Shape.$is("Circle")(r), false)
      })

      it("returns false for non-tagged values", () => {
        assert.strictEqual(Shape.$is("Circle")(null), false)
        assert.strictEqual(Shape.$is("Circle")(undefined), false)
        assert.strictEqual(Shape.$is("Circle")("string"), false)
        assert.strictEqual(Shape.$is("Circle")({}), false)
      })
    })

    describe("$match", () => {
      const area = Shape.$match({
        Circle: ({ radius }) => Math.PI * radius ** 2,
        Rect: ({ width, height }) => width * height
      })

      it("data-last: matches Circle", () => {
        const c = Shape.Circle({ radius: 5 })
        assert.strictEqual(area(c), Math.PI * 25)
      })

      it("data-last: matches Rect", () => {
        const r = Shape.Rect({ width: 3, height: 4 })
        assert.strictEqual(area(r), 12)
      })

      it("data-first: matches directly", () => {
        const c = Shape.Circle({ radius: 1 })
        const result = Shape.$match(c, {
          Circle: ({ radius }) => radius * 2,
          Rect: () => 0
        })
        assert.strictEqual(result, 2)
      })
    })

    describe("no-field variant", () => {
      type Option = Data.TaggedEnum<{
        None: {}
        Some: { readonly value: number }
      }>
      const Option = Data.taggedEnum<Option>()

      it("accepts void for empty variants", () => {
        const n = Option.None()
        assert.strictEqual(n._tag, "None")
      })

      it("works with $match for empty variants", () => {
        const show = Option.$match({
          None: () => "none",
          Some: ({ value }) => `some(${value})`
        })
        assert.strictEqual(show(Option.None()), "none")
        assert.strictEqual(show(Option.Some({ value: 42 })), "some(42)")
      })
    })
  })

  describe("Error", () => {
    class MyError extends Data.Error<{ readonly code: number; readonly message: string }> {}

    it("is an instance of globalThis.Error", () => {
      const e = new MyError({ code: 500, message: "fail" })
      assert.ok(e instanceof globalThis.Error)
    })

    it("assigns fields", () => {
      const e = new MyError({ code: 404, message: "not found" })
      assert.strictEqual(e.code, 404)
      assert.strictEqual(e.message, "not found")
    })

    it("has a stack trace", () => {
      const e = new MyError({ code: 1, message: "x" })
      assert.ok(typeof e.stack === "string")
      assert.ok(e.stack!.length > 0)
    })

    it("allows errors without fields to be constructed without args", () => {
      class Empty extends Data.Error {}
      const e = new Empty()
      assert.ok(e instanceof globalThis.Error)
    })

    it("can be yielded in Effect.gen to fail", () =>
      Effect.gen(function*() {
        const exit = yield* Effect.exit(
          Effect.gen(function*() {
            return yield* new MyError({ code: 1, message: "boom" })
          })
        )
        assert.ok(exit._tag === "Failure")
      }).pipe(Effect.runPromise))

    it("toJSON includes fields", () => {
      const e = new MyError({ code: 1, message: "test" })
      const json = (e as any).toJSON()
      assert.strictEqual(json.code, 1)
      assert.strictEqual(json.message, "test")
    })
  })

  describe("TaggedError", () => {
    class NotFound extends Data.TaggedError("NotFound")<{
      readonly resource: string
    }> {}

    it("sets _tag", () => {
      const e = new NotFound({ resource: "/x" })
      assert.strictEqual(e._tag, "NotFound")
    })

    it("assigns fields", () => {
      const e = new NotFound({ resource: "/users" })
      assert.strictEqual(e.resource, "/users")
    })

    it("is an instance of globalThis.Error", () => {
      const e = new NotFound({ resource: "r" })
      assert.ok(e instanceof globalThis.Error)
    })

    it("can be caught with Effect.catchTag", () =>
      Effect.gen(function*() {
        const result = yield* Effect.gen(function*() {
          return yield* new NotFound({ resource: "/test" })
        }).pipe(
          Effect.catchTag("NotFound", (e) => Effect.succeed(`caught: ${e.resource}`))
        )
        assert.strictEqual(result, "caught: /test")
      }).pipe(Effect.runPromise))

    it("allows tagged errors without fields to be constructed without args", () => {
      class Boom extends Data.TaggedError("Boom") {}
      const e = new Boom()
      assert.strictEqual(e._tag, "Boom")
      assert.ok(e instanceof globalThis.Error)
    })

    it("sets .name to the tag", () => {
      const e = new NotFound({ resource: "x" })
      assert.strictEqual(e.name, "NotFound")
    })

    it("different tags produce non-equal errors", () => {
      class Forbidden extends Data.TaggedError("Forbidden")<{ readonly resource: string }> {}
      const a = new NotFound({ resource: "x" })
      const b = new Forbidden({ resource: "x" })
      assert.strictEqual(Equal.equals(a, b), false)
    })
  })
})

/**
 * The old, pre-fast-path implementation of `assignProperties`, kept here verbatim so the
 * differential test below can compare it against the current (potentially fast-pathed)
 * implementation without relying on git history.
 */
function oldAssignProperties(self: object, source: object): void {
  for (const key of Reflect.ownKeys(source)) {
    if (Object.prototype.propertyIsEnumerable.call(source, key)) {
      InternalRecord.assignProperty(self, key, (source as any)[key])
    }
  }
}

describe("assignProperties fast path", () => {
  describe("Data.Class + JSON.parse'd own __proto__", () => {
    class Person extends Data.Class<{ readonly name: string }> {}

    it("keeps the class prototype, lands __proto__ as an own enumerable data property, and leaves Object.prototype untouched", () => {
      const parsed: any = JSON.parse("{\"name\":\"Alice\",\"__proto__\":{\"polluted\":true}}")
      assert.ok(Object.hasOwn(parsed, "__proto__"))

      const before = (Object.prototype as any).polluted

      const p = new Person(parsed)

      assert.strictEqual(Object.getPrototypeOf(p), Person.prototype)
      assert.ok(p instanceof Person)

      const desc = Object.getOwnPropertyDescriptor(p, "__proto__")
      assert.ok(desc !== undefined)
      assert.strictEqual(desc!.value, parsed.__proto__)
      assert.strictEqual(desc!.enumerable, true)
      assert.strictEqual(desc!.writable, true)
      assert.strictEqual(desc!.configurable, true)

      assert.strictEqual((Object.prototype as any).polluted, before)
      assert.strictEqual((Object.prototype as any).polluted, undefined)

      assert.strictEqual((p as any).name, "Alice")
    })
  })

  describe("assignProperties (public behavior via Record)", () => {
    it("copies symbols", () => {
      const sym = Symbol("sym")
      const target: any = {}
      InternalRecord.assignProperties(target, { [sym]: "value", a: 1 })
      assert.strictEqual(target[sym], "value")
      assert.strictEqual(target.a, 1)
    })

    it("skips non-enumerable keys (string and symbol)", () => {
      const sym = Symbol("hidden-sym")
      const source: any = {}
      Object.defineProperty(source, "hiddenString", { value: 1, enumerable: false, configurable: true })
      Object.defineProperty(source, sym, { value: 2, enumerable: false, configurable: true })
      Object.defineProperty(source, "visible", { value: 3, enumerable: true, configurable: true })

      const target: any = {}
      InternalRecord.assignProperties(target, source)

      assert.strictEqual(Object.hasOwn(target, "hiddenString"), false)
      assert.strictEqual(Object.hasOwn(target, sym), false)
      assert.strictEqual(target.visible, 3)
    })

    it("orders integer-like keys before string keys, matching Reflect.ownKeys / Object.assign", () => {
      const source: any = {}
      source["b"] = 1
      source[2] = "two"
      source[1] = "one"
      source["a"] = 2

      const target: any = {}
      InternalRecord.assignProperties(target, source)

      assert.deepStrictEqual(Reflect.ownKeys(target), Reflect.ownKeys(source))
      assert.deepStrictEqual(Reflect.ownKeys(target), ["1", "2", "b", "a"])
    })

    it("a getter that throws partway through leaves the same partial state the old loop would", () => {
      function makeSource() {
        const o: any = { a: 1 }
        Object.defineProperty(o, "b", {
          get() {
            throw new RangeError("boom")
          },
          enumerable: true,
          configurable: true
        })
        o.c = 3
        return o
      }

      const oldTarget: any = {}
      let oldError: unknown
      try {
        oldAssignProperties(oldTarget, makeSource())
      } catch (e) {
        oldError = e
      }

      const newTarget: any = {}
      let newError: unknown
      try {
        InternalRecord.assignProperties(newTarget, makeSource())
      } catch (e) {
        newError = e
      }

      assert.ok(oldError instanceof RangeError)
      assert.ok(newError instanceof RangeError)
      assert.strictEqual((oldError as RangeError).message, (newError as RangeError).message)

      assert.deepStrictEqual(Reflect.ownKeys(newTarget), Reflect.ownKeys(oldTarget))
      assert.strictEqual(newTarget.a, oldTarget.a)
      assert.strictEqual(Object.hasOwn(newTarget, "b"), Object.hasOwn(oldTarget, "b"))
      assert.strictEqual(Object.hasOwn(newTarget, "c"), Object.hasOwn(oldTarget, "c"))
      // the old loop never reaches "c" because the exception on "b" propagates out of the for loop
      assert.strictEqual(Object.hasOwn(newTarget, "c"), false)
    })

    it("for a Proxy source, does exactly one extra getOwnPropertyDescriptor(\"__proto__\") trap call versus the old loop", () => {
      // Pins the one disclosed behavioral difference between the fast path and the old loop:
      // `Object.hasOwn(source, "__proto__")` triggers a `getOwnPropertyDescriptor` trap before
      // falling through to `Object.assign`, which repeats its own ownKeys/get/gopd trap sequence
      // identical to the old loop's. If this ever changes (e.g. hasOwn gets memoized, or the
      // fast path is reworked), this test should be re-verified rather than blindly re-stamped.
      function trace() {
        const calls: Array<string> = []
        const target = { a: 1, b: 2 }
        const proxy = new Proxy(target, {
          get(t, k, r) {
            calls.push(`get:${String(k)}`)
            return Reflect.get(t, k, r)
          },
          ownKeys(t) {
            calls.push("ownKeys")
            return Reflect.ownKeys(t)
          },
          getOwnPropertyDescriptor(t, k) {
            calls.push(`gopd:${String(k)}`)
            return Reflect.getOwnPropertyDescriptor(t, k)
          }
        })
        return { proxy, calls }
      }

      const old = trace()
      oldAssignProperties({}, old.proxy)

      const current = trace()
      InternalRecord.assignProperties({}, current.proxy)

      assert.deepStrictEqual(old.calls, ["ownKeys", "gopd:a", "get:a", "gopd:b", "get:b"])
      assert.deepStrictEqual(current.calls, ["gopd:__proto__", "ownKeys", "gopd:a", "get:a", "gopd:b", "get:b"])
      assert.deepStrictEqual(current.calls, ["gopd:__proto__", ...old.calls])
    })

    it("KNOWN LIMITATION: a Proxy whose getOwnPropertyDescriptor(\"__proto__\") trap answers inconsistently across the two calls above can still pollute self's prototype", () => {
      // Deliberate gap: no ordinary source (every real call site here) can answer the guard's
      // check and Object.assign's own check differently. Only an adversarial Proxy can. Pinned
      // so a future change can't silently widen it; see record.ts and the PR for why it stands.
      let gopdCalls = 0
      const target = { a: 1 }
      const flakyProxy = new Proxy(target, {
        ownKeys() {
          return ["a", "__proto__"]
        },
        getOwnPropertyDescriptor(t, k) {
          if (k === "__proto__") {
            gopdCalls++
            // first call (the fast path's own guard): report "no own __proto__"
            // every later call (Object.assign's internal re-derivation): report "yes, enumerable"
            return gopdCalls === 1
              ? undefined
              : { value: { polluted: true }, enumerable: true, writable: true, configurable: true }
          }
          return Reflect.getOwnPropertyDescriptor(t, k)
        },
        get(t, k, r) {
          if (k === "__proto__") return { polluted: true }
          return Reflect.get(t, k, r)
        }
      })

      class Plain {}
      const self = new Plain()
      InternalRecord.assignProperties(self, flakyProxy)

      // documents the current (undesirable) outcome: self's actual prototype was replaced by the
      // value the flaky proxy reported on its second (and only its second) answer about "__proto__"
      assert.notStrictEqual(Object.getPrototypeOf(self), Plain.prototype)
      assert.deepStrictEqual(Object.getPrototypeOf(self), { polluted: true })
    })
  })

  describe("Data.TaggedError non-enumerable plainArgs symbol", () => {
    const plainArgsSymbol = Symbol.for("effect/Data/Error/plainArgs")

    class Boom extends Data.TaggedError("Boom")<{ readonly reason: string }> {}

    it("still sets the plainArgs symbol, and it remains non-enumerable, after the fields are copied", () => {
      const e = new Boom({ reason: "bad" })

      assert.strictEqual((e as any)[plainArgsSymbol].reason, "bad")

      const desc = Object.getOwnPropertyDescriptor(e, plainArgsSymbol)
      assert.ok(desc !== undefined)
      assert.strictEqual(desc!.enumerable, false)

      // the field itself must still be a normal enumerable own property
      assert.strictEqual(e.reason, "bad")
      assert.strictEqual(Object.prototype.propertyIsEnumerable.call(e, "reason"), true)
      assert.strictEqual(Object.prototype.propertyIsEnumerable.call(e, plainArgsSymbol), false)
    })
  })

  describe("differential: old loop vs current assignProperties", () => {
    type SourceCase = { readonly name: string; readonly make: () => object }
    type TargetCase = { readonly name: string; readonly make: () => object }

    class PlainTarget {}

    class SetterTarget {
      _b: unknown = undefined
      get b() {
        return this._b
      }
      set b(v: unknown) {
        this._b = v
      }
    }

    class ReadOnlyBase {}
    Object.defineProperty(ReadOnlyBase.prototype, "ro", {
      value: "original",
      writable: false,
      enumerable: true,
      configurable: true
    })
    class ReadOnlyTarget extends ReadOnlyBase {}

    const sources: ReadonlyArray<SourceCase> = [
      { name: "plain object", make: () => ({ a: 1, b: 2 }) },
      {
        name: "integer-like keys",
        make: () => {
          const o: any = {}
          o["b"] = 1
          o[2] = "two"
          o[1] = "one"
          o["a"] = 2
          return o
        }
      },
      {
        // the same symbol instance must be reused across the two `make()` calls (one per
        // implementation under test), otherwise `Reflect.ownKeys` comparisons would fail on
        // two distinct-but-same-description symbols that were never meant to be compared
        name: "symbols",
        make: ((s: symbol) => () => ({ [s]: "sym-value", b: 2 }))(Symbol("diff-sym"))
      },
      {
        name: "non-enumerable symbol and string key",
        make: () => {
          const s = Symbol("diff-hidden-sym")
          const o: any = {}
          Object.defineProperty(o, "hidden", { value: 1, enumerable: false, configurable: true })
          Object.defineProperty(o, s, { value: 2, enumerable: false, configurable: true })
          Object.defineProperty(o, "visible", { value: 3, enumerable: true, configurable: true })
          return o
        }
      },
      {
        name: "JSON.parse'd own __proto__",
        make: () => JSON.parse("{\"__proto__\":{\"polluted\":true},\"a\":2}")
      },
      {
        name: "non-enumerable own __proto__",
        make: () => {
          const o: any = { a: 1 }
          Object.defineProperty(o, "__proto__", { value: 99, enumerable: false, configurable: true })
          return o
        }
      },
      {
        name: "null-prototype source",
        make: () => Object.assign(Object.create(null), { a: 1, b: 2 })
      },
      {
        name: "getter that deletes a not-yet-visited key",
        make: () => {
          const o: any = {}
          Object.defineProperty(o, "a", {
            get() {
              delete o.b
              return 1
            },
            enumerable: true,
            configurable: true
          })
          o.b = 2
          o.c = 3
          return o
        }
      },
      {
        name: "getter that adds a key after the keys were already snapshotted",
        make: () => {
          const o: any = {}
          Object.defineProperty(o, "a", {
            get() {
              o.lateAdded = "too-late"
              return 1
            },
            enumerable: true,
            configurable: true
          })
          o.b = 2
          return o
        }
      },
      {
        name: "getter that throws",
        make: () => {
          const o: any = { a: 1 }
          Object.defineProperty(o, "b", {
            get() {
              throw new RangeError("boom")
            },
            enumerable: true,
            configurable: true
          })
          o.c = 3
          return o
        }
      },
      {
        name: "undefined/null values",
        make: () => ({ a: undefined, b: null, c: 3 })
      },
      {
        name: "inherited read-only target collision",
        make: () => ({ ro: "overwritten" })
      },
      {
        name: "proxy source",
        make: () => new Proxy({ a: 1, b: 2 }, {})
      }
    ]

    const targets: ReadonlyArray<TargetCase> = [
      { name: "plain class instance", make: () => new PlainTarget() },
      { name: "class with a setter", make: () => new SetterTarget() },
      { name: "frozen instance", make: () => Object.freeze(new PlainTarget()) },
      { name: "instance with inherited read-only property", make: () => new ReadOnlyTarget() }
    ]

    for (const source of sources) {
      for (const target of targets) {
        it(`source: ${source.name} / target: ${target.name}`, () => {
          const oldTarget = target.make()
          let oldError: unknown
          try {
            oldAssignProperties(oldTarget, source.make())
          } catch (e) {
            oldError = e
          }

          const newTarget = target.make()
          let newError: unknown
          try {
            InternalRecord.assignProperties(newTarget, source.make())
          } catch (e) {
            newError = e
          }

          // both throw, or neither throws
          assert.strictEqual(oldError === undefined, newError === undefined, "throw-ness must match")
          if (oldError !== undefined || newError !== undefined) {
            assert.strictEqual(
              (oldError as any)?.constructor,
              (newError as any)?.constructor,
              "thrown error constructor must match"
            )
            assert.strictEqual(
              (oldError as any)?.message,
              (newError as any)?.message,
              "thrown error message must match"
            )
          }

          assert.deepStrictEqual(
            Reflect.ownKeys(newTarget),
            Reflect.ownKeys(oldTarget),
            "resulting own-key order must match"
          )
          assert.strictEqual(
            Object.getPrototypeOf(newTarget),
            Object.getPrototypeOf(oldTarget),
            "prototype must be unchanged and identical"
          )

          for (const key of Reflect.ownKeys(oldTarget)) {
            assert.deepStrictEqual(
              Object.getOwnPropertyDescriptor(newTarget, key),
              Object.getOwnPropertyDescriptor(oldTarget, key),
              `descriptor for key ${String(key)} must match`
            )
          }
        })
      }
    }
  })
})
