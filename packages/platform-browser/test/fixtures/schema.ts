import * as Transferable from "@effect/platform/Transferable"
import * as Schema from "@effect/schema/Schema"

export class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String
}) {}

export class GetUserById extends Schema.TaggedRequest<GetUserById>()("GetUserById", Schema.Never, User, {
  id: Schema.Number
}) {}

export class Person extends Schema.Class<Person>("Person")({
  id: Schema.Number,
  name: Schema.String,
  data: Transferable.Uint8Array
}) {}

export class GetPersonById extends Schema.TaggedRequest<GetPersonById>()("GetPersonById", Schema.Never, Person, {
  id: Schema.Number
}) {}

export class RunnerInterrupt
  extends Schema.TaggedRequest<RunnerInterrupt>()("RunnerInterrupt", Schema.Never, Schema.Void, {})
{}

export class InitialMessage
  extends Schema.TaggedRequest<InitialMessage>()("InitialMessage", Schema.Never, Schema.Void, {
    name: Schema.String,
    data: Transferable.Uint8Array
  })
{}

export class GetSpan extends Schema.TaggedRequest<GetSpan>()(
  "GetSpan",
  Schema.Never,
  Schema.Struct({
    name: Schema.String,
    traceId: Schema.String,
    spanId: Schema.String,
    parent: Schema.Option(Schema.Struct({
      traceId: Schema.String,
      spanId: Schema.String
    }))
  }),
  {}
) {}

export const WorkerMessage = Schema.Union(GetUserById, GetPersonById, InitialMessage, GetSpan, RunnerInterrupt)
export type WorkerMessage = Schema.Schema.Type<typeof WorkerMessage>
