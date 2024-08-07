import { Fiber } from "effect"

declare const string: Fiber.Fiber<string>
declare const number: Fiber.Fiber<number>

// awaitAll

// $ExpectType Effect<[Exit<string, never>, Exit<number, never>], never, never>
Fiber.awaitAll([string, number] as const)

// $ExpectType Effect<Array<Exit<string, never> | Exit<number, never>>, never, never>
Fiber.awaitAll(new Set([string, number]))
