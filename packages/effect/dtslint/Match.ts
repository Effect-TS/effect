import { Either, hole, Match, Match as M, pipe, Predicate } from "effect"

type Value = { _tag: "A"; a: number } | { _tag: "B"; b: number }
declare const value: Value
declare const handlerA: (_: { _tag: "A"; a: number }) => string

// -------------------------------------------------------------------------------------
// type
// -------------------------------------------------------------------------------------

// $ExpectType (u: Value) => string
M.type<Value>().pipe(
  M.when(M.any, (
    _v // $ExpectType Value
  ) => "a"),
  M.exhaustive
)

// -------------------------------------------------------------------------------------
// value
// -------------------------------------------------------------------------------------

// $ExpectType string
M.value(hole<Value>()).pipe(
  M.when(M.any, (
    _v // $ExpectType Value
  ) => "a"),
  M.exhaustive
)

// -------------------------------------------------------------------------------------
// withReturnType
// -------------------------------------------------------------------------------------

Match.type<{ a: number } | { b: string }>().pipe(
  Match.withReturnType<string>(),
  // @ts-expect-error
  Match.when({ a: Match.number }, (_) => _.a),
  Match.when({ b: Match.string }, (_) => _.b),
  Match.exhaustive
)

// -------------------------------------------------------------------------------------
// orElse
// -------------------------------------------------------------------------------------

// $ExpectType boolean | symbol
Match.value(hole<string | number>()).pipe(
  Match.when(M.string, (
    s // $ExpectType string
  ) => Symbol.for(s)),
  Match.orElse((
    _n // $ExpectType number
  ) => true)
)

// -------------------------------------------------------------------------------------
// option
// -------------------------------------------------------------------------------------

// $ExpectType Option<symbol>
Match.value(hole<string | number>()).pipe(
  Match.when(M.string, (
    s // $ExpectType string
  ) => Symbol.for(s)),
  Match.option
)

// -------------------------------------------------------------------------------------
// either
// -------------------------------------------------------------------------------------

// $ExpectType Either<symbol, number>
Match.value(hole<string | number>()).pipe(
  Match.when(M.string, (
    s // $ExpectType string
  ) => Symbol.for(s)),
  Match.either
)

// -------------------------------------------------------------------------------------
// when
// -------------------------------------------------------------------------------------

// schema exhaustive-literal
// $ExpectType Either<"A", "B">
pipe(
  M.value(hole<{ _tag: "A"; a: number | string } | { _tag: "B"; b: number }>()),
  M.when({ _tag: M.is("A", "B"), a: M.number }, (
    _ // $ExpectType { a: number; _tag: "A"; }
  ) => {
    return Either.right(_._tag)
  }),
  M.when({ _tag: M.string, a: M.string }, (
    _ // $ExpectType { a: string; _tag: "A"; }
  ) => {
    return Either.right(_._tag)
  }),
  M.when({ b: M.number }, (_) => Either.left(_._tag)),
  M.orElse((_) => {
    throw "absurd"
  })
)

// tuples
// $ExpectType Option<boolean>
pipe(
  M.value(hole<[string, string]>()),
  M.when(["yeah"], (
    _ // $ExpectType readonly ["yeah", string]
  ) => {
    return true
  }),
  M.option
)

// not literal
// $ExpectType string
pipe(
  M.value(hole<string | number>()),
  M.not("hi", (
    _ // $ExpectType string | number
  ) => {
    return "a"
  }),
  M.orElse((_) => "b")
)

// literals
// $ExpectType string | boolean
pipe(
  M.value(hole<string>()),
  M.when("yeah", (
    _ // $ExpectType "yeah"
  ) => {
    return _ === "yeah"
  }),
  M.orElse(() => "nah")
)

// nested
// $ExpectType string | number | null
pipe(
  M.value(hole<
    | { foo: { bar: { baz: { qux: string } } } }
    | { foo: { bar: { baz: { qux: number } } } }
    | { foo: { bar: null } }
  >()),
  M.when({ foo: { bar: { baz: { qux: 2 } } } }, (
    _ // $ExpectType { foo: { bar: { baz: { qux: 2; }; }; }; }
  ) => {
    return `literal ${_.foo.bar.baz.qux}`
  }),
  M.when({ foo: { bar: { baz: { qux: "b" } } } }, (
    _ // $ExpectType { foo: { bar: { baz: { qux: "b"; }; }; }; }
  ) => {
    return `literal ${_.foo.bar.baz.qux}`
  }),
  M.when(
    { foo: { bar: { baz: { qux: M.number } } } },
    (_) => _.foo.bar.baz.qux
  ),
  M.when(
    { foo: { bar: { baz: { qux: M.string } } } },
    (_) => _.foo.bar.baz.qux
  ),
  M.when({ foo: { bar: null } }, (_) => _.foo.bar),
  M.exhaustive
)

// deep recursive
type A =
  | null
  | string
  | number
  | { [K in string]: A }
// $ExpectType string
pipe(
  M.value(hole<A>()),
  M.when(Predicate.isNull, (
    _ // $ExpectType null
  ) => {
    return "null"
  }),
  M.when(Predicate.isBoolean, (
    _ // $ExpectType boolean
  ) => {
    return "boolean"
  }),
  M.when(Predicate.isNumber, (
    _ // $ExpectType number
  ) => {
    return "number"
  }),
  M.when(Predicate.isString, (
    _ // $ExpectType string
  ) => {
    return "string"
  }),
  M.when(M.record, (
    _ // $ExpectType { [x: string]: A; }
  ) => {
    return "record"
  }),
  M.when(Predicate.isSymbol, (
    _ // $ExpectType symbol
  ) => {
    return "symbol"
  }),
  M.when(Predicate.isReadonlyRecord, (
    _ // $ExpectType { readonly [x: string]: unknown; readonly [x: symbol]: unknown; }
  ) => {
    return "readonlyrecord"
  }),
  M.exhaustive
)

// instanceOf
class Test {}
class Test2 {}

// $ExpectType number
pipe(
  M.value<Test | Test2>(new Test()),
  M.when(M.instanceOf(Test), (
    _ // $ExpectType Test
  ) => 1),
  M.orElse(() => 0)
)

// refinement - with unknown
const isArray = (_: unknown): _ is ReadonlyArray<unknown> => Array.isArray(_)
// $ExpectType string
pipe(
  M.value(hole<string | Array<number>>()),
  M.when(isArray, (
    _ // $ExpectType number[]
  ) => "array"),
  M.when(Predicate.isString, () => "string"),
  M.exhaustive
)

// refinement nested - with unknown
// $ExpectType string
pipe(
  M.value(hole<{ readonly a: string | Array<number> }>()),
  M.when({ a: isArray }, (
    _ // $ExpectType { a: readonly number[]; }
  ) => "array"),
  M.orElse(() => "fail")
)

// unknown - refinement
// $ExpectType string
pipe(
  M.value(hole<unknown>()),
  M.when(Predicate.isReadonlyRecord, (
    _ // $ExpectType { readonly [x: string]: unknown; readonly [x: symbol]: unknown; }
  ) => "record"),
  M.orElse(() => "unknown")
)

// any - refinement
// $ExpectType string
pipe(
  M.value(hole<any>()),
  M.when(Predicate.isReadonlyRecord, (
    _ // $ExpectType { readonly [x: string]: unknown; readonly [x: symbol]: unknown; }
  ) => "record"),
  M.orElse(() => "unknown")
)

// pattern type is not fixed by the function argument type

type T =
  | { resolveType: "A"; value: number }
  | { resolveType: "B"; value: number }
  | { resolveType: "C"; value: number }

const doStuff = (x: { value: number }) => x

// $ExpectType { value: number; }
pipe(
  M.value(hole<T>()),
  M.when({ resolveType: M.is("A", "B") }, doStuff),
  M.not({ resolveType: M.is("A", "B") }, doStuff),
  M.exhaustive
)

// non literal refinement
const a: number = 1
const b: string = "b"

// $ExpectType Either<string, { a: number; b: string; }>
M.value(hole<{ a: number; b: string }>()).pipe(
  M.when({ a, b }, (
    _ // $ExpectType { a: number; b: string; }
  ) => "ok"),
  M.either
)

// -------------------------------------------------------------------------------------
// valueTags
// -------------------------------------------------------------------------------------

// $ExpectType string | number
pipe(
  value,
  M.valueTags({
    A: (
      _A // $ExpectType { _tag: "A"; a: number; }
    ) => _A.a,
    B: (
      _B // $ExpectType { _tag: "B"; b: number; }
    ) => "B"
  })
)

pipe(
  value,
  M.valueTags({
    A: (_A) => _A.a,
    B: () => "B",
    // @ts-expect-error
    C: () => false
  })
)

// -------------------------------------------------------------------------------------
// typeTags
// -------------------------------------------------------------------------------------

// $ExpectType string | number
M.typeTags<Value>()({
  A: (
    _A // $ExpectType { _tag: "A"; a: number; }
  ) => _A.a,
  B: (
    _B // $ExpectType { _tag: "B"; b: number; }
  ) => "B"
})(value)

M.typeTags<Value>()({
  A: (_) => _.a,
  B: () => "B",
  // @ts-expect-error
  C: () => false
})(value)

// -------------------------------------------------------------------------------------
// discriminators
// -------------------------------------------------------------------------------------

// $ExpectType string | number
pipe(
  M.type<Value>(),
  M.discriminators("_tag")({
    A: (
      _A // $ExpectType { _tag: "A"; a: number; }
    ) => _A.a,
    B: (
      _B // $ExpectType { _tag: "B"; b: number; }
    ) => "B"
  }),
  M.exhaustive
)(value)

pipe(
  M.type<Value>(),
  M.discriminators("_tag")({
    A: (_) => _.a,
    B: () => "B",
    // @ts-expect-error
    C: () => false
  }),
  M.exhaustive
)(value)

// -------------------------------------------------------------------------------------
// discriminatorsExhaustive
// -------------------------------------------------------------------------------------

// $ExpectType string | number
pipe(
  M.type<Value>(),
  M.discriminatorsExhaustive("_tag")({
    A: (
      _A // $ExpectType { _tag: "A"; a: number; }
    ) => _A.a,
    B: (
      _B // $ExpectType { _tag: "B"; b: number; }
    ) => "B"
  })
)(value)

pipe(
  M.type<Value>(),
  M.discriminatorsExhaustive("_tag")({
    A: (_) => _.a,
    B: () => "B",
    // @ts-expect-error
    C: () => false
  })
)(value)

// -------------------------------------------------------------------------------------
// tags
// -------------------------------------------------------------------------------------

// $ExpectType string | number
pipe(
  M.type<Value>(),
  M.tags({
    A: (
      _A // $ExpectType { _tag: "A"; a: number; }
    ) => _A.a,
    B: (
      _B // $ExpectType { _tag: "B"; b: number; }
    ) => "B"
  }),
  M.exhaustive
)(value)

pipe(
  M.type<Value>(),
  M.tags({
    A: (_) => _.a,
    B: () => "B",
    // @ts-expect-error
    C: () => false
  }),
  M.exhaustive
)(value)

// -------------------------------------------------------------------------------------
// tagsExhaustive
// -------------------------------------------------------------------------------------

// $ExpectType string | number
pipe(
  M.type<Value>(),
  M.tagsExhaustive({
    A: (
      _A // $ExpectType { _tag: "A"; a: number; }
    ) => _A.a,
    B: (
      _B // $ExpectType { _tag: "B"; b: number; }
    ) => "B"
  })
)(value)

pipe(
  M.type<Value>(),
  M.tagsExhaustive({
    A: (_) => _.a,
    B: () => "B",
    // @ts-expect-error
    C: () => false
  })
)(value)

// -------------------------------------------------------------------------------------
// tag
// -------------------------------------------------------------------------------------

// tacit usage of external handler
// $ExpectType string | number
pipe(
  M.type<Value>(),
  M.tag("A", handlerA),
  M.orElse((
    _B // $ExpectType { _tag: "B"; b: number; }
  ) => _B.b)
)(value)

// -------------------------------------------------------------------------------------
// tagStartsWith
// -------------------------------------------------------------------------------------

// tacit usage of external handler
// $ExpectType string | number
pipe(
  M.type<Value>(),
  M.tagStartsWith("A", handlerA),
  M.orElse((
    _B // $ExpectType { _tag: "B"; b: number; }
  ) => _B.b)
)(value)
