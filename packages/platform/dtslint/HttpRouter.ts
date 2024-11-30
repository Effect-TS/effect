import * as HttpRouter from "@effect/platform/HttpRouter"
import { hole } from "effect"

declare const router1: HttpRouter.HttpRouter<"E1", "R1">
declare const router2: HttpRouter.HttpRouter<"E2", "R2">
declare const router3: HttpRouter.HttpRouter<"E3", "R3">

// $ExpectType HttpRouter<"E1" | "E2" | "E3", "R1" | "R2" | "R3">
HttpRouter.concatAll(router1, router2, router3)

// $ExpectType never
hole<HttpRouter.PathInputComponents<never>>()
// $ExpectType {}
hole<HttpRouter.PathInputComponents<"*">>()
// $ExpectType {}
hole<HttpRouter.PathInputComponents<"/">>()
// $ExpectType {}
hole<HttpRouter.PathInputComponents<"/*">>()
// $ExpectType {}
hole<HttpRouter.PathInputComponents<"/prefix">>()
// $ExpectType {}
hole<HttpRouter.PathInputComponents<"/prefix/">>()
// $ExpectType {}
hole<HttpRouter.PathInputComponents<"/prefix/:">>()
// $ExpectType {}
hole<HttpRouter.PathInputComponents<"/prefix/:/">>()
// $ExpectType { id: any; }
hole<HttpRouter.PathInputComponents<"/prefix/:id">>()
// $ExpectType { ":id": any; }
hole<HttpRouter.PathInputComponents<"/prefix/::id">>()
// $ExpectType { id: any; }
hole<HttpRouter.PathInputComponents<"/prefix/:id/">>()
// $ExpectType { id: any; }
hole<HttpRouter.PathInputComponents<"/prefix/:id/:">>()
// $ExpectType { id: any; id2: any; }
hole<HttpRouter.PathInputComponents<"/prefix/:id/:id2">>()
// $ExpectType { id: any; } | { id2: any; }
hole<HttpRouter.PathInputComponents<"/:id" | "/:id2">>()
