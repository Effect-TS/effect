import { Context, Effect, Schema, SchemaGetter } from "effect"
import { Model } from "effect/unstable/schema"
import { SqlModel, SqlResolver } from "effect/unstable/sql"
import type { ResultLengthMismatch, SqlError } from "effect/unstable/sql/SqlError"
import { describe, expect, it } from "tstyche"

class NameDecoder extends Context.Service<NameDecoder, { readonly prefix: string }>()("NameDecoder") {}
class NameEncoder extends Context.Service<NameEncoder, { readonly prefix: string }>()("NameEncoder") {}
const decodedName = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.transformOrFail((value: string) => Effect.map(NameDecoder, ({ prefix }) => prefix + value)),
  encode: SchemaGetter.passthrough()
}))
const encodedName = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.passthrough(),
  encode: SchemaGetter.transformOrFail((value: string) => Effect.map(NameEncoder, ({ prefix }) => prefix + value))
}))
class User extends Model.Class<User>("User")({ id: Schema.Int, name: decodedName }) {}
class Both extends Model.Class<Both>("Both")({
  id: Schema.Int,
  name: Model.Field({ select: decodedName, insert: encodedName, update: encodedName })
}) {}
class Plain extends Model.Class<Plain>("Plain")({ id: Schema.Int, name: Schema.String }) {}

const options = { tableName: "users", idColumn: "id", spanPrefix: "User" } as const
const makeResolvers = SqlModel.makeResolvers(User, options)
const makeBoth = SqlModel.makeResolvers(Both, options)
const makePlain = SqlModel.makeResolvers(Plain, options)
const makeRepository = SqlModel.makeRepository(User, options)
declare const resolvers: Effect.Success<typeof makeResolvers>
declare const both: Effect.Success<typeof makeBoth>
declare const plain: Effect.Success<typeof makePlain>
declare const repository: Effect.Success<typeof makeRepository>
const input = { id: 1, name: "Ada" }

describe("SqlModel insert decoding services", () => {
  it("infers real schema and Model.Class service directions before wrapping", () => {
    expect<typeof decodedName.DecodingServices>().type.toBe<NameDecoder>()
    expect<typeof decodedName.EncodingServices>().type.toBe<never>()
    expect<typeof encodedName.DecodingServices>().type.toBe<never>()
    expect<typeof encodedName.EncodingServices>().type.toBe<NameEncoder>()
    expect<typeof User.DecodingServices>().type.toBe<NameDecoder>()
    expect<typeof User.insert.EncodingServices>().type.toBe<never>()
    expect<typeof Both.DecodingServices>().type.toBe<NameDecoder>()
    expect<typeof Both.insert.EncodingServices>().type.toBe<NameEncoder>()
  })

  it("public insert request retains the decoder", () => {
    const request = SqlResolver.request(input, resolvers.insert)
    expect<[Effect.Services<typeof request>]>().type.toBe<[NameDecoder]>()
    expect<Effect.Success<typeof request>>().type.toBe<User>()
    expect<Effect.Error<typeof request>>().type.toBe<Schema.SchemaError | SqlError | ResultLengthMismatch>()
    expect(Effect.runPromise).type.not.toBeCallableWith(request)
    const provided = request.pipe(Effect.provideService(NameDecoder, { prefix: "read:" }))
    expect<Effect.Services<typeof provided>>().type.toBe<never>()
    expect(Effect.runPromise).type.toBeCallableWith(provided)
  })

  it("curried insert request retains the decoder", () => {
    const insert = SqlResolver.request(resolvers.insert)
    const request = insert(input)
    expect<[Effect.Services<typeof request>]>().type.toBe<[NameDecoder]>()
    expect(Effect.runPromise).type.not.toBeCallableWith(request)
    expect(insert).type.toBeCallableWith(input)
    expect(insert).type.not.toBeCallableWith({ id: "wrong", name: "Ada" })
    expect(insert).type.not.toBeCallableWith({ id: 1, name: 42 })
  })

  it("distinct input encoder and result decoder form a union", () => {
    const request = SqlResolver.request(input, both.insert)
    expect<Effect.Services<typeof request>>().type.toBe<NameEncoder | NameDecoder>()
    const missingDecoder = request.pipe(Effect.provideService(NameEncoder, { prefix: "write:" }))
    expect<[Effect.Services<typeof missingDecoder>]>().type.toBe<[NameDecoder]>()
    expect(Effect.runPromise).type.not.toBeCallableWith(missingDecoder)
    const missingEncoder = request.pipe(Effect.provideService(NameDecoder, { prefix: "read:" }))
    expect<Effect.Services<typeof missingEncoder>>().type.toBe<NameEncoder>()
    expect(Effect.runPromise).type.not.toBeCallableWith(missingEncoder)
    const complete = missingDecoder.pipe(Effect.provideService(NameDecoder, { prefix: "read:" }))
    expect<Effect.Services<typeof complete>>().type.toBe<never>()
    expect(Effect.runPromise).type.toBeCallableWith(complete)
  })

  it("direct ordered resolver already retains both directions", () => {
    const resolver = SqlResolver.ordered({
      Request: Both.insert,
      Result: Both,
      execute: (rows) => Effect.succeed(rows)
    })
    const request = SqlResolver.request(input, resolver)
    expect<Effect.Services<typeof request>>().type.toBe<NameEncoder | NameDecoder>()
    expect(Effect.runPromise).type.not.toBeCallableWith(request)
  })

  it("repository insert and resolver findById already retain the decoder", () => {
    const insert = repository.insert(input)
    const found = SqlResolver.request(1, resolvers.findById)
    expect<Effect.Services<typeof insert>>().type.toBe<NameDecoder>()
    expect<Effect.Services<typeof found>>().type.toBe<NameDecoder>()
    expect(Effect.runPromise).type.not.toBeCallableWith(insert)
    expect(Effect.runPromise).type.not.toBeCallableWith(found)
  })

  it("insertVoid requires only input encoding, never result decoding", () => {
    const decodedOnly = SqlResolver.request(input, resolvers.insertVoid)
    const encoded = SqlResolver.request(input, both.insertVoid)
    expect<Effect.Services<typeof decodedOnly>>().type.toBe<never>()
    expect(Effect.runPromise).type.toBeCallableWith(decodedOnly)
    expect<Effect.Services<typeof encoded>>().type.toBe<NameEncoder>()
    expect(Effect.runPromise).type.not.toBeCallableWith(encoded)
    expect(Effect.runPromise).type.toBeCallableWith(encoded.pipe(Effect.provideService(NameEncoder, { prefix: "" })))
  })

  it("plain models stay service-free and reject invalid request types", () => {
    const insert = SqlResolver.request(plain.insert)
    const request = insert(input)
    expect<Effect.Services<typeof request>>().type.toBe<never>()
    expect<Effect.Success<typeof request>>().type.toBe<Plain>()
    expect(Effect.runPromise).type.toBeCallableWith(request)
    expect(insert).type.not.toBeCallableWith({ id: 1 })
    expect(insert).type.not.toBeCallableWith({ id: "1", name: "Ada" })
  })
})
