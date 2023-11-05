---
title: Logger.ts
nav_order: 49
parent: Modules
---

## Logger overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [defaultLogger](#defaultlogger)
  - [logFmt](#logfmt)
  - [logfmtLogger](#logfmtlogger)
  - [make](#make)
  - [none](#none)
  - [simple](#simple)
  - [stringLogger](#stringlogger)
  - [succeed](#succeed)
  - [sync](#sync)
  - [test](#test)
  - [tracerLogger](#tracerlogger)
- [context](#context)
  - [add](#add)
  - [addEffect](#addeffect)
  - [addScoped](#addscoped)
  - [minimumLogLevel](#minimumloglevel)
  - [remove](#remove)
  - [replace](#replace)
  - [replaceEffect](#replaceeffect)
  - [replaceScoped](#replacescoped)
  - [withMinimumLogLevel](#withminimumloglevel)
- [filtering](#filtering)
  - [filterLogLevel](#filterloglevel)
- [mapping](#mapping)
  - [map](#map)
  - [mapInput](#mapinput)
- [models](#models)
  - [Logger (interface)](#logger-interface)
- [symbols](#symbols)
  - [LoggerTypeId](#loggertypeid)
  - [LoggerTypeId (type alias)](#loggertypeid-type-alias)
- [utils](#utils)
  - [Logger (namespace)](#logger-namespace)
    - [Variance (interface)](#variance-interface)
- [zipping](#zipping)
  - [zip](#zip)
  - [zipLeft](#zipleft)
  - [zipRight](#zipright)

---

# constructors

## defaultLogger

**Signature**

```ts
export declare const defaultLogger: Logger<unknown, void>
```

Added in v2.0.0

## logFmt

**Signature**

```ts
export declare const logFmt: Layer<never, never, never>
```

Added in v2.0.0

## logfmtLogger

**Signature**

```ts
export declare const logfmtLogger: Logger<unknown, string>
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: <Message, Output>(
  log: (options: {
    readonly fiberId: FiberId
    readonly logLevel: LogLevel
    readonly message: Message
    readonly cause: Cause<unknown>
    readonly context: FiberRefs
    readonly spans: List<LogSpan>
    readonly annotations: HashMap<string, unknown>
    readonly date: Date
  }) => Output
) => Logger<Message, Output>
```

Added in v2.0.0

## none

A logger that does nothing in response to logging events.

**Signature**

```ts
export declare const none: Logger<unknown, void>
```

Added in v2.0.0

## simple

**Signature**

```ts
export declare const simple: <A, B>(log: (a: A) => B) => Logger<A, B>
```

Added in v2.0.0

## stringLogger

**Signature**

```ts
export declare const stringLogger: Logger<unknown, string>
```

Added in v2.0.0

## succeed

**Signature**

```ts
export declare const succeed: <A>(value: A) => Logger<unknown, A>
```

Added in v2.0.0

## sync

**Signature**

```ts
export declare const sync: <A>(evaluate: LazyArg<A>) => Logger<unknown, A>
```

Added in v2.0.0

## test

**Signature**

```ts
export declare const test: {
  <Message>(input: Message): <Output>(self: Logger<Message, Output>) => Output
  <Message, Output>(self: Logger<Message, Output>, input: Message): Output
}
```

Added in v2.0.0

## tracerLogger

**Signature**

```ts
export declare const tracerLogger: Logger<unknown, void>
```

Added in v2.0.0

# context

## add

**Signature**

```ts
export declare const add: <B>(logger: Logger<unknown, B>) => Layer<never, never, never>
```

Added in v2.0.0

## addEffect

**Signature**

```ts
export declare const addEffect: <R, E, A>(effect: Effect<R, E, Logger<unknown, A>>) => Layer<R, E, never>
```

Added in v2.0.0

## addScoped

**Signature**

```ts
export declare const addScoped: <R, E, A>(
  effect: Effect<R, E, Logger<unknown, A>>
) => Layer<Exclude<R, Scope>, E, never>
```

Added in v2.0.0

## minimumLogLevel

**Signature**

```ts
export declare const minimumLogLevel: (level: LogLevel) => Layer<never, never, never>
```

Added in v2.0.0

## remove

**Signature**

```ts
export declare const remove: <A>(logger: Logger<unknown, A>) => Layer<never, never, never>
```

Added in v2.0.0

## replace

**Signature**

```ts
export declare const replace: {
  <B>(that: Logger<unknown, B>): <A>(self: Logger<unknown, A>) => Layer<never, never, never>
  <A, B>(self: Logger<unknown, A>, that: Logger<unknown, B>): Layer<never, never, never>
}
```

Added in v2.0.0

## replaceEffect

**Signature**

```ts
export declare const replaceEffect: {
  <R, E, B>(that: Effect<R, E, Logger<unknown, B>>): <A>(self: Logger<unknown, A>) => Layer<R, E, never>
  <A, R, E, B>(self: Logger<unknown, A>, that: Effect<R, E, Logger<unknown, B>>): Layer<R, E, never>
}
```

Added in v2.0.0

## replaceScoped

**Signature**

```ts
export declare const replaceScoped: {
  <R, E, B>(
    that: Effect<R, E, Logger<unknown, B>>
  ): <A>(self: Logger<unknown, A>) => Layer<Exclude<R, Scope>, E, never>
  <A, R, E, B>(
    self: Logger<unknown, A>,
    that: Effect<R, E, Logger<unknown, B>>
  ): Layer<Exclude<R, Scope>, E, never>
}
```

Added in v2.0.0

## withMinimumLogLevel

**Signature**

```ts
export declare const withMinimumLogLevel: {
  (level: LogLevel): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, level: LogLevel): Effect<R, E, A>
}
```

Added in v2.0.0

# filtering

## filterLogLevel

Returns a version of this logger that only logs messages when the log level
satisfies the specified predicate.

**Signature**

```ts
export declare const filterLogLevel: {
  (
    f: (logLevel: LogLevel) => boolean
  ): <Message, Output>(self: Logger<Message, Output>) => Logger<Message, Option<Output>>
  <Message, Output>(
    self: Logger<Message, Output>,
    f: (logLevel: LogLevel) => boolean
  ): Logger<Message, Option<Output>>
}
```

Added in v2.0.0

# mapping

## map

**Signature**

```ts
export declare const map: {
  <Output, Output2>(
    f: (output: Output) => Output2
  ): <Message>(self: Logger<Message, Output>) => Logger<Message, Output2>
  <Message, Output, Output2>(self: Logger<Message, Output>, f: (output: Output) => Output2): Logger<Message, Output2>
}
```

Added in v2.0.0

## mapInput

**Signature**

```ts
export declare const mapInput: {
  <Message, Message2>(
    f: (message: Message2) => Message
  ): <Output>(self: Logger<Message, Output>) => Logger<Message2, Output>
  <Output, Message, Message2>(
    self: Logger<Message, Output>,
    f: (message: Message2) => Message
  ): Logger<Message2, Output>
}
```

Added in v2.0.0

# models

## Logger (interface)

**Signature**

```ts
export interface Logger<Message, Output> extends Logger.Variance<Message, Output>, Pipeable {
  readonly log: (options: {
    readonly fiberId: FiberId
    readonly logLevel: LogLevel
    readonly message: Message
    readonly cause: Cause<unknown>
    readonly context: FiberRefs
    readonly spans: List<LogSpan>
    readonly annotations: HashMap<string, unknown>
    readonly date: Date
  }) => Output
}
```

Added in v2.0.0

# symbols

## LoggerTypeId

**Signature**

```ts
export declare const LoggerTypeId: typeof LoggerTypeId
```

Added in v2.0.0

## LoggerTypeId (type alias)

**Signature**

```ts
export type LoggerTypeId = typeof LoggerTypeId
```

Added in v2.0.0

# utils

## Logger (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<Message, Output> {
  readonly [LoggerTypeId]: {
    readonly _Message: (_: Message) => void
    readonly _Output: (_: never) => Output
  }
}
```

Added in v2.0.0

# zipping

## zip

Combines this logger with the specified logger to produce a new logger that
logs to both this logger and that logger.

**Signature**

```ts
export declare const zip: {
  <Message2, Output2>(
    that: Logger<Message2, Output2>
  ): <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message2, [Output, Output2]>
  <Message, Output, Message2, Output2>(
    self: Logger<Message, Output>,
    that: Logger<Message2, Output2>
  ): Logger<Message & Message2, [Output, Output2]>
}
```

Added in v2.0.0

## zipLeft

**Signature**

```ts
export declare const zipLeft: {
  <Message2, Output2>(
    that: Logger<Message2, Output2>
  ): <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message2, Output>
  <Message, Output, Message2, Output2>(
    self: Logger<Message, Output>,
    that: Logger<Message2, Output2>
  ): Logger<Message & Message2, Output>
}
```

Added in v2.0.0

## zipRight

**Signature**

```ts
export declare const zipRight: {
  <Message2, Output2>(
    that: Logger<Message2, Output2>
  ): <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message2, Output2>
  <Message, Output, Message2, Output2>(
    self: Logger<Message, Output>,
    that: Logger<Message2, Output2>
  ): Logger<Message & Message2, Output2>
}
```

Added in v2.0.0
