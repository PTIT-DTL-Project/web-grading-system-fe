import { Providers } from './providers'
import { AuthGate } from './AuthGate'

export default function App() {
  return (
    <Providers>
      {/* keycloak.init() must settle before the router evaluates its route guards → AuthGate */}
      <AuthGate />
    </Providers>
  )
}
