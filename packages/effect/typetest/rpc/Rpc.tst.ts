import { Context, Schema } from "effect"
import * as Rpc from "effect/rpc/Rpc"
import * as RpcMiddleware from "effect/rpc/RpcMiddleware"
import { describe, expect, it } from "tstyche"

class CurrentUser extends Context.Service<CurrentUser, { id: string }>()("CurrentUser") {}
class DbConnection extends Context.Service<DbConnection, { url: string }>()("DbConnection") {}

class AuthMiddleware extends RpcMiddleware.Service<AuthMiddleware, {
  provides: CurrentUser
}>()("AuthMiddleware", {
  error: Schema.Never,
  requiredForClient: undefined
}) {}

class DbMiddleware extends RpcMiddleware.Service<DbMiddleware, {
  provides: DbConnection
  requires: CurrentUser
}>()("DbMiddleware", {
  error: Schema.Never,
  requiredForClient: undefined
}) {}

const GetUser = Rpc.make("GetUser", { success: Schema.String })
const StreamEvents = Rpc.make("StreamEvents", { success: Schema.String, stream: true })
const AuthedStream = Rpc.make("AuthedStream", { success: Schema.String, stream: true })
  .middleware(AuthMiddleware)
const AuthedGetUser = Rpc.make("AuthedGetUser", { success: Schema.String })
  .middleware(AuthMiddleware)
const MultiMiddleware = Rpc.make("MultiMiddleware", { success: Schema.String, stream: true })
  .middleware(AuthMiddleware)
  .middleware(DbMiddleware)
const Fails = Rpc.make("Fails", { success: Schema.Never, error: Schema.String })

type Mixed = typeof GetUser | typeof StreamEvents
type MixedWithMiddleware = typeof GetUser | typeof AuthedStream

describe("Rpc", () => {
  describe("IsStream", () => {
    it("returns true for stream RPCs in a mixed group", () => {
      expect<Rpc.IsStream<Mixed, "StreamEvents">>().type.toBe<true>()
    })

    it("returns never for non-stream RPCs in a mixed group", () => {
      expect<Rpc.IsStream<Mixed, "GetUser">>().type.toBe<never>()
    })
  })

  describe("ExtractProvides", () => {
    it("extracts provided service from stream RPC with middleware", () => {
      expect<Rpc.ExtractProvides<typeof AuthedStream, "AuthedStream">>().type.toBe<CurrentUser>()
    })

    it("extracts provided service from non-stream RPC with middleware", () => {
      expect<Rpc.ExtractProvides<typeof AuthedGetUser, "AuthedGetUser">>().type.toBe<CurrentUser>()
    })

    it("returns never for RPC without middleware", () => {
      expect<Rpc.ExtractProvides<typeof GetUser, "GetUser">>().type.toBe<never>()
    })

    it("extracts union of provides from multiple middlewares", () => {
      expect<Rpc.ExtractProvides<typeof MultiMiddleware, "MultiMiddleware">>()
        .type.toBe<CurrentUser | DbConnection>()
    })

    it("works in a mixed group", () => {
      expect<Rpc.ExtractProvides<MixedWithMiddleware, "AuthedStream">>().type.toBe<CurrentUser>()
    })

    it("returns never for non-middleware RPC in mixed group", () => {
      expect<Rpc.ExtractProvides<MixedWithMiddleware, "GetUser">>().type.toBe<never>()
    })
  })

  describe("SuccessChunk", () => {
    it("extracts stream elements from a mixed group", () => {
      expect<Rpc.SuccessChunk<Mixed>>().type.toBe<string>()
    })

    it("ignores never-returning RPCs in a group", () => {
      expect<Rpc.SuccessChunk<typeof StreamEvents | typeof Fails>>().type.toBe<string>()
    })
  })

  describe("ExtractTag", () => {
    it("selects every RPC matching a union of tags", () => {
      expect<Rpc.ExtractTag<Mixed | typeof Fails, "GetUser" | "Fails">>().type.toBe<typeof GetUser | typeof Fails>()
    })

    it("selects every RPC for a string tag", () => {
      expect<Rpc.ExtractTag<Mixed, string>>().type.toBe<Mixed>()
    })

    it("returns never for an unknown tag", () => {
      expect<Rpc.ExtractTag<Mixed, "Missing">>().type.toBe<never>()
    })

    describe("with broad RPC tags", () => {
      const Dynamic = Rpc.make("Dynamic" as string, { success: Schema.Number })
      const Pattern = Rpc.make("GetAny" as `Get${string}`, { success: Schema.Boolean })
      const Specific = Rpc.make("GetSpecific", { success: Schema.String })

      it("keeps literal RPCs matched by a broad tag", () => {
        expect<Rpc.ExtractTag<typeof Dynamic | typeof Specific, string>>().type.toBe<
          typeof Dynamic | typeof Specific
        >()
        expect<Rpc.ExtractTag<typeof Pattern | typeof Specific, `Get${string}`>>().type.toBe<
          typeof Pattern | typeof Specific
        >()
      })

      it("selects only the literal RPC for its literal tag", () => {
        expect<Rpc.ExtractTag<typeof Dynamic | typeof Specific, "GetSpecific">>().type.toBe<typeof Specific>()
        expect<Rpc.ExtractTag<typeof Pattern | typeof Specific, "GetSpecific">>().type.toBe<typeof Specific>()
      })
    })
  })
})
