'use client'
import type { Problem } from '@/lib/types'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRight,
  Check,
  Eye,
  Loader2,
  Save,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/input'
import { FieldError, FieldHint, Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SkillEditor } from '@/components/skill-editor'
import { ProblemCard } from '@/components/problem-card'
import { createProblemAction, updateProblemAction } from '@/actions/problems'
import { problemFormSchema, type ProblemFormInput } from '@/lib/validation'
import {
  CATEGORIES,
  HELP_TYPES,
  MAX_SKILLS_PER_PROBLEM,
  MAX_TAGS,
  SUGGESTED_SKILLS,
  type Category,
  type HelpType,
} from '@/lib/constants'

type Draft = {
  title: string
  description: string
  category: string
  helpType: string
  tags: string[]
  requiredSkills: string[]
  attachmentUrl: string
  savedAt: string
}

export function ProblemForm({
  mode,
  problem,
  defaults,
  owner,
}: {
  mode: 'create' | 'edit'
  problem?: Problem
  
  defaults?: { title?: string; description?: string }
  owner: { name: string; avatarUrl: string | null; id: string }
}) {
  const router = useRouter()
  const draftKey = `skillsphere:draft:${problem?.id ?? 'new'}`
  const [tags, setTags] = useState<string[]>(problem?.tags ?? [])
  const [skills, setSkills] = useState<string[]>(problem?.required_skills ?? [])
  const [serverError, setServerError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const restoredRef = useRef(false)

const {
  register,
  handleSubmit,
  watch,
  reset,
    formState: { errors, isSubmitting },
  } = useForm<ProblemFormInput>({
    resolver: zodResolver(problemFormSchema),
    defaultValues: {
      title: problem?.title ?? defaults?.title ?? '',
      description: problem?.description ?? defaults?.description ?? '',
      category: (problem?.category ?? 'programming') as Category,
      helpType: (problem?.help_type ?? 'advice') as HelpType,
      attachmentUrl: problem?.attachment_url ?? '',
    },
  })

  const values = watch()

  // Restore a locally saved draft once, without overwriting a real problem.
  useEffect(() => {
    if (mode !== 'create' || restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = window.localStorage.getItem(draftKey)
      if (!raw) return
      const draft = JSON.parse(raw) as Draft
      if (!draft.title && !draft.description) return
      reset({
        title: draft.title ?? '',
        description: draft.description ?? '',
        category: (draft.category ?? 'programming') as Category,
        helpType: (draft.helpType ?? 'advice') as HelpType,
        attachmentUrl: draft.attachmentUrl ?? '',
      })
      setTags(draft.tags ?? [])
      setSkills(draft.requiredSkills ?? [])
      setDraftNotice(draft.savedAt ? new Date(draft.savedAt).toLocaleString() : 'earlier')
    } catch {
      // ignore malformed drafts
    }
  }, [draftKey, mode, reset])

  // Debounced local draft save.
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft: Draft = {
        title: values.title ?? '',
        description: values.description ?? '',
        category: values.category ?? 'programming',
        helpType: values.helpType ?? 'advice',
        tags,
        requiredSkills: skills,
        attachmentUrl: values.attachmentUrl ?? '',
        savedAt: new Date().toISOString(),
      }
      if (!draft.title && !draft.description) return
      try {
        window.localStorage.setItem(draftKey, JSON.stringify(draft))
        setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      } catch {
        // storage may be unavailable; drafts are a convenience only
      }
    }, 900)
    return () => clearTimeout(timer)
  }, [draftKey, skills, tags, values.attachmentUrl, values.category, values.description, values.helpType, values.title])



  async function onSubmit(input: ProblemFormInput) {
    setServerError(null)
    const payload = {
      ...input,
      attachmentUrl: input.attachmentUrl ?? '',
      tags,
      requiredSkills: skills,
    }
    const result =
      mode === 'create'
        ? await createProblemAction(payload)
        : await updateProblemAction(problem!.id, payload)

    if (!result.ok) {
      setServerError(result.error)
      return
    }
    window.localStorage.removeItem(draftKey)
    let id = problem?.id ?? ''
    if (mode === 'create' && result.ok && result.data) id = result.data.id
    router.push(id ? `/problems/${id}` : '/problems')
    router.refresh()
  }

  const previewProblem: Problem = {
    id: problem?.id ?? 'preview',
    owner_id: owner.id,
    title: values.title || 'Your problem title',
    description: values.description || 'Your description will appear here.',
    category: (values.category ?? 'general') as Category,
    help_type: (values.helpType ?? 'advice') as HelpType,
    status: problem?.status ?? 'open',
    tags,
    required_skills: skills,
    ai_analysis: null,
    cover_url: problem?.cover_url ?? null,
    attachment_url: values.attachmentUrl || null,
    is_demo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner: { id: owner.id, display_name: owner.name, avatar_url: owner.avatarUrl, profession: null },
    comment_count: problem?.comment_count ?? 0,
    contributor_count: problem?.contributor_count ?? 0,
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 lg:grid-cols-[1.5fr_1fr]" noValidate>
      <div className="space-y-5">
        {draftNotice ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-800">
            <Save className="size-4" /> Local draft from {draftNotice} restored.
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline"
              onClick={() => {
                window.localStorage.removeItem(draftKey)
                reset({ title: '', description: '', category: 'programming', helpType: 'advice', attachmentUrl: '' })
                setTags([])
                setSkills([])
                setDraftNotice(null)
              }}
            >
              <X className="size-3" /> Discard
            </button>
          </div>
        ) : null}

        <Card className="space-y-4 p-5">
          <div>
            <Label htmlFor="title">Problem title</Label>
            <Input
              id="title"
              className="mt-1.5"
              placeholder="Improve robot navigation in changing lighting conditions"
              maxLength={160}
              {...register('title')}
            />
            <FieldError message={errors.title?.message} />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Detailed description</Label>
              <span className="text-[11px] text-muted-foreground">{(values.description ?? '').length}/8000</span>
            </div>
            <Textarea
              id="description"
              className="mt-1.5 min-h-48"
              placeholder="What is happening, what have you tried, what constraints matter, and what kind of help would be useful?"
              maxLength={8000}
              {...register('description')}
            />
            <FieldHint>Specifics help: what you tried, what failed, what tools you have.</FieldHint>
            <FieldError message={errors.description?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" className="mt-1.5" {...register('category')}>
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="helpType">Type of help needed</Label>
              <Select id="helpType" className="mt-1.5" {...register('helpType')}>
                {HELP_TYPES.map((help) => (
                  <option key={help.value} value={help.value}>
                    {help.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SkillEditor
              label="Relevant tags"
              hint={`Up to ${MAX_TAGS}. Used to find related problems.`}
              value={tags}
              onChange={setTags}
              placeholder="e.g. robotics"
              suggestions={['robotics', 'computer-vision', 'slam', 'dataset-quality', 'education']}
              max={MAX_TAGS}
            />
            <SkillEditor
              label="Required skills"
              hint={`Up to ${MAX_SKILLS_PER_PROBLEM}. Drives contributor matching.`}
              value={skills}
              onChange={setSkills}
              placeholder="e.g. Python"
              suggestions={SUGGESTED_SKILLS}
              max={MAX_SKILLS_PER_PROBLEM}
            />
          </div>

          <div>
            <Label htmlFor="attachmentUrl">Attachment link (optional)</Label>
            <Input
              id="attachmentUrl"
              className="mt-1.5"
              placeholder="https://… link to a dataset, image, repo or document"
              {...register('attachmentUrl')}
            />
            <FieldHint>
              Links only for now — file uploads need Supabase Storage configured (see README).
            </FieldHint>
          </div>
        </Card>


        {serverError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
            {serverError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="gradient" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            {isSubmitting ? 'Saving…' : mode === 'create' ? 'Publish problem' : 'Save changes'}
            {!isSubmitting ? <ArrowRight /> : null}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => setPreviewOpen(true)}>
            <Eye /> Preview
          </Button>
          {savedAt ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Save className="size-3.5" /> Draft saved locally at {savedAt}
            </span>
          ) : null}
        </div>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <h2 className="text-[13.5px] font-semibold text-foreground">What makes a good problem post</h2>
          <ul className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
            {[
              'State what is happening now, not only what you want.',
              'Include what you already tried and what failed.',
              'Name the tools and constraints that matter.',
              'Say which kind of help would actually be useful.',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-success" /> {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="text-[13.5px] font-semibold text-foreground">How this is used</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            Your required skills help match contributors to your problem.
            Tags help people discover related problems and collaborate.
          </p>
        </Card>
      </aside>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <ProblemCard problem={previewProblem} />
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            This is how the problem will appear in the feed. Nothing has been published yet.
          </p>
        </DialogContent>
      </Dialog>
    </form>
  )
}
