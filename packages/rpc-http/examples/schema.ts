import { Handler } from "@effect/platform"
import * as S from "@effect/schema/Schema"
import { pipe } from "effect/Function"

export const UserId = pipe(S.Number, S.int(), S.brand("UserId"))
export type UserId = S.Schema.Type<typeof UserId>

export class User extends S.Class<User>("User")({
  id: UserId,
  name: S.String
}) {}

export class GetUserIds extends Handler.StreamRequest<GetUserIds>()("GetUserIds", S.Never, UserId, {}) {}
export class GetUser extends S.TaggedRequest<GetUser>()("GetUser", S.Never, User, {
  id: UserId
}) {}
