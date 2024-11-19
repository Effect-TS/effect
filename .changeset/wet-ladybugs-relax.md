---
"effect": patch
---

Remove `Omit` from the `Class` interface definition to align type signatures with runtime behavior. This fix addresses the issue of being unable to override base class methods in extended classes without encountering type errors, closes #3958

Before

```ts
import { Schema } from "effect"

class Base extends Schema.Class<Base>("Base")({
  a: Schema.String
}) {
  f() {
    console.log("base")
  }
}

class Extended extends Base.extend<Extended>("Extended")({}) {
  // Class '{ readonly a: string; } & Omit<Base, "a">' defines instance member property 'f',
  // but extended class 'Extended' defines it as instance member function.ts(2425)
  // @ts-expect-error
  override f() {
    console.log("extended")
  }
}
```

After

```ts
import { Schema } from "effect"

class Base extends Schema.Class<Base>("Base")({
  a: Schema.String
}) {
  f() {
    console.log("base")
  }
}

class Extended extends Base.extend<Extended>("Extended")({}) {
  // ok
  override f() {
    console.log("extended")
  }
}
```
