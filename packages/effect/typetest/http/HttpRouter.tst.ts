import { Context, Effect, Layer } from "effect"
import { HttpRouter, type HttpServerError, HttpServerResponse } from "effect/http"
import { describe, expect, it } from "tstyche"

describe("HttpRouter", () => {
  describe("router ownership", () => {
    it("does not expose reusable router constructors", () => {
      expect<typeof HttpRouter>().type.not.toHaveProperty("layer")
      expect<typeof HttpRouter>().type.not.toHaveProperty("make")
    })

    it("does not accept app layers that output HttpRouter", () => {
      const app = Layer.succeed(HttpRouter.HttpRouter, {} as HttpRouter.HttpRouter)

      // @ts-expect-error remove it from the app layer
      void HttpRouter.serve(app)
      // @ts-expect-error remove it from the app layer
      void HttpRouter.toWebHandler(app)
      // @ts-expect-error remove it from the app layer
      void HttpRouter.toHttpEffect(app)
    })

    it("accepts app layers with any output", () => {
      const app = {} as Layer.Layer<any, never, never>
      expect(HttpRouter.serve).type.toBeCallableWith(app)
      expect(HttpRouter.toWebHandler).type.toBeCallableWith(app)
      expect(HttpRouter.toHttpEffect).type.toBeCallableWith(app)
    })

    it("rejects app layers with unknown output", () => {
      const app = {} as Layer.Layer<unknown>
      // @ts-expect-error remove it from the app layer
      void HttpRouter.serve(app)
      // @ts-expect-error remove it from the app layer
      void HttpRouter.toWebHandler(app)
      // @ts-expect-error remove it from the app layer
      void HttpRouter.toHttpEffect(app)
    })

    it("accepts a narrowed generic wrapper", () => {
      const serve = <E>(app: Layer.Layer<never, E, HttpRouter.HttpRouter>) => HttpRouter.serve(app)
      expect(serve).type.toBeCallableWith(Layer.empty as Layer.Layer<never, never, HttpRouter.HttpRouter>)
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
