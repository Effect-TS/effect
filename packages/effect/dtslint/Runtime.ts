import type * as Runtime from "effect/Runtime"

// $ExpectType { foo: string; }
export type ContextOfRuntime = Runtime.Runtime.Context<Runtime.Runtime<{ foo: string }>>
