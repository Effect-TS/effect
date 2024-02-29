---
"@effect/platform": patch
---

add option to include prefix when mounting an http app to a router

By default the prefix is removed. For example:

```ts
// Here a request to `/child/hello` will be mapped to `/hello`
Http.router.mountApp("/child", httpApp);

// Here a request to `/child/hello` will be mapped to `/child/hello`
Http.router.mountApp("/child", httpApp, { includePrefix: true });
```
