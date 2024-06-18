import { hole } from "effect/Function"
import type * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"

declare const layer: Layer.Layer<"context", "error">
const runtime = ManagedRuntime.make(layer)

// -------------------------------------------------------------------------------------
// Context
// -------------------------------------------------------------------------------------

// $ExpectType "context"
hole<ManagedRuntime.ManagedRuntime.Context<typeof runtime>>()

// -------------------------------------------------------------------------------------
// Error
// -------------------------------------------------------------------------------------

// $ExpectType "error"
hole<ManagedRuntime.ManagedRuntime.Error<typeof runtime>>()
