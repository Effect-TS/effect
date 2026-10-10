import { Context, Schema } from "effect"
import { GraphQLMiddleware } from "effect/graphql"
import { describe, expect, it } from "tstyche"

class CurrentUser extends Context.Service<CurrentUser, { readonly id: string }>()("CurrentUser") {}
class TokenExpired extends Schema.TaggedError<TokenExpired>()("TokenExpired", { user: Schema.String }) {}

class Auth extends GraphQLMiddleware.Service<Auth, { requires: CurrentUser; error: TokenExpired }>()("Auth") {}
class Log extends GraphQLMiddleware.Service<Log>()("Log") {}

describe("GraphQLMiddleware", () => {
  it("Requires and Error extract the declared config", () => {
    expect<GraphQLMiddleware.Requires<Auth>>().type.toBe<CurrentUser>()
    expect<GraphQLMiddleware.Error<Auth>>().type.toBe<TokenExpired>()
  })

  it("Requires and Error are never when nothing is declared", () => {
    expect<GraphQLMiddleware.Requires<Log>>().type.toBe<never>()
    expect<GraphQLMiddleware.Error<Log>>().type.toBe<never>()
  })
})
