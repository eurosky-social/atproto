import type { LinkDefinition, MultiLangString } from './types.js'

// These are the types of the variables that are injected into the HTML by the
// backend. They are used to configure the frontend.

export type CustomizationData = {
  // Functional customization
  hcaptchaSiteKey?: string
  inviteCodeRequired?: boolean
  availableUserDomains?: string[]
  show2FaWarningOnEmailUpdate?: boolean

  // Aesthetic customization
  name?: string
  logo?: string
  links?: LinkDefinition[]
  linksLocaleParam?: string
  texts?: CustomizationTexts
}

/**
 * A plain string is English. Rich strings may embed links as
 * `[label](target)`, where the target is the `rel` of one of the `links`.
 */
export type LangString = string | MultiLangString

export type CustomizationTexts = {
  signUp?: {
    title?: LangString
    subtitle?: LangString
    submitLabel?: LangString
    hideHandleChangeNote?: boolean
    terms?: {
      intro?: LangString
      rules?: LangString[]
      details?: LangString
      checkbox?: LangString
    }
  }
  consent?: {
    title?: LangString
    intro?: LangString
    notice?: LangString
    acceptLabel?: LangString
    rejectLabel?: LangString
  }
}
