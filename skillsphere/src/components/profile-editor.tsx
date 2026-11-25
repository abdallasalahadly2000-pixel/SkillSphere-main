'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { FieldError, Label } from '@/components/ui/label'
import { AvatarPicker } from '@/components/avatar-picker'
import { SkillEditor } from '@/components/skill-editor'
import { saveProfileAction, saveSkillsAction } from '@/actions/profile'
import { profileSchema, type ProfileInput } from '@/lib/validation'
import { SUGGESTED_SKILLS } from '@/lib/constants'
import type { Profile } from '@/lib/types'

export function ProfileEditor({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [skills, setSkills] = useState({
    expertise: profile.skills.filter((s) => s.kind === 'expertise').map((s) => s.name),
    interest: profile.skills.filter((s) => s.kind === 'interest').map((s) => s.name),
    learning: profile.skills.filter((s) => s.kind === 'learning').map((s) => s.name),
    help: profile.skills.filter((s) => s.kind === 'help').map((s) => s.name),
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile.display_name,
      profession: profile.profession ?? '',
      location: profile.location ?? '',
      bio: profile.bio ?? '',
    },
  })

  const name = watch('displayName') || profile.display_name

  async function onSubmit(values: ProfileInput) {
    setError(null)
    const profileResult = await saveProfileAction({ ...values, avatarUrl: avatarUrl ?? '' })
    if (!profileResult.ok) {
      setError(profileResult.error)
      return
    }
    const skillsResult = await saveSkillsAction(skills)
    if (!skillsResult.ok) {
      setError(skillsResult.error)
      return
    }
    setSaved(true)
    setOpen(false)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="gradient" size="sm">
            <Pencil /> Edit profile
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit your profile</DialogTitle>
            <DialogDescription>
              This is what people see when they consider connecting or adding you to a problem.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <AvatarPicker name={name} value={avatarUrl} onChange={setAvatarUrl} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-name">Display name</Label>
                <Input id="edit-name" className="mt-1.5" {...register('displayName')} />
                <FieldError message={errors.displayName?.message} />
              </div>
              <div>
                <Label htmlFor="edit-profession">Profession or study</Label>
                <Input id="edit-profession" className="mt-1.5" {...register('profession')} />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input id="edit-location" className="mt-1.5" {...register('location')} />
            </div>
            <div>
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea id="edit-bio" className="mt-1.5 min-h-24" {...register('bio')} />
              <FieldError message={errors.bio?.message} />
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <SkillEditor
                label="Skills you have"
                value={skills.expertise}
                onChange={(expertise) => setSkills((prev) => ({ ...prev, expertise }))}
                suggestions={SUGGESTED_SKILLS}
                placeholder="Add a skill"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <SkillEditor
                  label="Areas of interest"
                  value={skills.interest}
                  onChange={(interest) => setSkills((prev) => ({ ...prev, interest }))}
                />
                <SkillEditor
                  label="Skills you want to learn"
                  value={skills.learning}
                  onChange={(learning) => setSkills((prev) => ({ ...prev, learning }))}
                />
              </div>
              <SkillEditor
                label="Where you can help others"
                value={skills.help}
                onChange={(help) => setSkills((prev) => ({ ...prev, help }))}
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
                {isSubmitting ? 'Saving…' : 'Save profile'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {saved ? <span className="text-[11.5px] font-medium text-success">Profile updated</span> : null}
    </>
  )
}
