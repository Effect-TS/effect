---
"@effect/schema": patch
---

- add `NonEmptyTrimmedString`

  **Example**

  ```ts
  import { Schema } from "@effect/schema"

  console.log(Schema.decodeOption(Schema.NonEmptyTrimmedString)("")) // Option.none()
  console.log(Schema.decodeOption(Schema.NonEmptyTrimmedString)(" a ")) // Option.none()
  console.log(Schema.decodeOption(Schema.NonEmptyTrimmedString)("a")) // Option.some("a")
  ```

- add `OptionFromNonEmptyTrimmedString`, closes #3335

  **Example**

  ```ts
  import { Schema } from "@effect/schema"

  console.log(Schema.decodeSync(Schema.OptionFromNonEmptyTrimmedString)("")) // Option.none()
  console.log(Schema.decodeSync(Schema.OptionFromNonEmptyTrimmedString)(" a ")) // Option.some("a")
  console.log(Schema.decodeSync(Schema.OptionFromNonEmptyTrimmedString)("a")) // Option.some("a")
  ```
