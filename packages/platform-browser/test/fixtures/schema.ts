import * as Transferable from "@effect/platform-browser/Transferable"
import * as Schema from "@effect/schema/Schema"

export class User extends Schema.Class<User>()({
  id: Schema.number,
  name: Schema.string
}) {}

export class GetUserById extends Schema.TaggedRequest<GetUserById>()("GetUserById", Schema.never, User, {
  id: Schema.number
}) {}

export class Person extends Schema.Class<Person>()({
  id: Schema.number,
  name: Schema.string
}) {}

export class GetPersonById extends Schema.TaggedRequest<GetPersonById>()("GetPersonById", Schema.never, Person, {
  id: Schema.number
}) {}

export class InitialMessage
  extends Schema.TaggedRequest<InitialMessage>()("InitialMessage", Schema.never, Schema.void, {
    name: Schema.string
  })
{
  [Transferable.symbol]() {
    return [new Uint8Array([1, 2, 3]).buffer]
  }
}

export class GetSpan extends Schema.TaggedRequest<GetSpan>()(
  "GetSpan",
  Schema.never,
  Schema.struct({
    name: Schema.string,
    traceId: Schema.string,
    spanId: Schema.string,
    parent: Schema.option(Schema.struct({
      traceId: Schema.string,
      spanId: Schema.string
    }))
  }),
  {}
) {}

export const WorkerMessage = Schema.union(GetUserById, GetPersonById, InitialMessage, GetSpan)
export type WorkerMessage = Schema.Schema.To<typeof WorkerMessage>
