import * as Schema from "effect/Schema"

const components = 200
const uses: Record<string, number> = { none: 0, one: 1, all: components }

const makeComponent = (index: number) => {
  const Props = Schema.Struct({
    id: Schema.String,
    label: Schema.String,
    disabled: Schema.optionalKey(Schema.Boolean),
    size: Schema.optionalKey(Schema.Literals(["sm", "md", "lg"])),
    variant: Schema.Literals(["primary", "secondary", "ghost"]),
    items: Schema.optionalKey(Schema.Array(Schema.Struct({ value: Schema.String, label: Schema.String })))
  })
  class Model extends Schema.Class<Model>(`Component${index}Model`)({
    value: Schema.String,
    open: Schema.Boolean,
    count: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
    selected: Schema.Array(Schema.String)
  }) {}
  const Message = Schema.Union([
    Schema.TaggedStruct("Open", {}),
    Schema.TaggedStruct("Close", {}),
    Schema.TaggedStruct("Select", { value: Schema.String }),
    Schema.TaggedStruct("Input", { text: Schema.String }),
    Schema.TaggedStruct("Increment", { by: Schema.Number })
  ])
  return { Props, Model, Message }
}

const props = { id: "c", label: "Label", size: "md", variant: "primary", items: [{ value: "a", label: "A" }] }
const model = { value: "a", open: false, count: 0, selected: [] }
const message = { _tag: "Select", value: "a" }

export const createWorkload = (size: string) => {
  const used = uses[size]
  if (used === undefined) throw new Error(`Unknown size: ${size}`)
  let all: Array<ReturnType<typeof makeComponent>> = []
  const useComponent = (component: ReturnType<typeof makeComponent>) => {
    const decodedProps = Schema.decodeUnknownSync(component.Props)(props)
    const instance = new component.Model(model)
    return [decodedProps, instance, Schema.decodeUnknownSync(component.Message)(message)]
  }
  const run = () => {
    let result: unknown
    for (let index = 0; index < used; index++) result = useComponent(all[index])
    return result
  }
  return {
    define: () => {
      all = Array.from({ length: components }, (_, index) => makeComponent(index))
    },
    phases: { use: run },
    warm: used > 0 ? run : undefined,
    retained: () => all
  }
}
