import { useAuth } from './hooks/useAuth.js'
import LoginScreen from './components/LoginScreen.jsx'
import Vault from './components/Vault.jsx'

export default function App() {
  const auth = useAuth()

  if (!auth.isConfigured) return <LoginScreen configured={false} />
  if (auth.status === 'signedOut') return <LoginScreen configured onSignIn={auth.signIn} error={auth.error} />
  // 'signedIn' or 'expired' (expired shows a reconnect banner inside the vault)
  return <Vault auth={auth} />
}
