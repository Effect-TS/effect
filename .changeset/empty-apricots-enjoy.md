---
"@effect/schema": patch
---

Add `make` constructor to `Class`-based APIs, closes #3042

Introduced a `make` constructor to class-based APIs to facilitate easier instantiation of classes. This method allows developers to create instances of a class without directly using the `new` keyword.

**Example**

```ts
import { Schema } from "@effect/schema"

class MyClass extends Schema.Class<MyClass>("MyClass")({
  someField: Schema.String
}) {
  someMethod() {
    return this.someField + "bar"
  }
}

// Create an instance of MyClass using the make constructor
const instance = MyClass.make({ someField: "foo" }) // same as new MyClass({ someField: "foo" })

// Outputs to console to demonstrate that the instance is correctly created
console.log(instance instanceof MyClass) // true
console.log(instance.someField) // "foo"
console.log(instance.someMethod()) // "foobar"
```
