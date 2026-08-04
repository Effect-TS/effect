import { assert, it } from "@effect/vitest"
import { Context, Option } from "effect"

it("does not type an omitted service as present", () => {
  const Service = Context.Service<{ readonly value: number }>("AuditService")
  const context = Context.empty().pipe(Context.addOrOmit(Service, Option.none()))

  assert.doesNotThrow(() => Context.get(context, Service))
})
