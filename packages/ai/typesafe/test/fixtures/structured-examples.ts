import type { Schema } from "effect"
import { Decision } from "effect/ai"

/**
 * The Score example from https://docs.typesafe.ai/primitives/score#structured-level-descriptions.
 */
export const bugSeverity = Decision.rate({
  instructions: "How severe is the reported issue?",
  criteria: [
    {
      label: "cosmetic",
      description: {
        what: "Cosmetic; no impact to functionality",
        examples: ["typo in a label", "misaligned icon"]
      }
    },
    {
      label: "degraded",
      description: {
        what: "Broken or degraded feature, but workaround exists",
        examples: ["export fails in one browser but works in another"]
      }
    },
    {
      label: "blocking",
      description: { what: "Blocking issue; no workaround exists", examples: ["cannot log in", "data loss"] }
    }
  ]
})

/**
 * Structured examples from https://docs.typesafe.ai/primitives/advanced, /choice, /score, and /noul.
 * `questions` is each request as the docs write it, and `answers` is the documented response where there is one.
 */
export const structuredExamples: ReadonlyArray<{
  readonly name: string
  readonly state: Schema.Json
  readonly decisions: Record<string, Decision.Any>
  readonly questions: Schema.Json
  readonly answers?: Schema.Json
}> = [
  {
    name: "invoice field set",
    state: {
      source_text: "Invoice #4471 issued March 3, 2026 to Beaver Dam Logistics for $12,840.00, net 30."
    },
    decisions: {
      invoice_number_is_correct: Decision.probability({
        instructions: {
          field: { name: "invoice_number", type: "string", description: "The identifier printed on the invoice." },
          extracted_value: "4471",
          question: "Does `extracted_value` match the `field` as it appears in `source_text`?"
        }
      }),
      customer_name: Decision.classify({
        instructions: {
          field: {
            name: "customer_name",
            type: "string",
            description: "The organization the invoice was issued to."
          },
          question: "Which option is the value of `field` in `source_text`?"
        },
        criteria: {
          "Beaver Logistics": null,
          "Dam Logistics": null,
          "Beaver Dam Logistics": null,
          "Beaver": null,
          "Dam": null
        }
      }),
      amount_due: Decision.rate({
        instructions: {
          field: {
            name: "amount_due",
            type: "number",
            unit: "USD",
            description: "The total the invoice asks to be paid."
          },
          question: "How large is the `field` value in `source_text`?"
        },
        criteria: [
          "Under $1,000",
          "$1,000 to $10,000",
          "$10,000 to $100,000",
          "$100,000 to $1,000,000",
          "Over $1,000,000"
        ]
      }),
      payment_terms: Decision.rate({
        instructions: {
          field: {
            name: "payment_terms",
            type: "integer",
            unit: "days",
            description: "Days allowed for payment, from terms such as \"net 30\"."
          },
          question: "How many days does the `field` in `source_text` allow for payment?"
        },
        criteria: ["Due on receipt", "Net 10", "Net 30", "Net 60", "Net 90"]
      })
    },
    questions: {
      invoice_number_is_correct: {
        type: "noul",
        instructions: {
          field: { name: "invoice_number", type: "string", description: "The identifier printed on the invoice." },
          extracted_value: "4471",
          question: "Does `extracted_value` match the `field` as it appears in `source_text`?"
        }
      },
      customer_name: {
        type: "choice",
        instructions: {
          field: {
            name: "customer_name",
            type: "string",
            description: "The organization the invoice was issued to."
          },
          question: "Which option is the value of `field` in `source_text`?"
        },
        criteria: {
          "Beaver Logistics": null,
          "Dam Logistics": null,
          "Beaver Dam Logistics": null,
          "Beaver": null,
          "Dam": null
        }
      },
      amount_due: {
        type: "score",
        instructions: {
          field: {
            name: "amount_due",
            type: "number",
            unit: "USD",
            description: "The total the invoice asks to be paid."
          },
          question: "How large is the `field` value in `source_text`?"
        },
        criteria: [
          "Under $1,000",
          "$1,000 to $10,000",
          "$10,000 to $100,000",
          "$100,000 to $1,000,000",
          "Over $1,000,000"
        ]
      },
      payment_terms: {
        type: "score",
        instructions: {
          field: {
            name: "payment_terms",
            type: "integer",
            unit: "days",
            description: "Days allowed for payment, from terms such as \"net 30\"."
          },
          question: "How many days does the `field` in `source_text` allow for payment?"
        },
        criteria: ["Due on receipt", "Net 10", "Net 30", "Net 60", "Net 90"]
      }
    }
  },
  {
    name: "billing, orders, and account rubric",
    state: "I ordered the standing desk two weeks ago and tracking still says label created. Was I even charged?",
    decisions: {
      department: Decision.classify({
        instructions: {
          question: "Which team should handle this message?",
          focus: "Classify the customer's primary request, not every topic mentioned."
        },
        criteria: {
          billing: {
            what: "Charges, invoices, refunds, or subscriptions",
            not_for: "Order tracking or account access",
            examples: ["I was charged twice", "Where is my refund?"]
          },
          orders: {
            what: "Order status, delivery, cancellation, or returns",
            not_for: "Charges or account access",
            examples: ["Where is my package?", "Cancel my order"]
          },
          account: {
            what: "Login, password, profile, or security",
            not_for: "Charges or delivery",
            examples: ["I can't log in", "Change my email"]
          }
        }
      })
    },
    questions: {
      department: {
        type: "choice",
        instructions: {
          question: "Which team should handle this message?",
          focus: "Classify the customer's primary request, not every topic mentioned."
        },
        criteria: {
          billing: {
            what: "Charges, invoices, refunds, or subscriptions",
            not_for: "Order tracking or account access",
            examples: ["I was charged twice", "Where is my refund?"]
          },
          orders: {
            what: "Order status, delivery, cancellation, or returns",
            not_for: "Charges or account access",
            examples: ["Where is my package?", "Cancel my order"]
          },
          account: {
            what: "Login, password, profile, or security",
            not_for: "Charges or delivery",
            examples: ["I can't log in", "Change my email"]
          }
        }
      }
    }
  },
  {
    name: "taxonomy walk",
    state: "32oz plastic bottle with a flip straw lid. Fits most bike cages.",
    decisions: {
      department: Decision.classify({
        instructions: "Which top-level department does this product belong to?",
        criteria: {
          "Sporting Goods": {
            Cycling: ["Bike Bottles & Cages", "Bike Lights", "Helmets"],
            Fitness: ["Yoga Mats", "Resistance Bands"],
            Outdoor: ["Tents", "Sleeping Bags", "Hydration Packs"]
          },
          "Home & Kitchen": {
            Drinkware: ["Water Bottles", "Travel Mugs", "Tumblers"],
            Cookware: ["Pots & Pans", "Bakeware"]
          },
          "Baby & Toddler": ["Sippy Cups", "Bottle Warmers", "Bibs"]
        }
      })
    },
    questions: {
      department: {
        type: "choice",
        instructions: "Which top-level department does this product belong to?",
        criteria: {
          "Sporting Goods": {
            Cycling: ["Bike Bottles & Cages", "Bike Lights", "Helmets"],
            Fitness: ["Yoga Mats", "Resistance Bands"],
            Outdoor: ["Tents", "Sleeping Bags", "Hydration Packs"]
          },
          "Home & Kitchen": {
            Drinkware: ["Water Bottles", "Travel Mugs", "Tumblers"],
            Cookware: ["Pots & Pans", "Bakeware"]
          },
          "Baby & Toddler": ["Sippy Cups", "Bottle Warmers", "Bibs"]
        }
      }
    }
  },
  {
    name: "pull request scope",
    state: "Fixed the null check in the payment handler. Also refactored the retry loop while I was in there, " +
      "and bumped the SDK version since the old one had that timeout bug.",
    decisions: {
      pr_scope: Decision.rate({
        instructions: {
          question: "How focused is this pull request description on a single change?",
          note: "Judge the number of independent changes, not the size of any one change."
        },
        criteria: [
          {
            label: "focused",
            description: {
              summary: "One change, clearly stated",
              signals: ["A single fix or feature", "Nothing described as \"also\" or \"while I was in there\""]
            }
          },
          {
            label: "tweak",
            description: {
              summary: "One main change plus a small related tweak",
              signals: ["A primary change and one minor adjacent edit", "The tweak supports the main change"]
            }
          },
          {
            label: "bundled",
            description: {
              summary: "Several independent changes bundled together",
              signals: ["Two or more unrelated fixes or features", "Changes that could each be their own PR"]
            }
          }
        ]
      })
    },
    questions: {
      pr_scope: {
        type: "score",
        instructions: {
          question: "How focused is this pull request description on a single change?",
          note: "Judge the number of independent changes, not the size of any one change."
        },
        criteria: [
          {
            summary: "One change, clearly stated",
            signals: ["A single fix or feature", "Nothing described as \"also\" or \"while I was in there\""]
          },
          {
            summary: "One main change plus a small related tweak",
            signals: ["A primary change and one minor adjacent edit", "The tweak supports the main change"]
          },
          {
            summary: "Several independent changes bundled together",
            signals: ["Two or more unrelated fixes or features", "Changes that could each be their own PR"]
          }
        ]
      }
    }
  },
  {
    name: "credentials request",
    state: {
      sender: { display_name: "Beaver Dam Builders Ltd.", email: "donotreply@payroll.example" },
      message: "Your Q3 bonus is ready. Reply with your login password so we can verify your identity and " +
        "release the funds."
    },
    decisions: {
      requests_credentials: Decision.probability({
        instructions: {
          question: "Does the `message` ask the recipient to disclose a sensitive credential?",
          inspect: "message",
          focus: "Look for a request to send the credential itself, not a request to change or reset it."
        },
        criteria: {
          true: {
            what: "Asks the recipient to reply with, type, or send a password, PIN, one-time code, or other " +
              "security sensitive answer",
            examples: ["Reply with your password", "Send us the 6-digit code you just received"]
          },
          false: {
            what: "No sensitive credential is requested",
            examples: ["Reset your password from the settings page", "Your statement is ready"]
          }
        }
      })
    },
    questions: {
      requests_credentials: {
        type: "noul",
        instructions: {
          question: "Does the `message` ask the recipient to disclose a sensitive credential?",
          inspect: "message",
          focus: "Look for a request to send the credential itself, not a request to change or reset it."
        },
        criteria: {
          true: {
            what: "Asks the recipient to reply with, type, or send a password, PIN, one-time code, or other " +
              "security sensitive answer",
            examples: ["Reply with your password", "Send us the 6-digit code you just received"]
          },
          false: {
            what: "No sensitive credential is requested",
            examples: ["Reset your password from the settings page", "Your statement is ready"]
          }
        }
      }
    }
  },
  {
    name: "returns topic",
    state: "I sent the shoes back a week ago. When do I get my money?",
    decisions: {
      return_topic: Decision.classify({
        instructions: {
          question: "Which returns topic is the customer asking about?",
          focus: "Classify the information the customer wants."
        },
        criteria: {
          return_policy: {
            what: "Whether and how an item can be returned",
            not_for: "Progress of a return already sent",
            examples: ["Can I return shoes I've worn once?", "How long do I have to return an order?"]
          },
          return_status: {
            what: "Progress of a return already sent",
            not_for: "Whether and how an item can be returned",
            examples: ["Has my return arrived yet?", "When will my refund be paid?"]
          }
        }
      })
    },
    questions: {
      return_topic: {
        type: "choice",
        instructions: {
          question: "Which returns topic is the customer asking about?",
          focus: "Classify the information the customer wants."
        },
        criteria: {
          return_policy: {
            what: "Whether and how an item can be returned",
            not_for: "Progress of a return already sent",
            examples: ["Can I return shoes I've worn once?", "How long do I have to return an order?"]
          },
          return_status: {
            what: "Progress of a return already sent",
            not_for: "Whether and how an item can be returned",
            examples: ["Has my return arrived yet?", "When will my refund be paid?"]
          }
        }
      }
    },
    answers: {
      return_topic: {
        type: "choice",
        choice: "return_status",
        confidence: 1.0,
        probabilities: { return_policy: 0.0, return_status: 1.0 }
      }
    }
  },
  {
    name: "bug severity levels",
    state: "Export to PDF fails with a spinner that never finishes. Some of our team say CSV export still " +
      "works for them, others say it fails too.",
    decisions: {
      bug_severity: bugSeverity
    },
    questions: {
      bug_severity: {
        type: "score",
        instructions: "How severe is the reported issue?",
        criteria: [
          { what: "Cosmetic; no impact to functionality", examples: ["typo in a label", "misaligned icon"] },
          {
            what: "Broken or degraded feature, but workaround exists",
            examples: ["export fails in one browser but works in another"]
          },
          { what: "Blocking issue; no workaround exists", examples: ["cannot log in", "data loss"] }
        ]
      }
    },
    answers: {
      bug_severity: {
        type: "score",
        score: 1.09,
        confidence: 0.87,
        legend: {
          "0": { what: "Cosmetic; no impact to functionality", examples: ["typo in a label", "misaligned icon"] },
          "1": {
            what: "Broken or degraded feature, but workaround exists",
            examples: ["export fails in one browser but works in another"]
          },
          "2": { what: "Blocking issue; no workaround exists", examples: ["cannot log in", "data loss"] }
        },
        probabilities: { "0": 0.0, "1": 0.91, "2": 0.09 }
      }
    }
  },
  {
    name: "duplicate candidate records",
    state: {
      resume: {
        name: "John Smith",
        location: "Oakland, CA",
        summary: "Backend engineer with eight years of Python and Go experience.",
        experience: [
          { employer: "Google", title: "Senior Backend Engineer", years: "2021-2025" },
          { employer: "Microsoft", title: "Software Engineer", years: "2017-2021" }
        ]
      }
    },
    decisions: {
      same_as_record_18: Decision.probability({
        instructions: {
          potential_duplicate: { name: "Jon Smith", location: "Oakland, CA", last_employer: "Google" },
          question: "Is the resume for the same person as `potential_duplicate`?"
        }
      }),
      same_as_record_42: Decision.probability({
        instructions: {
          potential_duplicate: { name: "John Smith", location: "Austin, TX", last_employer: "Lone Star Freight" },
          question: "Is the resume for the same person as `potential_duplicate`?"
        }
      }),
      same_as_record_77: Decision.probability({
        instructions: {
          potential_duplicate: { name: "John Smithers", location: "Oakland, CA", last_employer: "Bay Health Clinic" },
          question: "Is the resume for the same person as `potential_duplicate`?"
        }
      })
    },
    questions: {
      same_as_record_18: {
        type: "noul",
        instructions: {
          potential_duplicate: { name: "Jon Smith", location: "Oakland, CA", last_employer: "Google" },
          question: "Is the resume for the same person as `potential_duplicate`?"
        }
      },
      same_as_record_42: {
        type: "noul",
        instructions: {
          potential_duplicate: { name: "John Smith", location: "Austin, TX", last_employer: "Lone Star Freight" },
          question: "Is the resume for the same person as `potential_duplicate`?"
        }
      },
      same_as_record_77: {
        type: "noul",
        instructions: {
          potential_duplicate: { name: "John Smithers", location: "Oakland, CA", last_employer: "Bay Health Clinic" },
          question: "Is the resume for the same person as `potential_duplicate`?"
        }
      }
    },
    answers: {
      same_as_record_18: { type: "noul", noul: 0.74 },
      same_as_record_42: { type: "noul", noul: 0.09 },
      same_as_record_77: { type: "noul", noul: 0.08 }
    }
  }
]

/**
 * Answers every question with all probability on the first option or level, echoing levels in `legend`.
 */
export const answersFor = (questions: any): Record<string, unknown> => {
  const answers: Record<string, unknown> = {}
  for (const [key, question] of Object.entries<any>(questions)) {
    switch (question.type) {
      case "choice": {
        const labels = Object.keys(question.criteria)
        answers[key] = {
          type: "choice",
          choice: labels[0],
          probabilities: Object.fromEntries(labels.map((label, index) => [label, index === 0 ? 1 : 0])),
          confidence: 1
        }
        break
      }
      case "score":
        answers[key] = {
          type: "score",
          score: 0,
          legend: Object.fromEntries(question.criteria.map((level: unknown, index: number) => [String(index), level])),
          probabilities: Object.fromEntries(
            question.criteria.map((_: unknown, index: number) => [String(index), index === 0 ? 1 : 0])
          ),
          confidence: 1
        }
        break
      case "noul":
        answers[key] = { type: "noul", noul: 0.5 }
        break
    }
  }
  return answers
}
