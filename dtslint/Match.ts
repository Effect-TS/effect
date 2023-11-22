import { pipe } from "effect/Function"
import * as M from "effect/Match"

type Value = { _tag: "A"; a: number } | { _tag: "B"; b: number }
const value = { _tag: "A", a: 123 } as Value

// -------------------------------------------------------------------------------------
// valueTags
// -------------------------------------------------------------------------------------

// $ExpectType string | number
pipe(
  value,
  M.valueTags({
    A: (_) => _.a,
    B: () => "B"
  })
)

pipe(
  value,
  M.valueTags({
    A: (_) => _.a,
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
  A: (_) => _.a,
  B: () => "B"
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
    A: (_) => _.a,
    B: () => "B"
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
    A: (_) => _.a,
    B: () => "B"
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
    A: (_) => _.a,
    B: () => "B"
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
    A: (_) => _.a,
    B: () => "B"
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
