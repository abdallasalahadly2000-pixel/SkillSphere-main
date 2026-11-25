import type { Contribution, Problem, Profile, RecommendedUser } from './types'

/**
 * Explainable contributor matching.
 *
 * Transparent, deterministic scoring over real profile + problem data:
 *   required-skill coverage   55 points
 *   stated interests          15 points
 *   contribution history      20 points
 *   profile relevance         10 points
 *
 * Popularity (follower/connection counts) is deliberately not part of the
 * score. Every suggestion carries the evidence that produced it.
 */

const KIND_WEIGHT: Record<string, number> = {
  expertise: 1,
  help: 0.8,
  interest: 0.55,
  learning: 0.25,
}

const norm = (value: string) => value.trim().toLowerCase()

function skillMatches(required: string, candidate: string): boolean {
  const a = norm(required)
  const b = norm(candidate)
  if (!a || !b) return false
  if (a === b) return true
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return true
  const aWords = a.split(/[\s/&-]+/).filter((w) => w.length > 2)
  const bWords = b.split(/[\s/&-]+/).filter((w) => w.length > 2)
  return aWords.some((word) => bWords.includes(word))
}

export function rankContributors(options: {
  problem: Problem
  candidates: Profile[]
  contributionsByUser: Map<string, Contribution[]>
  excludeUserId?: string | null
  limit?: number
}): RecommendedUser[] {
  const { problem, candidates, contributionsByUser, excludeUserId, limit = 4 } = options
  const required = problem.required_skills
  const tagSet = new Set(problem.tags.map(norm))

  const scored = candidates
    .filter((profile) => profile.id !== excludeUserId && profile.id !== problem.owner_id)
    .map<RecommendedUser>((profile) => {
      const reasons: string[] = []

      // 1. Required-skill coverage (55)
      const matchedSkills: string[] = []
      let skillCredit = 0
      for (const skill of required) {
        const best = profile.skills
          .filter((entry) => skillMatches(skill, entry.name))
          .sort((a, b) => (KIND_WEIGHT[b.kind] ?? 0) - (KIND_WEIGHT[a.kind] ?? 0))[0]
        if (best) {
          matchedSkills.push(skill)
          skillCredit += KIND_WEIGHT[best.kind] ?? 0.25
        }
      }
      const skillScore = required.length ? (skillCredit / required.length) * 55 : 0
      if (matchedSkills.length) {
        reasons.push(
          `Has ${matchedSkills.length} of the ${required.length} required skills: ${matchedSkills.slice(0, 3).join(', ')}`,
        )
      }

      // 2. Interests (15)
      const interestEntries = profile.skills.filter((s) => s.kind === 'interest' || s.kind === 'learning')
      const matchedInterest = interestEntries.find(
        (entry) =>
          tagSet.has(norm(entry.name)) ||
          required.some((skill) => skillMatches(skill, entry.name)) ||
          norm(entry.name).includes(norm(problem.category.replace(/-/g, ' '))),
      )
      const interestScore = matchedInterest ? 15 : 0
      if (matchedInterest) {
        reasons.push(`Lists “${matchedInterest.name}” as an area of interest`)
      }

      // 3. Contribution history (20)
      const history = contributionsByUser.get(profile.id) ?? []
      const related = history.filter((contribution) => {
        const target = contribution.problem
        if (!target) return false
        const tagOverlap = (target.tags ?? []).some((tag) => tagSet.has(norm(tag)))
        return target.category === problem.category || tagOverlap
      })
      const historyScore = Math.min(20, related.length * 10)
      if (related.length) {
        const example = related[0].problem?.title
        reasons.push(
          `Has contributed to ${related.length} similar problem${related.length > 1 ? 's' : ''}${
            example ? `, e.g. “${example}”` : ''
          }`,
        )
      }

      // 4. Profile relevance (10)
      const categoryWords = problem.category.replace(/-/g, ' ').split(' ')
      const profileText = `${profile.profession ?? ''} ${profile.bio ?? ''}`.toLowerCase()
      const profileRelevant = categoryWords.some((word) => word.length > 3 && profileText.includes(word))
      const profileScore = profileRelevant ? 10 : profile.bio ? 4 : 0
      if (profileRelevant && profile.profession) {
        reasons.push(`Works as ${profile.profession}, which is in this problem's field`)
      }

      const score = Math.round(skillScore + interestScore + historyScore + profileScore)
      const strength: RecommendedUser['strength'] = score >= 45 ? 'strong' : score >= 24 ? 'good' : 'related'

      if (!reasons.length) {
        reasons.push('Active member with a profile in a nearby field')
      }

      return { profile, score, strength, reasons }
    })
    .filter((entry) => entry.score >= 12)
    .sort((a, b) => b.score - a.score || a.profile.display_name.localeCompare(b.profile.display_name))

  return scored.slice(0, limit)
}
