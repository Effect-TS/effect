import * as Effect from "@effect/io/Effect"
import * as PR from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe("dev", () => {
  it.skip("tmp", async () => {
    const User = S.struct({ name: S.string })

    const UserFromString = S.transformOrFail(
      S.string,
      User,
      (str) => {
        return Effect.try({
          try: () => JSON.parse(str) as unknown,
          catch: () => PR.parseError([PR.missing])
        }).pipe(Effect.flatMap(S.parse(User)))
      },
      (user) => {
        return Effect.try({
          try: () => JSON.stringify(user),
          catch: () => PR.parseError([PR.missing])
        })
      }
    )

    // const UserFromString2 = S.transformOrFail(
    //   S.string,
    //   User,
    //   (str) => {
    //     try {
    //       return S.parseResult(User)(JSON.parse(str))
    //     } catch (e) {
    //       return PR.fail(PR.parseError([PR.missing]))
    //     }
    //   },
    //   (user) => {
    //     try {
    //       return PR.success(JSON.stringify(user))
    //     } catch (e) {
    //       return PR.fail(PR.parseError([PR.missing]))
    //     }
    //   }
    // )
    await Util.expectParseSuccess(UserFromString, JSON.stringify({ name: "steve" }), {
      name: "steve"
    })
  })
})
