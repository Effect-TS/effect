import { Context, Option } from "effect"
import { expect, it } from "tstyche"

it("permits access to a service omitted with None", () => {
  const Service = Context.Service<{ readonly value: number }>("AuditService")
  const context = Context.empty().pipe(Context.addOrOmit(Service, Option.none()))

  expect(Context.get(context, Service)).type.toBe<{ readonly value: number }>()
})
