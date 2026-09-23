import { assert, describe, it, vi } from "@effect/vitest"
import { Effect, Schema, SchemaAST, SchemaParser, SchemaTransformation } from "effect"
import * as Codegen from "effect/internal/schema/codegen"
import * as Registry from "effect/internal/schema/compilerRegistry"
import { SchemaCompiler, SchemaJITCompiler } from "effect/schema"
import { constructionCases, constructionEvents, constructionOptions } from "./fixtures/construction.ts"

describe("Schema compiler construction", { concurrent: false }, () => {
  it.effect("matches interpreted construction, effects and options", () =>
    Effect.gen(function*() {
      const fixtures = Object.entries(constructionCases)
      const snapshot = Effect.fnUntraced(function*(fixture: typeof fixtures[number][1]) {
        const out = []
        const make = SchemaParser.makeEffect(fixture.schema)
        for (const parseOptions of constructionOptions) {
          for (const input of fixture.inputs) {
            constructionEvents.length = 0
            const result = yield* Effect.result(make(input as never, { parseOptions }))
            out.push({ result, events: [...constructionEvents] })
          }
        }
        return out
      })
      // Capture every interpreted result before installing shared child ASTs.
      const interpreted = yield* Effect.forEach(fixtures, ([, fixture]) => snapshot(fixture))
      for (const [index, [name, fixture]] of fixtures.entries()) {
        SchemaJITCompiler.enable(SchemaAST.toType(fixture.schema.ast))
        assert.deepStrictEqual(yield* snapshot(fixture), interpreted[index], name)
      }
    }))

  it("keeps selective compilation below an interpreted Suspend", () => {
    let forced = 0
    const child = Schema.Struct({ value: Schema.String })
    const schema = Schema.suspend(() => {
      forced++
      return child
    })
    SchemaJITCompiler.enable(SchemaAST.toType(schema.ast))
    assert.strictEqual(forced, 0)
    assert.deepStrictEqual(SchemaParser.make(schema)({ value: "a" }), { value: "a" })
    assert.strictEqual(forced, 1)
  })

  it("compiles only the raw constructor when construction succeeds", () => {
    const schema = Schema.Struct({ a: Schema.String })
    const emit = vi.spyOn(Codegen, "generate")
    try {
      SchemaJITCompiler.enable(schema.ast)
      assert.deepStrictEqual(SchemaParser.make(schema)({ a: "a" }), { a: "a" })
      assert.strictEqual(
        emit.mock.calls.filter(([, operation]) => operation === "decode" || operation === "is").length,
        0
      )
      assert.strictEqual(emit.mock.calls.filter(([, operation]) => operation === "make").length, 1)
      assert.strictEqual(emit.mock.calls.filter(([, operation]) => operation === "makeEffect").length, 0)
    } finally {
      emit.mockRestore()
    }
  })

  it("does not compile construction when only decoding is used", () => {
    const schema = Schema.Struct({ a: Schema.String })
    const emit = vi.spyOn(Codegen, "generate")
    try {
      SchemaJITCompiler.enable(schema.ast)
      assert.deepStrictEqual(SchemaParser.decodeUnknownSync(schema)({ a: "a" }), { a: "a" })
      assert.strictEqual(emit.mock.calls.filter(([, operation]) => operation === "makeEffect").length, 0)
      assert.deepStrictEqual(SchemaParser.make(schema)({ a: "a" }), { a: "a" })
      assert.strictEqual(emit.mock.calls.filter(([, operation]) => operation === "make").length, 1)
      assert.strictEqual(emit.mock.calls.filter(([, operation]) => operation === "makeEffect").length, 0)
    } finally {
      emit.mockRestore()
    }
  })

  for (const compiled of [false, true]) {
    it(`initializes only reached constructor children, compiled=${compiled}`, () => {
      const child = Schema.String.annotate({ title: "lazy constructor child" })
      let reads = 0
      const decoder: SchemaCompiler.CompiledDecoder = Object.freeze({
        decodeEffect: Effect.succeed,
        get makeEffect() {
          assert.strictEqual<unknown>(this, decoder)
          reads++
          return Effect.succeed
        }
      })
      SchemaCompiler.set(child.ast, decoder)
      const schema = Schema.Struct({ first: Schema.Number, child })
      if (compiled) SchemaJITCompiler.enable(schema.ast)
      const make = SchemaParser.make(schema)
      assert.throws(() => make({ first: "invalid", child: "unreached" } as never))
      assert.strictEqual(reads, 0)
      assert.deepStrictEqual(make({ first: 1, child: "a" }), { first: 1, child: "a" })
      assert.deepStrictEqual(make({ first: 2, child: "b" }), { first: 2, child: "b" })
      assert.strictEqual(reads, 1)
    })
  }

  it("prepares selective Declaration parameters for public decoders in the callback", () => {
    const child = Schema.Struct({ value: Schema.String })
    const schema = Schema.ReadonlySet(child)
    SchemaJITCompiler.enable(SchemaAST.toType(schema.ast))
    assert.deepStrictEqual(SchemaParser.make(schema)(new Set([{ value: "a" }])), new Set([{ value: "a" }]))
    assert.strictEqual(Registry.resolve(child.ast).compiled !== undefined, true)
  })

  it("does not restart a parent if compilation fails after a default", () => {
    let defaults = 0
    const child = Schema.Struct({ value: Schema.String })
    const schema = Schema.Struct({
      child: child.pipe(Schema.withConstructorDefault(Effect.sync(() => {
        defaults++
        return { value: "default" }
      })))
    })
    const childAST = schema.fields.child.ast
    const emit = Codegen.generate
    const failure = vi.spyOn(Codegen, "generate").mockImplementation((ast, operation) => {
      if (ast === childAST && operation === "makeEffect") {
        assert.strictEqual(defaults, 1)
        throw new Error("child compile failed")
      }
      return emit(ast, operation)
    })
    try {
      SchemaJITCompiler.enable(schema.ast)
      assert.deepStrictEqual(SchemaParser.make(schema)({}), { child: { value: "default" } })
      assert.strictEqual(defaults, 1)
    } finally {
      failure.mockRestore()
    }
  })

  for (const operation of ["make", "decode"] as const) {
    it(`keeps the other operation compiled after ${operation} compilation fails`, () => {
      const schema = Schema.Struct({ a: Schema.String })
      SchemaJITCompiler.enable(schema.ast)
      const generate = Codegen.generate
      const failed = vi.spyOn(Codegen, "generate").mockImplementation((ast, key) => {
        if (ast === schema.ast && key === (operation === "make" ? "make" : "decode")) {
          throw new Error("compile failed")
        }
        return generate(ast, key)
      })
      try {
        const first = operation === "make" ? SchemaParser.make(schema) : SchemaParser.decodeUnknownSync(schema)
        assert.deepStrictEqual(first({ a: "a" }), { a: "a" })
        const second = operation === "make" ? SchemaParser.decodeUnknownSync(schema) : SchemaParser.make(schema)
        assert.deepStrictEqual(second({ a: "a" }), { a: "a" })
        assert(
          failed.mock.calls.some(([ast, key]) =>
            ast === schema.ast && key === (operation === "make" ? "decode" : "make")
          )
        )
      } finally {
        failed.mockRestore()
      }
    })
  }
  it("resolves installed construction lazily and independently from decoding", () => {
    const schema = Schema.Struct({ a: Schema.String })
    let reads = 0
    let calls = 0
    SchemaCompiler.set(schema.ast, {
      get decodeEffect(): SchemaCompiler.DecodeEffect {
        throw new Error("unused decoder")
      },
      get decode(): SchemaCompiler.Decode {
        throw new Error("unused fast decoder")
      },
      get is(): SchemaCompiler.Is {
        throw new Error("unused guard")
      },
      get makeEffect() {
        reads++
        return (input: unknown) => {
          calls++
          return Effect.succeed(input)
        }
      }
    })
    const make = SchemaParser.make(schema)
    assert.strictEqual(reads, 0)
    assert.deepStrictEqual(make({ a: "a" }), { a: "a" })
    assert.deepStrictEqual(SchemaParser.make(schema)({ a: "b" }), { a: "b" })
    assert.strictEqual(reads, 1)
    assert.strictEqual(calls, 2)
  })

  it("uses an installed synchronous constructor without resolving makeEffect", () => {
    const schema = Schema.Struct({ a: Schema.String })
    let calls = 0
    SchemaCompiler.set(schema.ast, {
      decodeEffect: Effect.succeed,
      make: (input, options) => {
        calls++
        assert.strictEqual(options, SchemaAST.defaultParseOptions)
        return { a: `${(input as { readonly a: string }).a}!` }
      },
      get makeEffect(): SchemaCompiler.MakeEffect {
        throw new Error("unused detailed constructor")
      }
    })
    assert.deepStrictEqual(SchemaParser.make(schema)({ a: "a" }), { a: "a!" })
    assert.strictEqual(calls, 1)
  })

  it("falls back to makeEffect after an installed synchronous constructor fails", () => {
    const schema = Schema.Struct({ a: Schema.String })
    let fast = 0
    let detailed = 0
    SchemaCompiler.set(schema.ast, {
      decodeEffect: Effect.succeed,
      make: () => {
        fast++
        return SchemaCompiler.invalid
      },
      makeEffect: (input) => {
        detailed++
        return Effect.succeed(input)
      }
    })
    assert.deepStrictEqual(SchemaParser.make(schema)({ a: "a" }), { a: "a" })
    assert.strictEqual(fast, 1)
    assert.strictEqual(detailed, 1)
  })

  it("does not return a missing result from an installed synchronous constructor", () => {
    const schema = Schema.Struct({ a: Schema.String })
    SchemaCompiler.set(schema.ast, {
      decodeEffect: Effect.succeed,
      make: () => SchemaCompiler.missing,
      makeEffect: () => Effect.succeed(SchemaCompiler.missing)
    })
    assert.throws(() => SchemaParser.make(schema)({ a: "a" }), /Schema validation failed/)
  })

  it("composes an installed synchronous child constructor in a compiled Array", () => {
    const child = Schema.Struct({ a: Schema.String })
    SchemaCompiler.set(child.ast, {
      decodeEffect: Effect.succeed,
      make: (input) => ({ a: `${(input as { readonly a: string }).a}!` }),
      makeEffect: () => {
        throw new Error("unused detailed child constructor")
      }
    })
    const schema = Schema.Array(child)
    SchemaJITCompiler.enable(schema.ast)
    assert.deepStrictEqual(SchemaParser.make(schema)([{ a: "a" }, { a: "b" }]), [{ a: "a!" }, { a: "b!" }])
  })

  it("composes a compiled synchronous child constructor in a compiled Array", () => {
    const child = Schema.Struct({ a: Schema.String })
    SchemaJITCompiler.enable(child.ast)
    const childEntry = Registry.resolve(child.ast)
    const schema = Schema.Array(child)
    SchemaJITCompiler.enable(schema.ast)
    assert.deepStrictEqual(SchemaParser.make(schema)([{ a: "a" }]), [{ a: "a" }])
    assert.isTrue(Object.hasOwn(childEntry, "make"))
  })

  it("falls back to detailed construction for an invalid compiled Array", () => {
    const schema = Schema.Array(Schema.Struct({ a: Schema.String }))
    SchemaJITCompiler.enable(schema.ast)
    const make = SchemaParser.make(schema)
    assert.deepStrictEqual(make([{ a: "a" }]), [{ a: "a" }])
    assert.throws(() => make([{ a: 1 } as never]), /Schema validation failed/)
  })

  it("caches interpreted construction when an installed bundle omits it", () => {
    const schema = Schema.Struct({ a: Schema.Number.pipe(Schema.withConstructorDefault(Effect.succeed(1))) })
    SchemaCompiler.set(schema.ast, {
      decodeEffect: () => {
        throw new Error("not a constructor")
      }
    })
    const entry = Registry.resolve(schema.ast)
    const make = entry.makeEffect
    assert.strictEqual(entry.makeEffect, make)
    assert.deepStrictEqual(SchemaParser.make(schema)({}), { a: 1 })
  })

  it("keeps previously captured constructors after whole-entry replacement", () => {
    const schema = Schema.Struct({ a: Schema.String })
    const make = SchemaParser.make(schema)
    assert.deepStrictEqual(make({ a: "a" }), { a: "a" })
    SchemaCompiler.set(schema.ast, {
      decodeEffect: Effect.succeed,
      makeEffect: () => Effect.succeed({ a: "installed" })
    })
    assert.deepStrictEqual(make({ a: "a" }), { a: "a" })
    assert.deepStrictEqual(SchemaParser.make(schema)({ a: "a" }), { a: "installed" })
    SchemaCompiler.set(schema.ast, { decodeEffect: Effect.succeed })
    assert.deepStrictEqual(SchemaParser.make(schema)({ a: "a" }), { a: "a" })
  })

  it("uses type-side identity without applying root defaults", () => {
    const schema = Schema.FiniteFromString.pipe(Schema.withConstructorDefault(Effect.succeed(1)))
    const ast = SchemaAST.toType(schema.ast)
    SchemaCompiler.set(ast, { decodeEffect: Effect.succeed, makeEffect: Effect.succeed })
    assert.strictEqual(SchemaParser.make(schema)(2), 2)
    const number = Schema.Number.pipe(Schema.withConstructorDefault(Effect.succeed(1)))
    SchemaJITCompiler.enable(number.ast)
    assert.throws(() => SchemaParser.make(number)(undefined as never))
    assert.deepStrictEqual(SchemaParser.make(Schema.Struct({ number }))({}), { number: 1 })
  })

  it("preserves missing separately from undefined for installed children", () => {
    const child = Schema.optionalKey(Schema.Undefined)
    const inputs: Array<unknown> = []
    SchemaCompiler.set(child.ast, {
      decodeEffect: Effect.succeed,
      makeEffect: (input) => {
        inputs.push(input)
        return Effect.succeed(input)
      }
    })
    const schema = Schema.Struct({ child })
    assert.deepStrictEqual(SchemaParser.make(schema)({}), {})
    assert.deepStrictEqual(SchemaParser.make(schema)({ child: undefined }), { child: undefined })
    assert.deepStrictEqual(inputs, [SchemaCompiler.missing, undefined])
  })

  it("lets parents and public roots handle missing constructor outputs", () => {
    const required = Schema.String.annotate({ title: "Required construction output" })
    const optional = Schema.optionalKey(required)
    for (const schema of [required, optional]) {
      SchemaCompiler.set(schema.ast, {
        decodeEffect: Effect.succeed,
        makeEffect: () => Effect.succeed(SchemaCompiler.missing)
      })
    }
    const schema = Schema.Struct({ required, optional })
    SchemaJITCompiler.enable(schema.ast)
    assert.throws(() => SchemaParser.make(schema)({ required: "a" }), /Schema validation failed/)
    assert.deepStrictEqual(SchemaParser.make(Schema.Struct({ optional }))({ optional: "a" }), {})
    assert.throws(() => SchemaParser.make(required)("a"), /Schema validation failed/)
  })

  it.effect("executes async defaults once, including on later failure", () =>
    Effect.gen(function*() {
      let defaults = 0
      const schema = Schema.Struct({
        a: Schema.String.pipe(Schema.withConstructorDefault(Effect.gen(function*() {
          yield* Effect.yieldNow
          defaults++
          return "default"
        }))),
        b: Schema.Number
      })
      SchemaJITCompiler.enable(schema.ast)
      const make = SchemaParser.makeEffect(schema)
      assert.deepStrictEqual(yield* make({ b: 1 }), { a: "default", b: 1 })
      assert.strictEqual((yield* Effect.exit(make({ b: "bad" } as never)))._tag, "Failure")
      assert.strictEqual(defaults, 2)
    }))
})

describe("Schema code generation limits", () => {
  const wide = (width: number) => {
    const fields: Record<string, Schema.String> = {}
    for (let i = 0; i < width; i++) fields[`f${i}`] = Schema.String
    return Schema.Struct(fields)
  }
  const nest = (schema: Schema.Top, depth: number): Schema.Top => {
    let out = schema
    for (let i = 0; i < depth; i++) out = Schema.Struct({ n: out })
    return out
  }
  const shared = (schema: Schema.Top, count: number) => {
    const fields: Record<string, Schema.Top> = {}
    for (let i = 0; i < count; i++) fields[`p${i}`] = schema
    return Schema.Struct(fields)
  }
  const emits = (schema: Schema.Top, operation: Codegen.DecoderOperation) =>
    Codegen.generate(schema.ast, operation) !== undefined

  it("counts every occurrence of a shared schema against the node limit", () => {
    assert.isTrue(emits(wide(Codegen.maxGeneratedNodes - 1), "decode"))
    assert.isFalse(emits(wide(Codegen.maxGeneratedNodes), "decode"))
    const field = wide(600)
    assert.isTrue(emits(shared(field, 3), "decode"))
    assert.isFalse(emits(shared(field, 4), "decode"))
    assert.isTrue(emits(shared(field, 3), "make"))
    assert.isFalse(emits(shared(field, 4), "make"))
    const half = shared(wide(300), 2)
    assert.isTrue(emits(half, "decode"))
    assert.isTrue(emits(shared(half, 3), "decode"))
    assert.isFalse(emits(shared(half, 4), "decode"))
  })

  it("limits depth through shared schemas", () => {
    assert.isTrue(emits(nest(Schema.String, 256), "decode"))
    assert.isFalse(emits(nest(Schema.String, 257), "decode"))
    const empty = nest(Schema.Struct({}), 200)
    assert.isTrue(emits(empty, "decode"))
    assert.isTrue(emits(nest(empty, 56), "decode"))
    assert.isFalse(emits(nest(empty, 57), "decode"))
    const inner = nest(Schema.String, 200)
    assert.isTrue(emits(nest(inner, 56), "decode"))
    assert.isFalse(emits(nest(inner, 57), "decode"))
    assert.isTrue(emits(nest(inner, 56), "make"))
    assert.isFalse(emits(nest(inner, 57), "make"))
    let array: Schema.Top = Schema.String
    for (let i = 0; i < 256; i++) array = Schema.Array(array)
    assert.isTrue(emits(array, "decode"))
    assert.isFalse(emits(Schema.Array(array), "decode"))
  })

  it("stops analysing past the depth limit", () => {
    let array: Schema.Top = Schema.String
    for (let i = 0; i < 10_000; i++) array = Schema.Array(array)
    const struct = nest(Schema.String, 10_000)
    for (const operation of ["is", "decode", "make", "decodeEffect", "makeEffect"] as const) {
      assert.isString(Codegen.generate(array.ast, operation) ?? "")
      assert.isString(Codegen.generate(struct.ast, operation) ?? "")
    }
    assert.isFalse(emits(array, "decode"))
    assert.isFalse(emits(struct, "make"))
  })

  it("stops at the first occurrence of a schema beyond the depth limit", () => {
    let reads = 0
    const spine = nest(Schema.String, 300).ast
    let ast: SchemaAST.AST = new Proxy(spine, {
      get(target, key, receiver) {
        reads++
        return Reflect.get(target, key, receiver)
      }
    })
    for (let i = 0; i < 12; i++) {
      ast = new SchemaAST.Objects([
        new SchemaAST.PropertySignature("a", ast),
        new SchemaAST.PropertySignature("b", ast)
      ], [])
    }
    assert.isUndefined(Codegen.generate(ast, "decode"))
    assert.isUndefined(Codegen.generate(ast, "make"))
    assert.isBelow(reads, 100)
  })

  it("stops at the first field that cannot be generated", () => {
    let reads = 0
    const large: SchemaAST.AST = new Proxy(wide(3000).ast, {
      get(target, key, receiver) {
        reads++
        return Reflect.get(target, key, receiver)
      }
    })
    const field = new SchemaAST.Objects([
      new SchemaAST.PropertySignature("d", Schema.Date.ast),
      new SchemaAST.PropertySignature("a", large)
    ], [])
    const ast = new SchemaAST.Objects(
      Array.from({ length: 16 }, (_, i) => new SchemaAST.PropertySignature(`f${i}`, field)),
      []
    )
    for (const operation of ["is", "decode", "make", "decodeEffect", "makeEffect"] as const) {
      Codegen.generate(ast, operation)
    }
    assert.isUndefined(Codegen.generate(ast, "decode"))
    assert.strictEqual(reads, 0)
  })

  it("answers each enclosing schema without walking back down to a part that cannot be generated", () => {
    let reads = 0
    const date: SchemaAST.AST = new Proxy(Schema.Date.ast, {
      get(target, key, receiver) {
        reads++
        return Reflect.get(target, key, receiver)
      }
    })
    const levels: Array<SchemaAST.AST> = [date]
    for (let i = 0; i < 50; i++) {
      levels.push(new SchemaAST.Objects([new SchemaAST.PropertySignature("n", levels[levels.length - 1])], []))
    }
    for (const ast of levels.slice(1).reverse()) {
      assert.isUndefined(Codegen.generate(ast, "decode"))
    }
    assert.isBelow(reads, 10)
  })

  it("compiles a schema that fits even after meeting it beyond the depth limit", () => {
    const inner = nest(Schema.String, 100)
    assert.isFalse(emits(nest(inner, 200), "decode"))
    assert.isFalse(emits(nest(inner, 200), "make"))
    assert.isTrue(emits(Schema.Struct({ a: inner }), "decode"))
    assert.isTrue(emits(Schema.Struct({ a: inner }), "is"))
    assert.isTrue(emits(Schema.Struct({ a: inner }), "make"))
  })

  it("emits a type guard only when no nested container is checked", () => {
    const check = Schema.makeFilter(() => undefined)
    assert.isTrue(emits(Schema.Struct({ a: Schema.String.check(check) }), "is"))
    assert.isTrue(emits(Schema.Struct({ a: Schema.TemplateLiteral(["a", Schema.String]).check(check) }), "is"))
    assert.isFalse(emits(Schema.Struct({ a: Schema.Struct({ b: Schema.String }).check(check) }), "is"))
    assert.isFalse(emits(Schema.Struct({ a: Schema.Array(Schema.String).check(check) }), "is"))
    assert.isTrue(emits(Schema.Struct({ a: Schema.Struct({ b: Schema.String }).check(check) }), "decode"))
  })

  it("rejects nested encodings, declarations and suspensions", () => {
    const trimmed = Schema.String.pipe(Schema.decodeTo(Schema.String, SchemaTransformation.trim()))
    const Rec: Schema.Top = Schema.Struct({ a: Schema.String, next: Schema.suspend(() => Rec) })
    for (const field of [trimmed, Schema.Date, Rec]) {
      const schema = Schema.Struct({ a: Schema.String, deep: nest(Schema.Struct({ x: field }), 3) })
      assert.isFalse(emits(schema, "decode"))
      assert.include(Codegen.generate(schema.ast, "decodeEffect"), ",false,")
    }
    assert.include(Codegen.generate(Schema.Struct({ a: Schema.String }).ast, "decodeEffect"), ",true,")
    const root = Schema.Struct({ a: Schema.String }).pipe(
      Schema.decodeTo(Schema.Struct({ a: Schema.String }), SchemaTransformation.passthrough())
    )
    assert.isFalse(emits(root, "decode"))
    assert.include(Codegen.generate(root.ast, "decodeEffect"), ",false,()=>")
    assert.notInclude(Codegen.generate(Schema.Struct({ a: root }).ast, "decodeEffect"), "()=>")
    assert.isFalse(emits(Schema.Struct({ a: root }), "decode"))
  })

  it("compiles construction only without nested records, unions or defaults", () => {
    assert.isTrue(emits(Schema.Struct({ a: Schema.Struct({ b: Schema.String }) }), "make"))
    assert.isFalse(emits(Schema.Struct({ a: Schema.Record(Schema.String, Schema.Number) }), "make"))
    assert.isFalse(emits(Schema.Struct({ a: Schema.Union([Schema.String, Schema.Number]) }), "make"))
    assert.isFalse(
      emits(
        Schema.Struct({
          a: Schema.Struct({ b: Schema.String.pipe(Schema.withConstructorDefault(Effect.succeed("b"))) })
        }),
        "make"
      )
    )
  })
})
