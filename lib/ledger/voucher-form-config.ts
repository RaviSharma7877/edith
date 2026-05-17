import { z } from "zod"

export interface VoucherFormConfig {
  party?: {
    show:     boolean
    label:    string
    type:     "customer" | "vendor" | "both" | "none"
    required: boolean
  }

  extraFields?: Array<{
    key:       string
    label:     string
    fieldType: "text" | "date" | "number"
    required:  boolean
  }>

  defaultLines?: Array<{
    position:        number
    label:           string
    direction:       "DEBIT" | "CREDIT"
    accountSubtype?: string | null
    accountId?:      string | null
    locked:          boolean
    amountEditable:  boolean
  }>

  lineConstraints?: {
    allowedDebitSubtypes?:  string[] | null
    allowedCreditSubtypes?: string[] | null
    minLines:               number
    maxLines?:              number | null
  }

  simplifiedMode?: {
    enabled:     boolean
    amountLabel: string
  }
}

const PartySchema = z.object({
  show:     z.boolean(),
  label:    z.string(),
  type:     z.enum(["customer", "vendor", "both", "none"]),
  required: z.boolean(),
})

const ExtraFieldSchema = z.object({
  key:       z.string().min(1),
  label:     z.string().min(1),
  fieldType: z.enum(["text", "date", "number"]),
  required:  z.boolean(),
})

const DefaultLineSchema = z.object({
  position:       z.number().int().min(0),
  label:          z.string(),
  direction:      z.enum(["DEBIT", "CREDIT"]),
  accountSubtype: z.string().nullable().optional(),
  accountId:      z.string().nullable().optional(),
  locked:         z.boolean(),
  amountEditable: z.boolean(),
})

const LineConstraintsSchema = z.object({
  allowedDebitSubtypes:  z.array(z.string()).nullable().optional(),
  allowedCreditSubtypes: z.array(z.string()).nullable().optional(),
  minLines:              z.number().int().min(1).default(2),
  maxLines:              z.number().int().min(1).nullable().optional(),
})

const SimplifiedModeSchema = z.object({
  enabled:     z.boolean(),
  amountLabel: z.string(),
})

export const VoucherFormConfigSchema = z.object({
  party:           PartySchema.optional(),
  extraFields:     z.array(ExtraFieldSchema).optional(),
  defaultLines:    z.array(DefaultLineSchema).optional(),
  lineConstraints: LineConstraintsSchema.optional(),
  simplifiedMode:  SimplifiedModeSchema.optional(),
})

export const VoucherTypeConfigCreateSchema = z.object({
  key:        z.string().regex(/^[A-Z][A-Z0-9_]{1,29}$/).optional(),
  label:      z.string().min(1).max(100),
  prefix:     z.string().min(1).max(5),
  isActive:   z.boolean().optional().default(true),
  sortOrder:  z.number().int().optional().default(100),
  formConfig: VoucherFormConfigSchema.optional().default({}),
})

export const VoucherTypeConfigUpdateSchema = z.object({
  label:      z.string().min(1).max(100).optional(),
  isActive:   z.boolean().optional(),
  sortOrder:  z.number().int().optional(),
  formConfig: VoucherFormConfigSchema.optional(),
})

export function labelToKey(label: string): string {
  return label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^([0-9])/, "X$1")
    .substring(0, 30) || "CUSTOM"
}
