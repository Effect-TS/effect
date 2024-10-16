import * as Transferable from "@effect/platform/Transferable"
import * as Schema from "effect/Schema"

export class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String
}) {}

export class GetUserById extends Schema.TaggedRequest<GetUserById>()("GetUserById", {
  failure: Schema.Never,
  success: User,
  payload: {
    id: Schema.Number
  }
}) {}

export class Person extends Schema.Class<Person>("Person")({
  id: Schema.Number,
  name: Schema.String,
  data: Transferable.Uint8Array
}) {}

export class GetPersonById extends Schema.TaggedRequest<GetPersonById>()("GetPersonById", {
  failure: Schema.Never,
  success: Person,
  payload: {
    id: Schema.Number
  }
}) {}

export class RunnerInterrupt extends Schema.TaggedRequest<RunnerInterrupt>()("RunnerInterrupt", {
  failure: Schema.Never,
  success: Schema.Void,
  payload: {}
}) {}

export class InitialMessage extends Schema.TaggedRequest<InitialMessage>()("InitialMessage", {
  failure: Schema.Never,
  success: Schema.Void,
  payload: {
    name: Schema.String,
    data: Transferable.Uint8Array
  }
}) {}

export class GetSpan extends Schema.TaggedRequest<GetSpan>()(
  "GetSpan",
  {
    failure: Schema.Never,
    success: Schema.Struct({
      name: Schema.String,
      traceId: Schema.String,
      spanId: Schema.String,
      parent: Schema.Option(Schema.Struct({
        traceId: Schema.String,
        spanId: Schema.String
      }))
    }),
    payload: {}
  }
) {}

export const WorkerMessage = Schema.Union(GetUserById, GetPersonById, InitialMessage, GetSpan, RunnerInterrupt)
export type WorkerMessage = Schema.Schema.Type<typeof WorkerMessage>
