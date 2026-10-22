import { z } from 'zod'
import { multiLangStringSchema } from '../lib/util/locale.js'

// A plain string is English; a record maps locales to translations. Rich
// strings may embed links as `[label](target)`, where the target is a link
// `rel` from `branding.links` (e.g. `terms-of-service`), or, on the consent
// screen, `client-tos` / `client-policy` for the client's own documents.
const langStringSchema = z.union([z.string(), multiLangStringSchema])

export const signUpTextsSchema = z.object({
  /** Replaces the "Sign up" heading. */
  title: langStringSchema.optional(),
  /** Replaces the subtitle under the heading. An empty string removes it. */
  subtitle: langStringSchema.optional(),
  /** Replaces the label of the button that creates the account. */
  submitLabel: langStringSchema.optional(),
  /** Hides the note that the username can later be changed to a domain. */
  hideHandleChangeNote: z.boolean().optional(),
  /**
   * Adds a first step where the user must accept the terms before going on.
   * The "By creating an account you agree…" line is then no longer shown.
   */
  terms: z
    .object({
      /** Paragraph above the rules (rich). */
      intro: langStringSchema.optional(),
      /** Bullet list summarising the terms. */
      rules: z.array(langStringSchema).optional(),
      /** Paragraph below the rules (rich). Defaults to links to both documents. */
      details: langStringSchema.optional(),
      /** Checkbox label (rich). Defaults to accepting both documents. */
      checkbox: langStringSchema.optional(),
    })
    .optional(),
})
export type SignUpTexts = z.infer<typeof signUpTextsSchema>

export const consentTextsSchema = z.object({
  /** Replaces the "Authorize" heading. */
  title: langStringSchema.optional(),
  /** Paragraph shown above the requested permissions (rich). */
  intro: langStringSchema.optional(),
  /** Replaces the line about the client's terms and privacy policy (rich). */
  notice: langStringSchema.optional(),
  acceptLabel: langStringSchema.optional(),
  rejectLabel: langStringSchema.optional(),
})
export type ConsentTexts = z.infer<typeof consentTextsSchema>

export const textsSchema = z.object({
  signUp: signUpTextsSchema.optional(),
  consent: consentTextsSchema.optional(),
})
export type TextsConfig = z.input<typeof textsSchema>
export type Texts = z.infer<typeof textsSchema>
