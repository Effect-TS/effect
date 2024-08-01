import * as HttpRouter from "@effect/platform/HttpRouter"

declare const router1: HttpRouter.HttpRouter<"E1", "R1">
declare const router2: HttpRouter.HttpRouter<"E2", "R2">
declare const router3: HttpRouter.HttpRouter<"E3", "R3">

// $ExpectType HttpRouter<"E1" | "E2" | "E3", "R1" | "R2" | "R3">
HttpRouter.concatAll(router1, router2, router3)
