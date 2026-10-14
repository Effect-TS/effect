import { describe, expect, it } from "tstyche"
import type {
  EventOther,
  Member,
  MemberJoined,
  MessagePosted,
  Room,
  RoomEvents,
  RoomRenamed,
  RoomRoom
} from "../test/generated/subscriptions/rooms.graphql.ts"

describe("generated selections", () => {
  it("name the decoded type of their schema", () => {
    expect<RoomRoom>().type.toBe<typeof RoomRoom.Type>()
    expect<Member>().type.toBe<typeof Member.Type>()
    expect<MemberJoined>().type.toBe<typeof MemberJoined.Type>()
  })

  it("make up the result types of the operations", () => {
    expect<Room.Result>().type.toBe<{ readonly room: RoomRoom | null }>()
    expect<RoomEvents.Result>().type.toBe<
      { readonly events: MemberJoined | MessagePosted | RoomRenamed | EventOther }
    >()
  })
})
