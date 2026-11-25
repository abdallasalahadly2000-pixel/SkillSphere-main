'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { FieldError, FieldHint, Label } from '@/components/ui/label'
import { AvatarPicker } from '@/components/avatar-picker'
import { SkillEditor } from '@/components/skill-editor'
import { saveOnboardingAction } from '@/actions/profile'
import { profileSchema, type ProfileInput } from '@/lib/validation'
import { SUGGESTED_SKILLS } from '@/lib/constants'
import type { Profile } from '@/lib/types'

export function OnboardingForm({ profile, email }: { profile: Profile | null; email: string }) {
  const router = useRouter()
  const [skills, setSkills] = useState({
    expertise: profile?.skills.filter((s) => s.kind === 'expertise').map((s) => s.name) ?? [],
    interest: profile?.skills.filter((s) => s.kind === 'interest').map((s) => s.name) ?? [],
    learning: profile?.skills.filter((s) => s.kind === 'learning').map((s) => s.name) ?? [],
    help: profile?.skills.filter((s) => s.kind === 'help').map((s) => s.name) ?? [],
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile?.display_name ?? '',
      profession: profile?.profession ?? '',
      location: profile?.location ?? '',
      bio: profile?.bio ?? '',
    },
  })

  const displayName = watch('displayName') || 'New member'

  async function onSubmit(values: ProfileInput) {
    setError(null)
    const result = await saveOnboardingAction({
      ...values,
      avatarUrl: avatarUrl ?? '',
      skills,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.push('/home')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Your profile</span>
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11.5px] text-muted-foreground">{email}</span>
        </div>
        <AvatarPicker name={displayName} value={avatarUrl} onChange={setAvatarUrl} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" className="mt-1.5" placeholder="Ahmed Hassan" {...register('displayName')} />
            <FieldError message={errors.displayName?.message} />
          </div>
          <div>
            <Label htmlFor="profession">Profession or study</Label>
            <Input
              id="profession"
              className="mt-1.5"
              placeholder="AI Engineer, Mechatronics student…"
              {...register('profession')}
            />
            <FieldError message={errors.profession?.message} />
          </div>
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" className="mt-1.5" placeholder="Cairo, Egypt" {...register('location')} />
        </div>
        <div>
          <Label htmlFor="bio">Short bio</Label>
          <Textarea
            id="bio"
            className="mt-1.5 min-h-24"
            placeholder="What do you work on, and what kind of problems do you like?"
            {...register('bio')}
          />
          <FieldHint>Two or three sentences is plenty. This is what people see when they consider connecting.</FieldHint>
          <FieldError message={errors.bio?.message} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Skills & interests</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <SkillEditor
          label="Skills you have"
          hint="These drive contributor matching. Press Enter or comma to add."
          value={skills.expertise}
          onChange={(expertise) => setSkills((prev) => ({ ...prev, expertise }))}
          placeholder="e.g. Python"
          suggestions={SUGGESTED_SKILLS}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SkillEditor
            label="Areas of interest"
            value={skills.interest}
            onChange={(interest) => setSkills((prev) => ({ ...prev, interest }))}
            placeholder="e.g. Robotics"
          />
          <SkillEditor
            label="Skills you want to learn"
            value={skills.learning}
            onChange={(learning) => setSkills((prev) => ({ ...prev, learning }))}
            placeholder="e.g. ROS"
          />
        </div>
        <SkillEditor
          label="Where you can help others"
          hint="Optional. Reviews, teaching, data collection, advice — whatever you are happy to be asked for."
          value={skills.help}
          onChange={(help) => setSkills((prev) => ({ ...prev, help }))}
          placeholder="e.g. Technical writing"
        />
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-[12px] text-muted-foreground">
          You can edit all of this later from your profile.
        </p>
        <Button type="submit" variant="gradient" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          {isSubmitting ? 'Saving…' : 'Finish setup'}
          {!isSubmitting ? <ArrowRight /> : null}
        </Button>
      </div>
    </form>
  )
}
