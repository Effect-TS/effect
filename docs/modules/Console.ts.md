---
title: Console.ts
nav_order: 16
parent: Modules
---

## Console overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [accessor](#accessor)
  - [assert](#assert)
  - [clear](#clear)
  - [consoleWith](#consolewith)
  - [count](#count)
  - [countReset](#countreset)
  - [debug](#debug)
  - [dir](#dir)
  - [dirxml](#dirxml)
  - [error](#error)
  - [group](#group)
  - [info](#info)
  - [log](#log)
  - [table](#table)
  - [time](#time)
  - [timeLog](#timelog)
  - [trace](#trace)
  - [warn](#warn)
  - [withGroup](#withgroup)
  - [withTime](#withtime)
- [default services](#default-services)
  - [setConsole](#setconsole)
  - [withConsole](#withconsole)
- [model](#model)
  - [Console (interface)](#console-interface)
  - [UnsafeConsole (interface)](#unsafeconsole-interface)
- [type ids](#type-ids)
  - [TypeId](#typeid)
  - [TypeId (type alias)](#typeid-type-alias)

---

# accessor

## assert

**Signature**

```ts
export declare const assert: (condition: boolean, ...args: ReadonlyArray<any>) => Effect<never, never, void>
```

Added in v2.0.0

## clear

**Signature**

```ts
export declare const clear: Effect<never, never, void>
```

Added in v2.0.0

## consoleWith

**Signature**

```ts
export declare const consoleWith: <R, E, A>(f: (console: Console) => Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## count

**Signature**

```ts
export declare const count: (label?: string) => Effect<never, never, void>
```

Added in v2.0.0

## countReset

**Signature**

```ts
export declare const countReset: (label?: string) => Effect<never, never, void>
```

Added in v2.0.0

## debug

**Signature**

```ts
export declare const debug: (...args: ReadonlyArray<any>) => Effect<never, never, void>
```

Added in v2.0.0

## dir

**Signature**

```ts
export declare const dir: (item: any, options?: any) => Effect<never, never, void>
```

Added in v2.0.0

## dirxml

**Signature**

```ts
export declare const dirxml: (...args: ReadonlyArray<any>) => Effect<never, never, void>
```

Added in v2.0.0

## error

**Signature**

```ts
export declare const error: (...args: ReadonlyArray<any>) => Effect<never, never, void>
```

Added in v2.0.0

## group

**Signature**

```ts
export declare const group: (options?: { label?: string; collapsed?: boolean }) => Effect<Scope, never, void>
```

Added in v2.0.0

## info

**Signature**

```ts
export declare const info: (...args: ReadonlyArray<any>) => Effect<never, never, void>
```

Added in v2.0.0

## log

**Signature**

```ts
export declare const log: (...args: ReadonlyArray<any>) => Effect<never, never, void>
```

Added in v2.0.0

## table

**Signature**

```ts
export declare const table: (tabularData: any, properties?: ReadonlyArray<string>) => Effect<never, never, void>
```

Added in v2.0.0

## time

**Signature**

```ts
export declare const time: (label?: string) => Effect<Scope, never, void>
```

Added in v2.0.0

## timeLog

**Signature**

```ts
export declare const timeLog: (label?: string, ...args: ReadonlyArray<any>) => Effect<never, never, void>
```

Added in v2.0.0

## trace

**Signature**

```ts
export declare const trace: (...args: ReadonlyArray<any>) => Effect<never, never, void>
```

Added in v2.0.0

## warn

**Signature**

```ts
export declare const warn: (...args: ReadonlyArray<any>) => Effect<never, never, void>
```

Added in v2.0.0

## withGroup

**Signature**

```ts
export declare const withGroup: {
  (options?: {
    readonly label?: string
    readonly collapsed?: boolean
  }): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, options?: { readonly label?: string; readonly collapsed?: boolean }): Effect<R, E, A>
}
```

Added in v2.0.0

## withTime

**Signature**

```ts
export declare const withTime: {
  (label?: string): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, label?: string): Effect<R, E, A>
}
```

Added in v2.0.0

# default services

## setConsole

**Signature**

```ts
export declare const setConsole: <A extends Console>(console: A) => Layer.Layer<never, never, never>
```

Added in v2.0.0

## withConsole

**Signature**

```ts
export declare const withConsole: {
  <A extends Console>(console: A): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A extends Console>(effect: Effect<R, E, A>, console: A): Effect<R, E, A>
}
```

Added in v2.0.0

# model

## Console (interface)

**Signature**

```ts
export interface Console {
  readonly [TypeId]: TypeId
  readonly assert: (condition: boolean, ...args: ReadonlyArray<any>) => Effect<never, never, void>
  readonly clear: Effect<never, never, void>
  readonly count: (label?: string) => Effect<never, never, void>
  readonly countReset: (label?: string) => Effect<never, never, void>
  readonly debug: (...args: ReadonlyArray<any>) => Effect<never, never, void>
  readonly dir: (item: any, options?: any) => Effect<never, never, void>
  readonly dirxml: (...args: ReadonlyArray<any>) => Effect<never, never, void>
  readonly error: (...args: ReadonlyArray<any>) => Effect<never, never, void>
  readonly group: (options?: { readonly label?: string; readonly collapsed?: boolean }) => Effect<never, never, void>
  readonly groupEnd: Effect<never, never, void>
  readonly info: (...args: ReadonlyArray<any>) => Effect<never, never, void>
  readonly log: (...args: ReadonlyArray<any>) => Effect<never, never, void>
  readonly table: (tabularData: any, properties?: ReadonlyArray<string>) => Effect<never, never, void>
  readonly time: (label?: string) => Effect<never, never, void>
  readonly timeEnd: (label?: string) => Effect<never, never, void>
  readonly timeLog: (label?: string, ...args: ReadonlyArray<any>) => Effect<never, never, void>
  readonly trace: (...args: ReadonlyArray<any>) => Effect<never, never, void>
  readonly warn: (...args: ReadonlyArray<any>) => Effect<never, never, void>
  readonly unsafe: UnsafeConsole
}
```

Added in v2.0.0

## UnsafeConsole (interface)

**Signature**

```ts
export interface UnsafeConsole {
  readonly assert: (condition: boolean, ...args: ReadonlyArray<any>) => void
  readonly clear: () => void
  readonly count: (label?: string) => void
  readonly countReset: (label?: string) => void
  readonly debug: (...args: ReadonlyArray<any>) => void
  readonly dir: (item: any, options?: any) => void
  readonly dirxml: (...args: ReadonlyArray<any>) => void
  readonly error: (...args: ReadonlyArray<any>) => void
  readonly group: (options?: { readonly label?: string; readonly collapsed?: boolean }) => void
  readonly groupEnd: () => void
  readonly info: (...args: ReadonlyArray<any>) => void
  readonly log: (...args: ReadonlyArray<any>) => void
  readonly table: (tabularData: any, properties?: ReadonlyArray<string>) => void
  readonly time: (label?: string) => void
  readonly timeEnd: (label?: string) => void
  readonly timeLog: (label?: string, ...args: ReadonlyArray<any>) => void
  readonly trace: (...args: ReadonlyArray<any>) => void
  readonly warn: (...args: ReadonlyArray<any>) => void
}
```

Added in v2.0.0

# type ids

## TypeId

**Signature**

```ts
export declare const TypeId: typeof TypeId
```

Added in v2.0.0

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v2.0.0
