import { Fiber } from "effect"

declare const string: Fiber.Fiber<string>
declare const number: Fiber.Fiber<number>
declare const array: Array<Fiber.Fiber<string> | Fiber.Fiber<number>>

// awaitAll

// $ExpectType Effect<[Exit<string, never>, Exit<number, never>], never, never>
Fiber.awaitAll([string, number])

// $ExpectType Effect<(Exit<string, never> | Exit<number, never>)[], never, never>
Fiber.awaitAll(new Set([string, number]))

// $ExpectType Effect<(Exit<string, never> | Exit<number, never>)[], never, never>
Fiber.awaitAll(array)
