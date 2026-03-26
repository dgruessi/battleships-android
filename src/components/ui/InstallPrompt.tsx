import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import './InstallPrompt.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferredPrompt || dismissed) return null

  const handleInstall = async () => {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
    else setDismissed(true)
  }

  return (
    <div className="install-prompt" role="banner" data-testid="install-prompt">
      <span className="install-prompt-text">
        ⚓ Install Battleships as an app
      </span>
      <div className="install-prompt-actions">
        <Button variant="primary" onClick={handleInstall}>
          Install
        </Button>
        <Button variant="secondary" onClick={() => setDismissed(true)}>
          Not now
        </Button>
      </div>
    </div>
  )
}
