import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SignUpView } from '#/components/sign-up-view.tsx'
import { useSessionContext } from '#/contexts/session.tsx'

export const Route = createFileRoute('/account/sign-up')({
  component: SignUpPage,
})

function SignUpPage() {
  const { api, rememberDefault } = useSessionContext()
  const navigate = useNavigate()
  return (
    <SignUpView
      rememberDefault={rememberDefault}
      onValidateNewHandle={async (data) => {
        await api.validateHandleAvailability(data)
      }}
      // @NOTE Back to the entry point, not to sign-in: with no account on the
      // device, sign-in shows only the form, which has no way back to sign-up.
      // The index route picks the welcome screen or the account picker, both of
      // which offer sign-up again.
      onBack={() => navigate({ to: '/account' })}
      onDone={async (data) => {
        const { account } = await api.signUp(data)
        // Sign-up establishes a session; go straight into its manager.
        navigate({
          to: '/account/u/$accountId',
          params: { accountId: account.handle ?? account.did },
          replace: true,
        })
      }}
    />
  )
}
