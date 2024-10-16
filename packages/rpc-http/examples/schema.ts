import * as Rpc from "@effect/rpc/Rpc"
import { pipe } from "effect/Function"
import * as S from "effect/Schema"

export const UserId = pipe(S.Number, S.int(), S.brand("UserId"))
export type UserId = S.Schema.Type<typeof UserId>

export class User extends S.Class<User>("User")({
  id: UserId,
  name: S.String
}) {}

export class GetUserIds
  extends Rpc.StreamRequest<GetUserIds>()("GetUserIds", { failure: S.Never, success: UserId, payload: {} })
{}
export class GetUser extends S.TaggedRequest<GetUser>()("GetUser", {
  failure: S.Never,
  success: User,
  payload: {
    id: UserId
  }
}) {}
