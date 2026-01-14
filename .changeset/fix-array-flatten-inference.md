---
"effect": patch
---

Fix type inference loss in `Array.flatten` for complex nested structures like unions of Effects with contravariant requirements. Uses distributive indexed access (`T[number][number]`) in the `Flatten` type utility and adds `const` to the `flatten` generic parameter.
