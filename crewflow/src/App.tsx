import { useState } from 'react'
import MarketingPage from './MarketingPage'
import AppShell from './app/AppShell'

function App() {
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  return workspaceOpen
    ? <AppShell onSignOut={() => setWorkspaceOpen(false)} />
    : <MarketingPage onSignIn={() => setWorkspaceOpen(true)} />
}

export default App
