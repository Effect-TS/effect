import * as Transferable from "@effect/platform/Transferable"
import * as Schema from "@effect/schema/Schema"

export class User extends Schema.Class<User>("User")({
  id: Schema.number,
  name: Schema.string
}) {}

export class GetUserById extends Schema.TaggedRequest<GetUserById>()("GetUserById", Schema.never, User, {
  id: Schema.number
}) {}

export class Person extends Schema.Class<Person>("Person")({
  id: Schema.number,
  name: Schema.string,
  data: Transferable.Uint8Array
}) {}

export class GetPersonById extends Schema.TaggedRequest<GetPersonById>()("GetPersonById", Schema.never, Person, {
  id: Schema.number
}) {}

export class InitialMessage
  extends Schema.TaggedRequest<InitialMessage>()("InitialMessage", Schema.never, Schema.void, {
    name: Schema.string,
    data: Transferable.Uint8Array
  })
{}

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
export type WorkerMessage = Schema.Schema.Type<typeof WorkerMessage>
