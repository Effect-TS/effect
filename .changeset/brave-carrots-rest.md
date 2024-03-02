---
"effect": patch
---

Add Effect.Tag to simplify access to service.

This change allows to define tags in the following way:

```ts
class DemoTag extends Effect.Tag("DemoTag")<
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

Additionally it allows using the service like:

```ts
DemoTag.use((_) => _.getNumbers());
```

This is especially useful when having functions that contain generics in the service given that those can't be reliably transformed at the type level and because of that we can't put them on the tag.
