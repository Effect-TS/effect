---
"effect": patch
---

Made field-less `Schema.Struct({})` respect `onExcessProperty: 'ignore' | 'preserve' | 'error'`

Motivation: you remove one field, the resulting object gets fewer fields. You
remove another, fewer again. You remove the last; suddenly all the fields come
back, without respect to the default `onExcessProperty: "ignore"`. If the user
wanted to get all the fields, they have an option to set
`onExcessProperty: "preserve"`.

I tried attempting to defend old behavior with "`{}` means
`typeof obj === 'object' && obj !== null` and effect's schema tries to be
closer to typescript's behaviour, by treating `Schema.Struct({})` as something
passing the condition". And this might hold in isolation. But considering the
context, by this logic, any fields which are not explicitly mentioned in
`Schema.Struct({ ... })` should be preserved in all decoded objects, not only
the ones that have `{}` signature, to follow typescript's assignability rules.
And this is not what happens. The behavior should be consistent between
field-less structs and field-ful.

```ts
const arg = { hello: "asd", redundant: "asd" }
function fn(param: { hello: string }) {}
fn(arg)
```

New behavior

```ts
import * as Schema from "effect/Schema"

const Something = Schema.Struct({})
const decodeSomething = Schema.decodeSync(Something)

const obj = { hello: "stripped by default, unless asked otherwise" }

console.log(decodeSomething(obj))
// {}

console.log(decodeSomething(obj, { onExcessProperty: "ignore" }))
// {}

console.log(decodeSomething(obj, { onExcessProperty: "preserve" }))
// { hello: "stripped by default, unless asked otherwise" }

decodeSomething(obj, { onExcessProperty: "error" })
// error: Unexpected key with value "stripped by default, unless asked otherwise"
//   at ["hello"]
```

Old behavior:

```ts
import * as Schema from "effect/Schema"

const Something = Schema.Struct({})
const decodeSomething = Schema.decodeSync(Something)

const obj = { hello: "stripped by default, unless asked otherwise" }

console.log(decodeSomething(obj))
// { hello: 'stripped by default, unless asked otherwise' }

console.log(decodeSomething(obj, { onExcessProperty: "ignore" }))
// { hello: 'stripped by default, unless asked otherwise' }

console.log(decodeSomething(obj, { onExcessProperty: "preserve" }))
// { hello: "stripped by default, unless asked otherwise" }

decodeSomething(obj, { onExcessProperty: "error" })
// doesn't throw
```
