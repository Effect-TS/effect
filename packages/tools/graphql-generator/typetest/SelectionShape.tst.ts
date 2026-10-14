/**
 * The declaration shape proposed for generated selection schemas (#9155): a
 * `Schema.Struct` const with a same-named interface extending its decoded type,
 *
 * ```ts
 * export const Author = Schema.Struct({ ... })
 * export interface Author extends Schema.Struct.Type<typeof Author.fields> {}
 * ```
 *
 * in place of `class Author extends Schema.Opaque<Author>()(Schema.Struct({ ... })) {}`.
 */
import type { DateTime, Effect } from "effect"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "tstyche"

const Author = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
interface Author extends Schema.Struct.Type<typeof Author.fields> {}

const Book = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
interface Book extends Schema.Struct.Type<typeof Book.fields> {}

// A custom scalar codec, a `__typename` and an `@include` / `@skip` field
const Event = Schema.Struct({
  __typename: Schema.Literal("Event"),
  at: Schema.DateTimeUtcFromString,
  note: Schema.optionalKey(Schema.String)
})
interface Event extends Schema.Struct.Type<typeof Event.fields> {}

// The members of an interface or union selection
const MemberJoined = Schema.Struct({
  __typename: Schema.Literal("MemberJoined"),
  member: Author
})
interface MemberJoined extends Schema.Struct.Type<typeof MemberJoined.fields> {}

const RoomRenamed = Schema.Struct({
  __typename: Schema.Literal("RoomRenamed"),
  name: Schema.String
})
interface RoomRenamed extends Schema.Struct.Type<typeof RoomRenamed.fields> {}

const RoomEvent = Schema.Union([MemberJoined, RoomRenamed])

describe("Struct with an interface extending its Type", () => {
  it("is the schema's decoded type", () => {
    expect<Author>().type.toBe<{ readonly name: string | null; readonly born: number | null }>()
    expect<Author>().type.toBe<typeof Author.Type>()
    expect<Book>().type.toBe<typeof Book.Type>()
    expect<Event>().type.toBe<typeof Event.Type>()
    expect<MemberJoined>().type.toBe<typeof MemberJoined.Type>()
  })

  it("keeps nested selections, nullable lists and optional fields", () => {
    expect<Book["author"]>().type.toBe<Author | null>()
    expect<Book["tags"]>().type.toBe<ReadonlyArray<string | null> | null>()
    expect<Event>().type.toBe<{
      readonly __typename: "Event"
      readonly at: DateTime.Utc
      readonly note?: string
    }>()
  })

  it("keeps the encoded side of custom scalar codecs", () => {
    expect<typeof Event.Encoded>().type.toBe<{
      readonly __typename: "Event"
      readonly at: string
      readonly note?: string
    }>()
  })

  it("rejects values missing a selected field", () => {
    expect<{ readonly name: string | null }>().type.not.toBeAssignableTo<Author>()
    expect<{ readonly isbn: string }>().type.not.toBeAssignableTo<Book>()
  })

  it("decodes and constructs values of the interface", () => {
    expect(Schema.decodeUnknownEffect(Book)).type.toBeAssignableTo<
      (input: unknown) => Effect.Effect<Book, Schema.SchemaError>
    >()
    expect(Schema.decodeUnknownSync(RoomEvent)).type.toBeAssignableTo<
      (input: unknown) => MemberJoined | RoomRenamed
    >()
    expect(Author.make({ name: "Ada", born: null })).type.toBe<typeof Author.Type>()
    expect(Author.make).type.not.toBeCallableWith({ name: "Ada" })
  })
})
