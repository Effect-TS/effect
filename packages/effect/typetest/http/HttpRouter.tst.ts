import { Context, Effect, Layer } from "effect"
import { HttpRouter, type HttpServerError, HttpServerResponse } from "effect/http"
import { describe, expect, it } from "tstyche"

describe("HttpRouter", () => {
  describe("router ownership", () => {
    it("exposes make but not the reusable router layer", () => {
      expect<typeof HttpRouter>().type.not.toHaveProperty("layer")
      expect<Effect.Success<typeof HttpRouter.make>>().type.toBe<HttpRouter.HttpRouter>()
    })

    it("accepts unconstrained app outputs", () => {
      const serve = <A, E>(app: Layer.Layer<A, E, HttpRouter.HttpRouter>) => HttpRouter.serve(app)
      expect(serve).type.toBeCallableWith(Layer.empty)
    })

    it("omits the router output while preserving other services", () => {
      class SomeService extends Context.Service<SomeService, { readonly value: number }>()("SomeService") {}

      const app = Layer.merge(
        Layer.effect(HttpRouter.HttpRouter, HttpRouter.make),
        Layer.succeed(SomeService, { value: 1 })
      )
      const served = HttpRouter.serve(app)

      expect<Layer.Success<typeof served>>().type.toBe<SomeService>()
    })
  })

  describe("middleware", () => {
    it("provides handled request errors", () => {
      class MyError {
        readonly _tag = "MyError"
      }

      const middleware = HttpRouter.middleware<{ handles: MyError }>()((effect) =>
        effect.pipe(Effect.catchTag("MyError", Effect.die))
      )

      expect<Layer.Success<typeof middleware.layer>>().type
        .toBeAssignableFrom<HttpRouter.Request<"Error", MyError>>()
    })
  })

  describe("toHttpEffect", () => {
    it("includes errors from global middleware", () => {
      class MyError {
        readonly _tag = "MyError"
      }

      const globalMiddleware = HttpRouter.middleware(
        (effect) => Effect.andThen(effect, Effect.fail(new MyError())),
        { global: true }
      )
      const result = HttpRouter.toHttpEffect(globalMiddleware)

      expect<Effect.Error<Effect.Success<typeof result>>>().type
        .toBe<MyError | HttpServerError.HttpServerError>()
    })
  })

  describe("toWebHandler", () => {
    it("excludes adapter services required by middleware from the request context", () => {
      class CurrentUser extends Context.Service<CurrentUser, { readonly id: string }>()("CurrentUser") {}

      const app = HttpRouter.add(
        "GET",
        "/",
        Effect.gen(function*() {
          const user = yield* CurrentUser
          return HttpServerResponse.text(user.id)
        })
      )
      const { handler } = HttpRouter.toWebHandler(app, {
        disableLogger: true,
        middleware: (effect) => effect
      })

      expect(handler).type.toBe<
        (request: Request, context: Context.Context<CurrentUser>) => Promise<Response>
      >()
      expect(handler).type.toBeCallableWith(
        new Request("http://localhost/"),
        Context.make(CurrentUser, { id: "user-1" })
      )
    })

    it("excludes services provided by the application layer from the request context", () => {
      class CurrentUser extends Context.Service<CurrentUser, { readonly id: string }>()("CurrentUser") {}

      const app = Layer.merge(
        HttpRouter.add(
          "GET",
          "/",
          Effect.map(CurrentUser, (user) => HttpServerResponse.text(user.id))
        ),
        Layer.succeed(CurrentUser, { id: "user-1" })
      )
      const { handler } = HttpRouter.toWebHandler(app, {
        disableLogger: true,
        middleware: (effect) => effect
      })

      expect(handler).type.toBe<
        (request: Request, context?: Context.Context<never> | undefined) => Promise<Response>
      >()
      expect(handler).type.toBeCallableWith(new Request("http://localhost/"))
    })
  })
})
