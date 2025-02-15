import { Data, Equal, Hash } from "effect"

export class MyClass extends Data.TaggedClass("mytag")<{}> {
  // should support `Hash.symbol` as method
  [Hash.symbol]() {
    return 0
  }
  // should support `Equal.symbol` as method
  [Equal.symbol]() {
    return false
  }
}
