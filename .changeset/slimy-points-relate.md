---
"@effect/platform": minor
---

Add `requires` support to `HttpApiMiddleware.Tag` to allow middlewares to depend on other middleware outputs.

Details

- New option: `requires?: Context.Tag | ReadonlyArray<Context.Tag>` when defining a middleware tag.

Example

```
export class AdminUser extends HttpApiMiddleware.Tag<AdminUser>()("Http/Admin", {
  failure: HttpApiError.Forbidden,
  requires: CurrentUser // or: [CurrentUser, Session]
}) {}

// Inside the middleware implementation you can now safely use the required services
yield* CurrentUser
```
