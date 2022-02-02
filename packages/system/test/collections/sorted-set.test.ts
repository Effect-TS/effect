import { Case } from "@effect-ts/system/Case"

import * as SS from "../../src/Collections/Immutable/SortedSet"
import { pipe } from "../../src/Function"
import * as Ord from "../../src/Ord"

class Member extends Case<{ readonly id: string }> {}

describe("SortedSet", () => {
  it("use sortedSet", () => {
    const x = pipe(
      SS.make<Member>(Ord.contramap_(Ord.string, (_) => _.id)),
      SS.add(new Member({ id: "worker_000000" })),
      SS.add(new Member({ id: "worker_000001" })),
      SS.add(new Member({ id: "worker_000001" })),
      SS.add(new Member({ id: "worker_000002" })),
      SS.add(new Member({ id: "worker_000001" })),
      Array.from
    )

    expect(x).toEqual([
      new Member({ id: "worker_000000" }),
      new Member({ id: "worker_000001" }),
      new Member({ id: "worker_000002" })
    ])
  })
})
