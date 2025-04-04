---
"effect": patch
---

Fix `JSONSchema.make` for `Exit` schemas.

Before

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Exit({
  failure: Schema.String,
  success: Schema.Number,
  defect: Schema.Defect
})

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
throws
Error: Missing annotation
at path: ["cause"]["left"]
details: Generating a JSON Schema for this schema requires an "identifier" annotation
schema (Suspend): CauseEncoded<string>
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Exit({
  failure: Schema.String,
  success: Schema.Number,
  defect: Schema.Defect
})

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
Output:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$defs": {
    "CauseEncoded0": {
      "anyOf": [
        {
          "type": "object",
          "required": [
            "_tag"
          ],
          "properties": {
            "_tag": {
              "type": "string",
              "enum": [
                "Empty"
              ]
            }
          },
          "additionalProperties": false
        },
        {
          "type": "object",
          "required": [
            "_tag",
            "error"
          ],
          "properties": {
            "_tag": {
              "type": "string",
              "enum": [
                "Fail"
              ]
            },
            "error": {
              "type": "string"
            }
          },
          "additionalProperties": false
        },
        {
          "type": "object",
          "required": [
            "_tag",
            "defect"
          ],
          "properties": {
            "_tag": {
              "type": "string",
              "enum": [
                "Die"
              ]
            },
            "defect": {
              "$ref": "#/$defs/Defect"
            }
          },
          "additionalProperties": false
        },
        {
          "type": "object",
          "required": [
            "_tag",
            "fiberId"
          ],
          "properties": {
            "_tag": {
              "type": "string",
              "enum": [
                "Interrupt"
              ]
            },
            "fiberId": {
              "$ref": "#/$defs/FiberIdEncoded"
            }
          },
          "additionalProperties": false
        },
        {
          "type": "object",
          "required": [
            "_tag",
            "left",
            "right"
          ],
          "properties": {
            "_tag": {
              "type": "string",
              "enum": [
                "Sequential"
              ]
            },
            "left": {
              "$ref": "#/$defs/CauseEncoded0"
            },
            "right": {
              "$ref": "#/$defs/CauseEncoded0"
            }
          },
          "additionalProperties": false
        },
        {
          "type": "object",
          "required": [
            "_tag",
            "left",
            "right"
          ],
          "properties": {
            "_tag": {
              "type": "string",
              "enum": [
                "Parallel"
              ]
            },
            "left": {
              "$ref": "#/$defs/CauseEncoded0"
            },
            "right": {
              "$ref": "#/$defs/CauseEncoded0"
            }
          },
          "additionalProperties": false
        }
      ],
      "title": "CauseEncoded<string>"
    },
    "Defect": {
      "$id": "/schemas/unknown",
      "title": "unknown"
    },
    "FiberIdEncoded": {
      "anyOf": [
        {
          "$ref": "#/$defs/FiberIdNoneEncoded"
        },
        {
          "$ref": "#/$defs/FiberIdRuntimeEncoded"
        },
        {
          "$ref": "#/$defs/FiberIdCompositeEncoded"
        }
      ]
    },
    "FiberIdNoneEncoded": {
      "type": "object",
      "required": [
        "_tag"
      ],
      "properties": {
        "_tag": {
          "type": "string",
          "enum": [
            "None"
          ]
        }
      },
      "additionalProperties": false
    },
    "FiberIdRuntimeEncoded": {
      "type": "object",
      "required": [
        "_tag",
        "id",
        "startTimeMillis"
      ],
      "properties": {
        "_tag": {
          "type": "string",
          "enum": [
            "Runtime"
          ]
        },
        "id": {
          "$ref": "#/$defs/Int"
        },
        "startTimeMillis": {
          "$ref": "#/$defs/Int"
        }
      },
      "additionalProperties": false
    },
    "Int": {
      "type": "integer",
      "description": "an integer",
      "title": "int"
    },
    "FiberIdCompositeEncoded": {
      "type": "object",
      "required": [
        "_tag",
        "left",
        "right"
      ],
      "properties": {
        "_tag": {
          "type": "string",
          "enum": [
            "Composite"
          ]
        },
        "left": {
          "$ref": "#/$defs/FiberIdEncoded"
        },
        "right": {
          "$ref": "#/$defs/FiberIdEncoded"
        }
      },
      "additionalProperties": false
    }
  },
  "anyOf": [
    {
      "type": "object",
      "required": [
        "_tag",
        "cause"
      ],
      "properties": {
        "_tag": {
          "type": "string",
          "enum": [
            "Failure"
          ]
        },
        "cause": {
          "$ref": "#/$defs/CauseEncoded0"
        }
      },
      "additionalProperties": false
    },
    {
      "type": "object",
      "required": [
        "_tag",
        "value"
      ],
      "properties": {
        "_tag": {
          "type": "string",
          "enum": [
            "Success"
          ]
        },
        "value": {
          "type": "number"
        }
      },
      "additionalProperties": false
    }
  ],
  "title": "ExitEncoded<number, string, Defect>"
}
*/
```
