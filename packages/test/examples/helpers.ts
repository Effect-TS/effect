// A custom assertion is a plain function made of other assertions: no registry, no
// matcher API. A failure inside it points at the test's line, and says where it was raised.
import * as Assert from "../src/Assert.ts"

export interface Member {
  readonly name: string
  readonly active: boolean
  readonly roles: ReadonlyArray<string>
}

export const assertActiveAdmin = (member: Member): void => {
  Assert.isTrue(member.active, `${member.name} should be active`)
  Assert.includes(member.roles, "admin")
}
