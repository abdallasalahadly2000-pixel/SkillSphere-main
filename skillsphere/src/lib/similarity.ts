import type { Problem, SimilarProblem } from './types'

/**
 * Practical related-problem discovery: shared tags, required skills, category
 * and keyword overlap. This is keyword-level similarity, not embeddings — the
 * UI says so, and every match lists the evidence.
 */

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'have',
  'has',
  'are',
  'was',
  'were',
  'our',
  'you',
  'your',
  'but',
  'not',
  'when',
  'how',
  'what',
  'why',
  'can',
  'could',
  'would',
  'should',
  'into',
  'over',
  'under',
  'about',
  'more',
  'most',
  'some',
  'than',
  'then',
  'they',
  'them',
  'their',
  'there',
  'here',
  'been',
  'being',
  'because',
  'while',
  'also',
  'just',
  'only',
  'very',
  'much',
  'make',
  'made',
  'using',
  'used',
  'use',
  'want',
  'need',
  'like',
  'look',
  'looking',
  'help',
  'problem',
  'problems',
  'work',
  'works',
  'working',
  'which',
  'where',
  'will',
  'does',
  'did',
  'one',
  'two',
  'all',
  'any',
  'out',
  'get',
  'got',
])

export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ''))
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word))
  return new Set(words)
}

export function findSimilarProblems(
  problem: Problem,
  candidates: Problem[],
  limit = 3,
): SimilarProblem[] {
  const baseTokens = tokenize(`${problem.title} ${problem.description}`)
  const baseTags = new Set(problem.tags.map((tag) => tag.toLowerCase()))
  const baseSkills = new Set(problem.required_skills.map((skill) => skill.toLowerCase()))

  return candidates
    .filter((candidate) => candidate.id !== problem.id)
    .map<SimilarProblem>((candidate) => {
      const reasons: string[] = []

      const sharedTags = candidate.tags.filter((tag) => baseTags.has(tag.toLowerCase()))
      const tagScore = Math.min(12, sharedTags.length * 3)
      if (sharedTags.length) {
        reasons.push(`Shares ${sharedTags.length} tag${sharedTags.length > 1 ? 's' : ''}: ${sharedTags.join(', ')}`)
      }

      const sharedSkills = candidate.required_skills.filter((skill) => baseSkills.has(skill.toLowerCase()))
      const skillScore = Math.min(8, sharedSkills.length * 2)
      if (sharedSkills.length) {
        reasons.push(`Also needs ${sharedSkills.slice(0, 3).join(', ')}`)
      }

      const sameCategory = candidate.category === problem.category
      const categoryScore = sameCategory ? 2 : 0
      if (sameCategory) reasons.push('Same category')

      const candidateTokens = tokenize(`${candidate.title} ${candidate.description}`)
      let overlap = 0
      for (const token of candidateTokens) if (baseTokens.has(token)) overlap += 1
      const union = new Set([...baseTokens, ...candidateTokens]).size || 1
      const textScore = (overlap / union) * 6
      if (overlap >= 3) {
        reasons.push(`Similar wording (${overlap} shared keywords)`)
      }

      return { problem: candidate, score: tagScore + skillScore + categoryScore + textScore, reasons }
    })
    .filter((entry) => entry.score >= 3 && entry.reasons.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
