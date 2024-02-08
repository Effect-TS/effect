import * as Rpc from "@effect/rpc/Rpc"
import * as S from "@effect/schema/Schema"
import { pipe } from "effect/Function"

export const UserId = pipe(S.number, S.int(), S.brand("UserId"))
export type UserId = S.Schema.To<typeof UserId>

export class User extends S.Class<User>()({
  id: UserId,
  name: S.string
}) {}

export class GetUserIds extends Rpc.StreamRequest<GetUserIds>()("GetUserIds", S.never, UserId, {}) {}
export class GetUser extends S.TaggedRequest<GetUser>()("GetUser", S.never, User, {
  id: UserId
}) {}
