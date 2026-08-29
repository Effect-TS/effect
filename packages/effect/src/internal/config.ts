import * as Schema from "../Schema.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"

export const trueValues = Schema.Literals(["true", "yes", "on", "1", "y"])

export const falseValues = Schema.Literals(["false", "no", "off", "0", "n"])

export const boolean = Schema.Literals([...trueValues.literals, ...falseValues.literals]).pipe(
  Schema.decodeTo(
    Schema.Boolean,
    SchemaTransformation.transform({
      decode: (value) => value === "true" || value === "yes" || value === "on" || value === "1" || value === "y",
      encode: (value) => value ? "true" : "false"
    })
  )
)
