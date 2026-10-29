import { assert, describe, it } from "@effect/vitest"
import { Filter, Match, Option, pipe } from "effect"
import { assertFalse, assertTrue, strictEqual, throws } from "./utils/assert.ts"
import { withIgnoredProperties } from "./utils/structFields.ts"

describe("Match", () => {
  it("fn keeps the selector arguments", () => {
    type Todo = { readonly completed: boolean }
    type Todos = Array<Todo>
    type Filter = "All" | "Active" | "Completed"

    const filterTodos = Match.fn((_todos: Todos, filter: Filter) => filter).pipe(
      Match.withReturnType<Todos>(),
      Match.when("All", (_filter, todos) => todos),
      Match.when("Active", (_filter, todos) => todos.filter((todo) => !todo.completed)),
      Match.when("Completed", (_filter, todos) => todos.filter((todo) => todo.completed)),
      Match.exhaustive
    )
    const todos: Todos = [{ completed: false }, { completed: true }]

    strictEqual(filterTodos(todos, "All"), todos)
    strictEqual(filterTodos(todos, "Active").length, 1)
    strictEqual(filterTodos(todos, "Active")[0], todos[0])
    strictEqual(filterTodos(todos, "Completed").length, 1)
    strictEqual(filterTodos(todos, "Completed")[0], todos[1])
  })

  it("fn can match a projected value", () => {
    type Todo = { readonly status: "Active" | "Completed"; readonly title: string }
    const formatTodo = Match.fn((todo: Todo) => todo.status).pipe(
      Match.when("Active", (_status, todo) => `Active: ${todo.title}`),
      Match.when("Completed", (_status, todo) => `Completed: ${todo.title}`),
      Match.exhaustive
    )

    strictEqual(formatTodo({ status: "Active", title: "Write tests" }), "Active: Write tests")
  })

  it("tag matches an exact _tag and falls through for null", () => {
    const match = pipe(
      Match.type<{ _tag: "A" } | null>(),
      Match.tag("A", () => "hit"),
      Match.orElse(() => "miss")
    )

    strictEqual(match({ _tag: "A" }), "hit")
    strictEqual(match(null), "miss")
  })

  it("tagStartsWith matches a _tag prefix and falls through otherwise", () => {
    const match = pipe(
      Match.type<{ _tag: "A.one" } | null>(),
      Match.tagStartsWith("A", () => "hit"),
      Match.orElse(() => "miss")
    )

    strictEqual(match({ _tag: "A.one" }), "hit")
    strictEqual(match(null), "miss")
  })

  it("literalsExhaustive dispatches string and numeric literals to their handlers", () => {
    const match = pipe(
      Match.type<"draft" | 404>(),
      Match.literalsExhaustive({
        draft: (value) => `string:${value}`,
        404: (value) => `number:${value}`
      })
    )

    strictEqual(match("draft"), "string:draft")
    strictEqual(match(404), "number:404")
  })

  it("literals only uses own handler keys and falls through otherwise", () => {
    const match = pipe(
      Match.type<"draft" | "review" | "toString" | null>(),
      Match.literals({ draft: () => "draft", review: () => "review" }),
      Match.orElse(() => "miss")
    )

    strictEqual(match("review"), "review")
    strictEqual(match("toString"), "miss")
    strictEqual(match(null), "miss")
  })

  it("tags and discriminators skip undefined handlers", () => {
    const tags = pipe(
      Match.type<{ readonly _tag: "A" } | { readonly _tag: "B" }>(),
      Match.tags({ A: undefined, B: () => "B" }),
      Match.orElse(() => "miss")
    )
    const discriminators = pipe(
      Match.type<{ readonly kind: "A" } | { readonly kind: "B" }>(),
      Match.discriminators("kind")({ A: undefined, B: () => "B" }),
      Match.orElse(() => "miss")
    )

    strictEqual(tags({ _tag: "B" }), "B")
    strictEqual(tags({ _tag: "A" }), "miss")
    strictEqual(discriminators({ kind: "B" }), "B")
    strictEqual(discriminators({ kind: "A" }), "miss")
  })

  it("discovers enumerable own pattern fields and reads non-enumerable input fields", () => {
    const key = Symbol("key")
    const match = pipe(
      Match.type<unknown>(),
      Match.when(withIgnoredProperties({ a: 1, [key]: "expected" }), () => "hit"),
      Match.orElse(() => "miss")
    )
    const input = Object.defineProperties({ a: 1, [key]: "expected" }, {
      a: { enumerable: false },
      [key]: { enumerable: false }
    })

    assert.strictEqual(match(input), "hit")
    assert.strictEqual(match({ a: 1, [key]: "other" }), "miss")
    assert.strictEqual(match({ a: 2, [key]: "expected" }), "miss")
    assert.strictEqual(match({}), "miss")
  })

  it("array patterns match prefixes and reject shorter arrays", () => {
    const match = Match.type<ReadonlyArray<number>>().pipe(
      Match.when([Match.any, Match.any], () => "hit"),
      Match.orElse(() => "miss")
    )

    strictEqual(match([1]), "miss")
    strictEqual(match([1, 2]), "hit")
    strictEqual(match([1, 2, 3]), "hit")
  })

  it("whenFilter passes the extracted value and otherwise falls through with the original input", () => {
    let calls = 0
    const queryToDomainLabel = Filter.fromPredicateOption((query: string) => {
      calls++
      const label = query.trim().toLowerCase()
      return label.length > 0 ? Option.some(label) : Option.none()
    })
    const describeQuery = (query: string) =>
      Match.value(query).pipe(
        Match.when("", () => "empty"),
        Match.whenFilter(queryToDomainLabel, (label) => `search:${label}`),
        Match.orElse((query) => `invalid:[${query}]`)
      )

    strictEqual(describeQuery("  ACME  "), "search:acme")
    strictEqual(calls, 1)
    strictEqual(describeQuery(""), "empty")
    strictEqual(calls, 1)
    strictEqual(describeQuery("   "), "invalid:[   ]")
    strictEqual(calls, 2)

    const describeType = Match.type<string>().pipe(
      Match.whenFilter(queryToDomainLabel, (label) => `search:${label}`),
      Match.orElse((query) => `invalid:[${query}]`)
    )

    strictEqual(describeType("  ACME  "), "search:acme")
    strictEqual(describeType("   "), "invalid:[   ]")
    strictEqual(calls, 4)
  })

  it("whenFilter cases keep the guard and evaluate contract of Case", () => {
    let calls = 0
    let fail = false
    const matcher = Match.type<string>().pipe(
      Match.whenFilter(
        Filter.fromPredicateOption((s: string) => {
          calls++
          if (fail) throw new Error("boom")
          return s === "" ? Option.none() : Option.some(s.length)
        }),
        (n) => n * 10
      )
    )
    assertTrue(matcher._tag === "TypeMatcher")
    const [_case] = matcher.cases

    assertTrue(_case.guard("abc"))
    strictEqual(_case.evaluate("abc"), 30)
    assertFalse(_case.guard(""))

    // a throwing guard must not leave an earlier extraction behind
    assertTrue(_case.guard("abc"))
    fail = true
    throws(() => _case.guard("abc"))
    fail = false
    strictEqual(_case.evaluate("abc"), 30)
    strictEqual(calls, 5)
  })
})
