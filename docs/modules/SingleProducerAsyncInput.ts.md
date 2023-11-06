---
title: SingleProducerAsyncInput.ts
nav_order: 102
parent: Modules
---

## SingleProducerAsyncInput overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [models](#models)
  - [AsyncInputConsumer (interface)](#asyncinputconsumer-interface)
  - [AsyncInputProducer (interface)](#asyncinputproducer-interface)
  - [SingleProducerAsyncInput (interface)](#singleproducerasyncinput-interface)

---

# constructors

## make

**Signature**

```ts
export declare const make: <Err, Elem, Done>() => Effect<never, never, SingleProducerAsyncInput<Err, Elem, Done>>
```

Added in v2.0.0

# models

## AsyncInputConsumer (interface)

Consumer-side view of `SingleProducerAsyncInput` for variance purposes.

**Signature**

```ts
export interface AsyncInputConsumer<Err, Elem, Done> {
  takeWith<A>(
    onError: (cause: Cause<Err>) => A,
    onElement: (element: Elem) => A,
    onDone: (value: Done) => A
  ): Effect<never, never, A>
}
```

Added in v2.0.0

## AsyncInputProducer (interface)

Producer-side view of `SingleProducerAsyncInput` for variance purposes.

**Signature**

```ts
export interface AsyncInputProducer<Err, Elem, Done> {
  awaitRead(): Effect<never, never, unknown>
  done(value: Done): Effect<never, never, unknown>
  emit(element: Elem): Effect<never, never, unknown>
  error(cause: Cause<Err>): Effect<never, never, unknown>
}
```

Added in v2.0.0

## SingleProducerAsyncInput (interface)

An MVar-like abstraction for sending data to channels asynchronously which is
designed for one producer and multiple consumers.

Features the following semantics:

- Buffer of size 1.
- When emitting, the producer waits for a consumer to pick up the value to
  prevent "reading ahead" too much.
- Once an emitted element is read by a consumer, it is cleared from the
  buffer, so that at most one consumer sees every emitted element.
- When sending a done or error signal, the producer does not wait for a
  consumer to pick up the signal. The signal stays in the buffer after
  being read by a consumer, so it can be propagated to multiple consumers.
- Trying to publish another emit/error/done after an error/done have
  already been published results in an interruption.

**Signature**

```ts
export interface SingleProducerAsyncInput<Err, Elem, Done>
  extends AsyncInputProducer<Err, Elem, Done>,
    AsyncInputConsumer<Err, Elem, Done> {
  close(): Effect<never, never, unknown>
  take(): Effect<never, never, Exit<Either<Err, Done>, Elem>>
}
```

Added in v2.0.0
