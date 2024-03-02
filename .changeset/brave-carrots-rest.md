---
"effect": patch
---

Add Effect.AccessTag to simplify access to service.

This change allows to define tags in the following mannar:

```ts
class DemoTag extends Effect.AccessTag("DemoTag")<
  DemoTag,
  {
    readonly getNumbers: () => Array<number>;
    readonly strings: Array<string>;
  }
>() {}
```

And use them like:

```ts
DemoTag.getNumbers();
DemoTag.strings;
```

This fuses together `serviceFunctions` and `serviceConstants` in the static side of the tag.
