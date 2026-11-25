'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { saveSettingsAction } from '@/actions/profile'
import { signOutAction } from '@/actions/auth'
import type { Profile } from '@/lib/types'

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [signingOut, startSignOut] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [values, setValues] = useState({
    profileVisibility: profile.profile_visibility,
    showEmail: profile.show_email,
    notifyConnections: profile.notify_connections,
    notifyComments: profile.notify_comments,
    notifyTasks: profile.notify_tasks,
  })

  function save() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await saveSettingsAction(values)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="space-y-5">
      <div className="surface p-5">
        <h2 className="text-[14px] font-semibold text-foreground">Privacy</h2>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label htmlFor="visibility">Profile visibility</Label>
              <p className="text-[12px] text-muted-foreground">
                Public profiles show published problems and confirmed contributions to everyone.
              </p>
            </div>
            <Select
              id="visibility"
              value={values.profileVisibility}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  profileVisibility: event.target.value as 'public' | 'connections',
                }))
              }
              className="w-48"
            >
              <option value="public">Public</option>
              <option value="connections">Connections only</option>
            </Select>
          </div>

          <SettingRow
            label="Show my email to connections"
            description="Your email is never shown publicly."
            checked={values.showEmail}
            onChange={(showEmail) => setValues((prev) => ({ ...prev, showEmail }))}
          />
        </div>
      </div>

      <div className="surface p-5">
        <h2 className="text-[14px] font-semibold text-foreground">Notifications</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          These preferences are stored on your profile. In-app delivery is basic: this MVP does not send email
          or push notifications, and it does not pretend to.
        </p>
        <div className="mt-4 space-y-4">
          <SettingRow
            label="Connection requests"
            description="When someone sends or accepts a request."
            checked={values.notifyConnections}
            onChange={(notifyConnections) => setValues((prev) => ({ ...prev, notifyConnections }))}
          />
          <SettingRow
            label="Comments on my problems"
            description="When someone joins a discussion you own."
            checked={values.notifyComments}
            onChange={(notifyComments) => setValues((prev) => ({ ...prev, notifyComments }))}
          />
          <SettingRow
            label="Workspace tasks"
            description="When a task is assigned or completed."
            checked={values.notifyTasks}
            onChange={(notifyTasks) => setValues((prev) => ({ ...prev, notifyTasks }))}
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} variant="gradient" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {pending ? 'Saving…' : 'Save preferences'}
        </Button>
        {saved ? <span className="text-[12px] font-medium text-success">Preferences saved</span> : null}
        <Button
          variant="outline"
          className="ml-auto"
          disabled={signingOut}
          onClick={() =>
            startSignOut(async () => {
              await signOutAction()
              router.push('/')
              router.refresh()
            })
          }
        >
          {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />} Sign out
        </Button>
      </div>
    </div>
  )
}

function SettingRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="text-[12px] text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}
