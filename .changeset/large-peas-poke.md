---
"@effect/schema": minor
---

- Schema: change type parameters order from `Schema<R, I, A>` to `Schema<A, I = A, R = never>`
- Serializable: change type parameters order from `Serializable<R, I, A>` to `Serializable<A, I, R>`
- Class: change type parameters order from `Class<R, I, A, C, Self, Inherited>` to `Class<A, I, R, C, Self, Inherited>`
- PropertySignature: change type parameters order from `PropertySignature<R, From, FromIsOptional, To, ToIsOptional>` to `PropertySignature<From, FromIsOptional, To, ToIsOptional, R = never>`
