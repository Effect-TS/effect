import { Email, OAuth } from "@effect/auth"
import { assert, it } from "@effect/vitest"
import { type Context, Effect, type Layer, type Unify } from "effect"

// Shared-domain task: exact return authority is independent of cookie/CSRF admission.
const checkReturnTargets = <I, E, Rejected>(
  service:
    & Omit<
      Context.Key<
        I,
        {
          readonly resolve: (input: string) => Effect.Effect<string, Rejected>
        }
      >,
      typeof Unify.unifySymbol
    >
    & {
      readonly exactRoutes: (
        routes: ReadonlyArray<string>,
        options?: { readonly trustedOrigins: ReadonlyArray<string> }
      ) => Layer.Layer<I, E>
    }
) => {
  it.effect(`${service.key} admits only exact routes on explicitly trusted origins`, () =>
    Effect.gen(function*() {
      const resolve = Effect.fnUntraced(
        function*(input: string) {
          const targets = yield* service

          return yield* targets.resolve(input)
        },
        Effect.provide(
          service.exactRoutes(["/", "https://agent.example.com/browser-use/"], {
            trustedOrigins: ["https://agent.example.com"]
          })
        )
      )

      assert.strictEqual(yield* resolve("/"), "/")
      assert.strictEqual(
        yield* resolve("https://agent.example.com/browser-use/"),
        "https://agent.example.com/browser-use/"
      )
      for (
        const target of [
          "https://evil.example.com/browser-use/",
          "https://agent.example.com/browser-use/child",
          "https://agent.example.com/browser-use/?next=https://evil.com",
          "//evil.com/",
          "https://agent.example.com/browser-use/#fragment"
        ]
      ) {
        assert.strictEqual((yield* resolve(target).pipe(Effect.result))._tag, "Failure")
      }
    }))
  it.effect(`${service.key} refuses an untrusted configured return origin`, () =>
    Effect.gen(function*() {
      const result = yield* Effect.gen(function*() {
        return yield* service
      }).pipe(
        Effect.provide(
          service.exactRoutes(["https://evil.example.com/"], {
            trustedOrigins: ["https://agent.example.com"]
          })
        ),
        Effect.result
      )

      assert.strictEqual(result._tag, "Failure")
    }))
}

checkReturnTargets(Email.EmailReturnTargets)
checkReturnTargets(OAuth.OAuthReturnTargets)
