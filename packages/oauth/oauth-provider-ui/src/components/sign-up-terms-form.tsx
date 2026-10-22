import { Trans } from '@lingui/react/macro'
import { type ReactNode, useState } from 'react'
import type { CustomizationTexts } from '@atproto/oauth-provider-api'
import { CheckboxField } from '#/components/forms/fields/checkbox-field.tsx'
import {
  FormShell,
  type FormShellProps,
} from '#/components/forms/form-shell.tsx'
import { LinkAnchor } from '#/components/utils/link-anchor.tsx'
import { RichLangString } from '#/components/utils/rich-lang-string.tsx'
import { useCustomizationData } from '#/contexts/customization.tsx'

type Values = { acceptTerms?: string }

export type SignUpTermsData = { acceptTerms: boolean }

export type SignUpTermsTexts = NonNullable<
  NonNullable<CustomizationTexts['signUp']>['terms']
>

export type SignUpTermsFormProps = Omit<
  FormShellProps<Values>,
  'onSubmit' | 'onValues' | 'submittable'
> & {
  texts: SignUpTermsTexts
  values?: Partial<SignUpTermsData>
  onValues?: (values: Partial<SignUpTermsData>) => void
  handler: (
    data: SignUpTermsData,
    signal: AbortSignal,
  ) => void | PromiseLike<void>
}

/**
 * The optional first sign-up step: a summary of the deployment's terms, and a
 * checkbox that must be ticked before the user can go on. Every piece of copy
 * can be replaced through `branding.texts.signUp.terms`.
 */
export function SignUpTermsForm({
  texts,
  values,
  onValues,
  handler,
  children,
  ...props
}: SignUpTermsFormProps) {
  const [accepted, setAccepted] = useState(values?.acceptTerms === true)

  return (
    <FormShell<Values>
      {...props}
      // @NOTE The submit button stays disabled until the box is ticked, rather
      // than relying on a `required` bubble, so the gate is visible up front.
      submittable={accepted}
      onValues={(next) => {
        const acceptTerms = next.acceptTerms != null
        setAccepted(acceptTerms)
        onValues?.({ acceptTerms })
      }}
      onSubmit={(_next, signal) => handler({ acceptTerms: true }, signal)}
    >
      <p>
        {texts.intro != null ? (
          <RichLangString value={texts.intro} />
        ) : (
          <Trans>
            Before we begin, please review and accept the terms of this service.
          </Trans>
        )}
      </p>

      {texts.rules?.length ? (
        <ul className="list-disc space-y-1 pl-5">
          {texts.rules.map((rule, i) => (
            <li key={i}>
              <RichLangString value={rule} />
            </li>
          ))}
        </ul>
      ) : null}

      <p>
        {texts.details != null ? (
          <RichLangString value={texts.details} />
        ) : (
          <Trans>
            You can read the full{' '}
            <TermsLink rel="terms-of-service">Terms of Service</TermsLink> and{' '}
            <TermsLink rel="privacy-policy">Privacy Policy</TermsLink>.
          </Trans>
        )}
      </p>

      <CheckboxField
        name="acceptTerms"
        defaultChecked={accepted}
        className="bg-background rounded-lg border p-3"
        label={
          texts.checkbox != null ? (
            <RichLangString value={texts.checkbox} />
          ) : (
            <Trans>
              I accept the{' '}
              <TermsLink rel="terms-of-service">Terms of Service</TermsLink> and
              the <TermsLink rel="privacy-policy">Privacy Policy</TermsLink>.
            </Trans>
          )
        }
      />

      {children}
    </FormShell>
  )
}

function TermsLink({ rel, children }: { rel: string; children: ReactNode }) {
  const { links } = useCustomizationData()
  const link = links?.find((l) => l.rel === rel)
  if (!link) return <>{children}</>
  return (
    <LinkAnchor link={link} className="text-foreground underline">
      {children}
    </LinkAnchor>
  )
}
