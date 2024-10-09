---
"effect": major
---

Use object options for Stream.async apis

Instead of:

```ts
Stream.async((emit) => {
  //...
}, 16);
```

You can now write:

```ts
Stream.async(
  (emit) => {
    //...
  },
  { bufferSize: 16 },
);
```
