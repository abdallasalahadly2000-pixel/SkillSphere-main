import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Local demo backend.
 *
 * This is a real SQLite database (Node's built-in `node:sqlite`) that mirrors
 * the Supabase schema in `supabase/migrations`. It exists so the MVP runs and
 * can be demonstrated without cloud credentials. When
 * NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are set, the app
 * uses Supabase instead and this module is never opened.
 */

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  profession TEXT,
  location TEXT,
  onboarding_complete INTEGER NOT NULL DEFAULT 1,
  profile_visibility TEXT NOT NULL DEFAULT 'public',
  show_email INTEGER NOT NULL DEFAULT 0,
  notify_connections INTEGER NOT NULL DEFAULT 1,
  notify_comments INTEGER NOT NULL DEFAULT 1,
  notify_tasks INTEGER NOT NULL DEFAULT 1,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  UNIQUE (user_id, name, kind)
);

CREATE TABLE IF NOT EXISTS problems (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  help_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  required_skills TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  ai_analysis TEXT,
  attachment_url TEXT,
  cover_url TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS problems_created_idx ON problems (created_at DESC);
CREATE INDEX IF NOT EXISTS problems_owner_idx ON problems (owner_id);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_problem_idx ON comments (problem_id);

CREATE TABLE IF NOT EXISTS comment_helpful (
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  UNIQUE (requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  added_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contributors (
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (problem_id, user_id)
);

CREATE TABLE IF NOT EXISTS solutions (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  outcome_status TEXT NOT NULL,
  outcome_description TEXT NOT NULL,
  attempted TEXT NOT NULL,
  worked TEXT NOT NULL,
  evidence TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  solution_id TEXT REFERENCES solutions(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  confirmed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`

const DEMO_PASSWORD = 'SkillSphere123!'

export const DEMO_ACCOUNT = {
  email: 'ahmed@demo.skillsphere.app',
  password: DEMO_PASSWORD,
}

const P = {
  ahmed: 'a0000000-0000-4000-8000-000000000001',
  omar: 'a0000000-0000-4000-8000-000000000002',
  mona: 'a0000000-0000-4000-8000-000000000003',
  sarah: 'a0000000-0000-4000-8000-000000000004',
  layla: 'a0000000-0000-4000-8000-000000000005',
  nadir: 'a0000000-0000-4000-8000-000000000006',
}

const PR = {
  robot: 'b0000000-0000-4000-8000-000000000001',
  cracks: 'b0000000-0000-4000-8000-000000000002',
  sensor: 'b0000000-0000-4000-8000-000000000003',
  people: 'b0000000-0000-4000-8000-000000000004',
  panel: 'b0000000-0000-4000-8000-000000000005',
  maths: 'b0000000-0000-4000-8000-000000000006',
  pricing: 'b0000000-0000-4000-8000-000000000007',
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const derived = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

export { hashPassword }

function daysAgo(days: number, hours = 0): string {
  return new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString()
}

type Seed = {
  users: Array<{
    id: string
    name: string
    email: string
    profession: string
    location: string
    bio: string
    skills: Array<[string, string]>
    createdDaysAgo: number
  }>
}

const SEED_PROFILES: Seed['users'] = [
  {
    id: P.ahmed,
    name: 'Ahmed Hassan',
    email: DEMO_ACCOUNT.email,
    profession: 'AI Engineer',
    location: 'Cairo, Egypt',
    bio: 'I build perception and navigation systems for mobile robots, and I like problems that sit between machine learning and the physical world.',
    skills: [
      ['Python', 'expertise'],
      ['Robotics', 'expertise'],
      ['Computer Vision', 'expertise'],
      ['Machine Learning', 'expertise'],
      ['ROS', 'interest'],
      ['Embedded Systems', 'learning'],
      ['Technical Writing', 'help'],
    ],
    createdDaysAgo: 120,
  },
  {
    id: P.omar,
    name: 'Omar Khaled',
    email: 'omar@demo.skillsphere.app',
    profession: 'Robotics Engineer',
    location: 'Alexandria, Egypt',
    bio: 'Field robotics, ROS 2 and the unglamorous work of making a robot survive a real building. I have debugged more localisation failures than I can count.',
    skills: [
      ['ROS', 'expertise'],
      ['Embedded Systems', 'expertise'],
      ['C++', 'expertise'],
      ['Robotics', 'interest'],
      ['Computer Vision', 'help'],
      ['Python', 'help'],
    ],
    createdDaysAgo: 96,
  },
  {
    id: P.mona,
    name: 'Mona Hassan',
    email: 'mona@demo.skillsphere.app',
    profession: 'Data Scientist & Researcher',
    location: 'Giza, Egypt',
    bio: 'I work on measurement: how do you know the thing you built actually works? Interested in statistics, evaluation and research design.',
    skills: [
      ['Statistics', 'expertise'],
      ['Python', 'expertise'],
      ['Research Methods', 'expertise'],
      ['Data Science', 'interest'],
      ['Machine Learning', 'help'],
      ['Mathematics', 'help'],
    ],
    createdDaysAgo: 88,
  },
  {
    id: P.sarah,
    name: 'Sarah Ahmed',
    email: 'sarah@demo.skillsphere.app',
    profession: 'Computer Vision Engineer',
    location: 'Cairo, Egypt',
    bio: 'Visual place recognition and learned features. I care a lot about how models behave when the input distribution shifts.',
    skills: [
      ['Computer Vision', 'expertise'],
      ['Python', 'expertise'],
      ['Machine Learning', 'expertise'],
      ['Robotics', 'interest'],
      ['ROS', 'learning'],
    ],
    createdDaysAgo: 61,
  },
  {
    id: P.layla,
    name: 'Layla Mansour',
    email: 'layla@demo.skillsphere.app',
    profession: 'Product Designer',
    location: 'Cairo, Egypt',
    bio: 'Interfaces for people who are busy, outdoors, or wearing gloves. I run usability sessions and turn them into design decisions.',
    skills: [
      ['UI/UX Design', 'expertise'],
      ['Product Design', 'expertise'],
      ['Research Methods', 'interest'],
      ['Technical Writing', 'help'],
    ],
    createdDaysAgo: 44,
  },
  {
    id: P.nadir,
    name: 'Nadir Fahmy',
    email: 'nadir@demo.skillsphere.app',
    profession: 'Embedded Systems Engineer',
    location: 'Mansoura, Egypt',
    bio: 'Firmware, sensors and timing. I like the part of robotics where the datasheet is the source of truth.',
    skills: [
      ['Embedded Systems', 'expertise'],
      ['C++', 'expertise'],
      ['ROS', 'help'],
      ['Robotics', 'interest'],
    ],
    createdDaysAgo: 33,
  },
]

function seed(db: DatabaseSync) {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM problems').get() as { n: number }
  if (existing.n > 0) return

  const insertUser = db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
  const insertProfile = db.prepare(
    `INSERT INTO profiles (id, display_name, username, bio, profession, location, onboarding_complete, is_demo, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`,
  )
  const insertSkill = db.prepare('INSERT INTO user_skills (user_id, name, kind) VALUES (?, ?, ?)')

  for (const person of SEED_PROFILES) {
    insertUser.run(person.id, person.email, hashPassword(DEMO_PASSWORD), daysAgo(person.createdDaysAgo))
    insertProfile.run(
      person.id,
      person.name,
      person.name.toLowerCase().replace(/\s+/g, '-'),
      person.bio,
      person.profession,
      person.location,
      daysAgo(person.createdDaysAgo),
    )
    for (const [name, kind] of person.skills) insertSkill.run(person.id, name, kind)
  }

  const insertProblem = db.prepare(
    `INSERT INTO problems (id, owner_id, title, description, category, help_type, status, required_skills, tags, ai_analysis, cover_url, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  )

  const problems = [
    {
      id: PR.robot,
      owner: P.ahmed,
      cover: '/challenges/robot-slam.jpg',
      title: 'Improve robot navigation in changing lighting conditions',
      description:
        'Our differential-drive robot uses a visual SLAM stack (ROS 2 + RealSense D435i on a Jetson Orin Nano) to navigate a lab floor. It tracks position well until the lighting changes: when the blinds open in the afternoon, or when half the ceiling lights are switched off, the pose estimate drifts and re-localisation takes 30-60 seconds. Twice the robot has driven into a wall during that window.\n\nWe have wheel odometry and an IMU as well, but fusing them naively made things worse in the first test. I want to understand why the visual front end fails so abruptly, and whether a small change (more robust features, better keyframe handling, adding a cheap depth cue) would fix it before we consider retraining anything.\n\nWhat we can offer: full access to the logs, the lab, and the robot for experiments. What we need: people who have seen visual place recognition degrade under illumination change and can help us design a fair comparison.',
      category: 'engineering-robotics',
      helpType: 'collaboration',
      status: 'in_progress',
      skills: ['ROS', 'Computer Vision', 'Python', 'Embedded Systems'],
      tags: ['robotics', 'slam', 'computer-vision', 'localisation'],
      created: daysAgo(9, 3),
      updated: daysAgo(1, 2),
      analysis: {
        main_problem:
          'Visual SLAM loses reliable pose tracking when scene illumination changes abruptly, forcing slow re-localisation and unsafe motion.',
        objective:
          'Identify why the visual front end degrades under lighting change and select a change that restores stable localisation without a full retrain.',
        required_skills: ['ROS', 'Computer Vision', 'Python', 'Sensor Fusion', 'Embedded Systems'],
        keywords: ['visual SLAM', 'place recognition', 'illumination change', 're-localisation', 'sensor fusion'],
        category: 'engineering-robotics',
        missing_information: [
          'Which SLAM package and front end are in use (ORB-SLAM3, RTAB-Map, Isaac ROS)?',
          'Whether tracking is lost entirely or the pose drifts gradually',
          'How the IMU and wheel odometry are currently fused, and at what rate',
        ],
        investigation_directions: [
          'Log inlier feature counts per frame across a controlled lighting sweep to find the failure threshold',
          'Compare hand-crafted features against a learned front end on the same recorded sequences',
          'Test a relocalisation trigger based on feature-count drop rather than tracking loss',
        ],
      },
    },
    {
      id: PR.cracks,
      owner: P.sarah,
      cover: '/challenges/concrete-cracks.jpg',
      title: 'Detecting hairline cracks in concrete from drone photos',
      description:
        'We have about 4,000 drone images of building facades taken at different heights and times of day. The cracks we care about are thin (often 1-3 pixels wide) and frequently run next to window frames or tile grout, which the current model confuses them with.\n\nOur segmentation model reaches a decent score on our test split but misses most of the hairline cases in practice. I suspect the annotation protocol is part of the problem: two annotators labelled the same 200 images and disagreed on roughly a third of the cracks.\n\nLooking for help designing a labelling guideline and an evaluation that reflects what inspectors actually need.',
      category: 'ai-ml',
      helpType: 'research',
      status: 'open',
      skills: ['Computer Vision', 'Machine Learning', 'Statistics'],
      tags: ['computer-vision', 'segmentation', 'dataset-quality'],
      created: daysAgo(6, 5),
      updated: daysAgo(6, 5),
      analysis: null,
    },
    {
      id: PR.sensor,
      owner: P.nadir,
      title: 'How do we model uncertainty in low-light sensor fusion?',
      description:
        'We fuse a time-of-flight distance sensor with a camera in a dim indoor environment. The ToF readings get noisy in a way that is clearly not Gaussian: occasional large outliers when the target is dark, and a bias that depends on ambient light.\n\nA Kalman filter with fixed process and measurement noise is producing overconfident estimates. I would like to compare a small number of practical alternatives (adaptive covariance, robust loss, a learned noise model) without pretending we have the data to train something large.',
      category: 'science-research',
      helpType: 'advice',
      status: 'open',
      skills: ['Statistics', 'Embedded Systems', 'Python'],
      tags: ['sensor-fusion', 'uncertainty', 'state-estimation'],
      created: daysAgo(4, 1),
      updated: daysAgo(3, 4),
      analysis: null,
    },
    {
      id: PR.people,
      owner: P.mona,
      cover: '/challenges/people-counter.jpg',
      title: 'Our people counter reports ghosts when someone stops to read a poster',
      description:
        'A retail client uses our camera-based people counter. It works well in corridors, but near a poster stand people pause for several seconds and the tracker emits duplicate entries, inflating the count by 15-20% at peak.\n\nWe have two weeks of annotated footage. The tracker is a simple IoU-based association on top of a detector. I want to reduce duplicates without losing the people who genuinely enter twice.\n\nWe can share the annotated clips and the evaluation script.',
      category: 'ai-ml',
      helpType: 'review',
      status: 'in_progress',
      skills: ['Computer Vision', 'Python', 'Machine Learning'],
      tags: ['tracking', 'computer-vision', 'evaluation'],
      created: daysAgo(13, 2),
      updated: daysAgo(2, 6),
      analysis: null,
    },
    {
      id: PR.panel,
      owner: P.layla,
      cover: '/challenges/control-panel.jpg',
      title: 'Design an accessible control panel for field robots',
      description:
        'Operators use a tablet to take manual control of a field robot. In testing, three of five operators pressed the wrong control while wearing gloves, and the emergency stop was the least discoverable element on the screen.\n\nI want to redesign the control layout around gloved use and outdoor glare. Looking for people who have designed for constrained input or industrial environments, and ideally someone who can test with actual operators.',
      category: 'design-creativity',
      helpType: 'collaboration',
      status: 'open',
      skills: ['UI/UX Design', 'Product Design', 'Research Methods'],
      tags: ['accessibility', 'hci', 'field-robotics'],
      created: daysAgo(3, 7),
      updated: daysAgo(3, 7),
      analysis: null,
    },
    {
      id: PR.maths,
      owner: P.mona,
      title: 'First-year engineering students keep failing the same calculus concept',
      description:
        'Across two semesters, about 40% of students lose marks on the same idea: interpreting the derivative as a rate of change in a physical context. They can differentiate mechanically but cannot set up the expression from a word problem.\n\nI have quiz results and a small set of think-aloud interviews. I am looking for teaching approaches that target the modelling step specifically, and a way to measure whether they help that is not just another exam.',
      category: 'education',
      helpType: 'research',
      status: 'open',
      skills: ['Mathematics', 'Teaching', 'Research Methods'],
      tags: ['education', 'mathematics', 'assessment'],
      created: daysAgo(17, 4),
      updated: daysAgo(11, 1),
      analysis: null,
    },
    {
      id: PR.pricing,
      owner: P.ahmed,
      title: 'Validate a pricing experiment without enough traffic',
      description:
        'We changed the price of our team plan for a month and saw a 9% drop in conversions with 1,100 visitors. Leadership wants to know whether the change is real before we revert.\n\nOur traffic is too low for a clean A/B test, and the change overlapped with a marketing campaign, which makes the comparison messy. Looking for a statistically honest way to decide, including the option of saying "we cannot tell yet".',
      category: 'business',
      helpType: 'advice',
      status: 'solved',
      skills: ['Statistics', 'Business Strategy', 'Data Science'],
      tags: ['experimentation', 'statistics', 'pricing'],
      created: daysAgo(26, 2),
      updated: daysAgo(12, 3),
      analysis: null,
    },
  ]

  for (const problem of problems) {
    insertProblem.run(
      problem.id,
      problem.owner,
      problem.title,
      problem.description,
      problem.category,
      problem.helpType,
      problem.status,
      JSON.stringify(problem.skills),
      JSON.stringify(problem.tags),
      problem.analysis ? JSON.stringify(problem.analysis) : null,
      ('cover' in problem ? (problem as { cover?: string | null }).cover ?? null : null),
      problem.created,
      problem.updated,
    )
  }

  const insertComment = db.prepare(
    'INSERT INTO comments (id, problem_id, author_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const insertHelpful = db.prepare('INSERT INTO comment_helpful (comment_id, user_id) VALUES (?, ?)')

  const comments: Array<[string, string, string, string, string, string[]]> = [
    [
      'c0000000-0000-4000-8000-000000000001',
      PR.robot,
      P.omar,
      'Before changing the front end, log the number of tracked features per frame and the reprojection error across a controlled lighting sweep. In our case the failure was not gradual: below roughly 90 tracked features the pose solution became unstable, and the filter happily accepted it. A feature-count based relocalisation trigger fixed more than swapping descriptors did.',
      daysAgo(7, 2),
      [P.ahmed, P.sarah, P.mona, P.nadir],
    ],
    [
      'c0000000-0000-4000-8000-000000000002',
      PR.robot,
      P.mona,
      'This reads like covariate shift in the place-recognition step rather than a modelling failure. If you want a fair comparison, fix the evaluation first: same recorded sequences, same start pose, and report time-to-relocalise and drift at fixed checkpoints. Otherwise every change will look like an improvement.',
      daysAgo(5, 6),
      [P.ahmed, P.omar, P.sarah],
    ],
    [
      'c0000000-0000-4000-8000-000000000003',
      PR.robot,
      P.sarah,
      'We hit something similar on an AGV in a warehouse. Exposure compensation on the camera plus keeping a small bank of keyframes from each lighting condition made re-localisation much faster. It is a cheap thing to try before retraining anything.',
      daysAgo(2, 4),
      [P.ahmed, P.omar],
    ],
    [
      'c0000000-0000-4000-8000-000000000004',
      PR.cracks,
      P.mona,
      'The inter-annotator disagreement is the most useful number you have. Before modelling, I would run a small calibration round: annotate ten images together, agree on what counts as a crack at 1-3 px, then re-score agreement. It is common for the ceiling to be the labelling protocol, not the model.',
      daysAgo(5, 1),
      [P.sarah, P.layla],
    ],
    [
      'c0000000-0000-4000-8000-000000000005',
      PR.pricing,
      P.mona,
      'With 1,100 visitors and a 9% relative change, the interval is wide enough that I would not call it either way. The honest answer is that the campaign contamination makes this uninterpretable; a sequential test on the next four weeks, without a campaign, would give you a decision rule instead of a guess.',
      daysAgo(14, 5),
      [P.ahmed, P.sarah, P.layla],
    ],
  ]

  for (const [id, problemId, authorId, body, createdAt, helpfulBy] of comments) {
    insertComment.run(id, problemId, authorId, body, createdAt, createdAt)
    for (const userId of helpfulBy) insertHelpful.run(id, userId)
  }

  const insertTask = db.prepare(
    'INSERT INTO tasks (id, problem_id, title, description, assignee_id, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
  const tasks: Array<[string, string, string, string | null, string | null, string, string]> = [
    [
      'd0000000-0000-4000-8000-000000000001',
      PR.robot,
      'Reproduce the failure with controlled lighting',
      'Run the same 4-minute route with blinds open, blinds closed, and half lights off. Save rosbag files for each.',
      P.omar,
      'done',
      P.ahmed,
    ],
    [
      'd0000000-0000-4000-8000-000000000002',
      PR.robot,
      'Log tracked-feature counts across the lighting sweep',
      'Add a small node that records feature count, reprojection error and pose covariance per frame.',
      P.ahmed,
      'in_progress',
      P.ahmed,
    ],
    [
      'd0000000-0000-4000-8000-000000000003',
      PR.robot,
      'Compare ORB-SLAM3 against a learned front end on the same sequences',
      'Same start pose, same sequences, report time-to-relocalise and drift at fixed checkpoints.',
      P.nadir,
      'todo',
      P.ahmed,
    ],
    [
      'd0000000-0000-4000-8000-000000000004',
      PR.robot,
      'Write up findings and a recommended pipeline',
      'Short technical note we can share with the lab, including what did not work.',
      null,
      'todo',
      P.ahmed,
    ],
    [
      'd0000000-0000-4000-8000-000000000005',
      PR.people,
      'Rebuild the evaluation clips with pause segments marked',
      null,
      P.mona,
      'in_progress',
      P.mona,
    ],
  ]
  for (const [id, problemId, title, description, assignee, status, createdBy] of tasks) {
    insertTask.run(id, problemId, title, description, assignee, status, createdBy, daysAgo(6))
  }

  const insertResource = db.prepare(
    'INSERT INTO resources (id, problem_id, title, url, description, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
  const resources: Array<[string, string, string, string, string, string, string]> = [
    [
      'e0000000-0000-4000-8000-000000000001',
      PR.robot,
      'ORB-SLAM3 paper',
      'https://arxiv.org/abs/2007.11898',
      'The visual-inertial SLAM system we are currently running. Section 5 covers relocalisation.',
      P.ahmed,
      daysAgo(8),
    ],
    [
      'e0000000-0000-4000-8000-000000000002',
      PR.robot,
      'Nav2 documentation',
      'https://docs.nav2.org/',
      'Reference for the navigation stack; useful when we test recovery behaviours.',
      P.omar,
      daysAgo(7),
    ],
    [
      'e0000000-0000-4000-8000-000000000003',
      PR.robot,
      'SuperPoint + SuperGlue reference implementation',
      'https://github.com/magicleap/SuperGluePretrainedNetwork',
      'Learned features and matching; candidate for the comparison experiment.',
      P.sarah,
      daysAgo(2),
    ],
  ]
  for (const [id, problemId, title, url, description, addedBy, createdAt] of resources) {
    insertResource.run(id, problemId, title, url, description, addedBy, createdAt)
  }

  const insertContributor = db.prepare(
    'INSERT INTO contributors (problem_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
  )
  insertContributor.run(PR.robot, P.omar, 'Co-maintainer', daysAgo(8))
  insertContributor.run(PR.robot, P.mona, 'Research advisor', daysAgo(5))
  insertContributor.run(PR.people, P.sarah, 'Reviewer', daysAgo(10))

  const insertSolution = db.prepare(
    `INSERT INTO solutions (id, problem_id, author_id, outcome_status, outcome_description, attempted, worked, evidence, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  insertSolution.run(
    'f0000000-0000-4000-8000-000000000001',
    PR.pricing,
    P.ahmed,
    'partially_solved',
    'We could not conclude that the price change caused the conversion drop, and we said so. The team agreed to re-run the change as a sequential test after the campaign window instead of reverting on a noisy signal.',
    'Compared the month against the previous month, then against a matched weekday baseline, and finally computed a confidence interval for the difference in conversion rate.',
    'Writing down the decision rule before looking at the data. Once "we cannot tell yet" was an acceptable outcome, the conversation moved from arguing about the number to designing the next test.',
    'https://en.wikipedia.org/wiki/Sequential_probability_ratio_test',
    daysAgo(12, 3),
  )
  const insertContribution = db.prepare(
    'INSERT INTO contributions (id, user_id, problem_id, solution_id, summary, confirmed, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
  )
  insertContribution.run(
    'ab000000-0000-4000-8000-000000000001',
    P.mona,
    PR.pricing,
    'f0000000-0000-4000-8000-000000000001',
    'Designed the statistical framing and reviewed the confidence interval before the report was published.',
    daysAgo(12, 1),
  )
  insertContribution.run(
    'ab000000-0000-4000-8000-000000000002',
    P.ahmed,
    PR.pricing,
    'f0000000-0000-4000-8000-000000000001',
    'Ran the analysis and wrote the outcome report.',
    daysAgo(12, 1),
  )

  const insertConnection = db.prepare(
    'INSERT INTO connections (id, requester_id, addressee_id, status, created_at) VALUES (?, ?, ?, ?, ?)',
  )
  insertConnection.run('ac000000-0000-4000-8000-000000000001', P.ahmed, P.omar, 'accepted', daysAgo(20))
  insertConnection.run('ac000000-0000-4000-8000-000000000002', P.mona, P.ahmed, 'accepted', daysAgo(15))
  insertConnection.run('ac000000-0000-4000-8000-000000000003', P.sarah, P.ahmed, 'pending', daysAgo(2))
  insertConnection.run('ac000000-0000-4000-8000-000000000004', P.layla, P.omar, 'accepted', daysAgo(9))

  const insertAnnouncement = db.prepare('INSERT INTO announcements (id, title, body, created_at) VALUES (?, ?, ?, ?)')
  insertAnnouncement.run(
    'ad000000-0000-4000-8000-000000000001',
    'SkillSphere demo dataset loaded',
    'This instance is running on the local demo database. The people, problems and discussions below are seed data created for the hackathon demo, and every record is marked as demo content. Your own posts are stored alongside them and are never mixed in.',
    daysAgo(1),
  )
  insertAnnouncement.run(
    'ad000000-0000-4000-8000-000000000002',
    'How contributor matching works',
    'Recommendations are computed from your skills, interests and contribution history against each problem. Every suggestion shows the evidence behind it. There is no popularity ranking, and no hidden model: the scoring is in lib/matching.ts.',
    daysAgo(2),
  )
}

/*
 * Additional demo content.
 *
 * `seed()` only runs on an empty database. The routines below are idempotent so
 * that an existing `.data/skillsphere.db` also picks up the newer members,
 * problems and cover images without being deleted.
 */

const EXTRA_MEMBERS: Seed['users'] = [
  {
    id: 'a0000000-0000-4000-8000-000000000007',
    name: 'Youssef Adel',
    email: 'youssef@demo.skillsphere.app',
    profession: 'Backend Engineer',
    location: 'Aswan, Egypt',
    bio: 'APIs that stay up on the busiest day of the year. Queues, caches, indexes and the occasional nine-year-old PHP file.',
    skills: [
      ['PHP', 'expertise'],
      ['Cloud Infrastructure', 'expertise'],
      ['Python', 'help'],
      ['Technical Writing', 'interest'],
    ],
    createdDaysAgo: 27,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000008',
    name: 'Hana Mostafa',
    email: 'hana@demo.skillsphere.app',
    profession: 'Environmental Scientist',
    location: 'Alexandria, Egypt',
    bio: 'Field measurements, low-cost sensors and the calibration work nobody enjoys but everybody depends on.',
    skills: [
      ['Research Methods', 'expertise'],
      ['Data Science', 'expertise'],
      ['Statistics', 'interest'],
      ['Embedded Systems', 'learning'],
    ],
    createdDaysAgo: 24,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000009',
    name: 'Karim Fathy',
    email: 'karim@demo.skillsphere.app',
    profession: 'Mobile Developer',
    location: 'Cairo, Egypt',
    bio: 'Offline-first mobile apps for people on slow connections. I care about how an app behaves on a five-year-old device.',
    skills: [
      ['TypeScript', 'expertise'],
      ['React', 'expertise'],
      ['UI/UX Design', 'help'],
      ['Product Design', 'interest'],
    ],
    createdDaysAgo: 21,
  },
  {
    id: 'a0000000-0000-4000-8000-00000000000a',
    name: 'Nour El-Sayed',
    email: 'nour@demo.skillsphere.app',
    profession: 'Mechanical Engineer',
    location: 'Port Said, Egypt',
    bio: 'Pumps, pipes and small fluid systems. I would rather measure a pressure drop than argue about one.',
    skills: [
      ['Mechanical Engineering', 'expertise'],
      ['Embedded Systems', 'help'],
      ['Python', 'learning'],
      ['Research Methods', 'interest'],
    ],
    createdDaysAgo: 18,
  },
  {
    id: 'a0000000-0000-4000-8000-00000000000b',
    name: 'Dina Ragab',
    email: 'dina@demo.skillsphere.app',
    profession: 'Data Analyst',
    location: 'Giza, Egypt',
    bio: 'Small operational datasets, honest dashboards and inventory questions that turn out to be process questions.',
    skills: [
      ['Data Science', 'expertise'],
      ['Statistics', 'expertise'],
      ['Business Strategy', 'interest'],
      ['Technical Writing', 'help'],
    ],
    createdDaysAgo: 15,
  },
  {
    id: 'a0000000-0000-4000-8000-00000000000c',
    name: 'Tarek Saleh',
    email: 'tarek@demo.skillsphere.app',
    profession: 'STEM Teacher',
    location: 'Tanta, Egypt',
    bio: 'Teaching mathematics and science to students who have been told they are bad at it. Assessment should measure learning, not memory.',
    skills: [
      ['Teaching', 'expertise'],
      ['Mathematics', 'expertise'],
      ['Research Methods', 'interest'],
      ['Technical Writing', 'help'],
    ],
    createdDaysAgo: 11,
  },
  {
    id: 'a0000000-0000-4000-8000-00000000000d',
    name: 'Salma Farouk',
    email: 'salma@demo.skillsphere.app',
    profession: 'UX Researcher',
    location: 'Cairo, Egypt',
    bio: 'I watch people use things and write down what actually happened. Mostly museums, clinics and public services.',
    skills: [
      ['Research Methods', 'expertise'],
      ['UI/UX Design', 'expertise'],
      ['Product Design', 'interest'],
      ['Statistics', 'help'],
    ],
    createdDaysAgo: 8,
  },
  {
    id: 'a0000000-0000-4000-8000-00000000000e',
    name: 'Ziad Habib',
    email: 'ziad@demo.skillsphere.app',
    profession: 'DevOps Engineer',
    location: '6th of October, Egypt',
    bio: 'Deployments, observability and capacity planning. I like finding the one query that makes the whole page slow.',
    skills: [
      ['Cloud Infrastructure', 'expertise'],
      ['Python', 'help'],
      ['TypeScript', 'interest'],
      ['Embedded Systems', 'learning'],
    ],
    createdDaysAgo: 5,
  },
]

type ExtraProblem = {
  id: string
  owner: string
  title: string
  description: string
  category: string
  helpType: string
  status: string
  skills: string[]
  tags: string[]
  cover: string | null
  created: string
  updated: string
}

const EXTRA_PROBLEMS: ExtraProblem[] = [
  {
    id: 'b0000000-0000-4000-8000-000000000008',
    owner: 'a0000000-0000-4000-8000-000000000008',
    title: 'Solar-powered air-quality nodes stop reporting at night',
    description:
      'We deployed twelve low-cost air-quality nodes around Aswan to measure dust near a quarry road. Each node has a small solar panel, a battery and a particle sensor that samples every 30 seconds.\n\nThe readings are good during the day, but between about 19:00 and 06:00 most nodes go silent. The few that keep reporting show an unrealistic drop in particulate readings, which looks like the sensor fan slowing down rather than clean air.\n\nWe suspect the charge controller is cutting the load earlier than the battery voltage suggests, or that the sensor heater draws far more than our power budget assumed. We can share two months of data and the budget spreadsheet. We need help instrumenting a few nodes and deciding what to change in the next hardware revision.',
    category: 'engineering-robotics',
    helpType: 'build',
    status: 'open',
    skills: ['Embedded Systems', 'Python', 'Data Science'],
    tags: ['sensors', 'power-budget', 'field-data'],
    cover: '/challenges/solar-sensor.jpg',
    created: daysAgo(1, 4),
    updated: daysAgo(1, 4),
  },
  {
    id: 'b0000000-0000-4000-8000-000000000009',
    owner: 'a0000000-0000-4000-8000-00000000000a',
    title: 'Rooftop farm loses irrigation pressure at midday',
    description:
      'The community rooftop farm has 24 raised beds fed by a gravity tank, with a small pump that tops it up from the building supply.\n\nEverything works in the morning. By midday the last four beds get almost no water while the first beds flood. Turning the pump up makes the first beds worse, so the problem is probably the pipe diameter and the way the drip lines branch, but we do not have a flow model and cannot afford to rebuild the system twice.\n\nWe are looking for someone who has sized small irrigation networks, and who can help us measure and change one thing at a time before the next planting season.',
    category: 'engineering-robotics',
    helpType: 'collaboration',
    status: 'in_progress',
    skills: ['Mechanical Engineering', 'Embedded Systems', 'Python'],
    tags: ['irrigation', 'fluid-systems', 'urban-farming'],
    cover: '/challenges/rooftop-water.jpg',
    created: daysAgo(2, 6),
    updated: daysAgo(1, 1),
  },
  {
    id: 'b0000000-0000-4000-8000-00000000000a',
    owner: 'a0000000-0000-4000-8000-00000000000b',
    title: 'The clinic runs out of vaccine stock without warning',
    description:
      'Our clinic keeps a paper count of vaccine vials and updates a spreadsheet at the end of each shift. Twice this quarter we ran out of a routine vaccine mid-week, and both times the spreadsheet said we still had stock.\n\nThe fridge is small, deliveries are unpredictable, and two nurses work different shifts. The counting is not one task, it is five small tasks that each look reasonable on their own.\n\nWe want a simple counting and reorder method that survives a busy day, not another electronic system. Ideally something we can test for two weeks with a whiteboard and the stock cards we already use.',
    category: 'business',
    helpType: 'advice',
    status: 'open',
    skills: ['Data Science', 'Statistics', 'Business Strategy'],
    tags: ['operations', 'inventory', 'healthcare'],
    cover: '/challenges/clinic-stock.jpg',
    created: daysAgo(3, 2),
    updated: daysAgo(3, 2),
  },
  {
    id: 'b0000000-0000-4000-8000-00000000000b',
    owner: 'a0000000-0000-4000-8000-00000000000c',
    title: 'Deaf students need a sign-language practice tool that works offline',
    description:
      'The school has a small set of shared tablets. Teachers want students to practise new vocabulary at home, but the sign-language apps we tried need a constant connection and treat the local dialect as a footnote.\n\nWe can record about 400 signs with two teachers if someone can help us design the practice flow: show a sign, ask the student to choose the word, review mistakes. It has to work offline, avoid scoring students on camera, and stay usable on a five-year-old tablet.\n\nWe are not sure whether a video library or a small on-device model is the right approach, and we would rather decide with someone who has built for constrained devices.',
    category: 'education',
    helpType: 'collaboration',
    status: 'open',
    skills: ['Teaching', 'UI/UX Design', 'Machine Learning'],
    tags: ['accessibility', 'offline', 'education'],
    cover: '/challenges/sign-language.jpg',
    created: daysAgo(4, 5),
    updated: daysAgo(4, 5),
  },
  {
    id: 'b0000000-0000-4000-8000-00000000000c',
    owner: 'a0000000-0000-4000-8000-000000000007',
    title: 'Legacy PHP endpoint times out on every enrolment day',
    description:
      'Our student enrolment page calls a PHP endpoint that has grown for nine years. On normal days it answers in about 300ms. On enrolment day, when several hundred students log in at once, it times out after 30 seconds and the page shows a generic error.\n\nThe endpoint does three things in one request: it validates the form, writes to a registration table, and sends a confirmation email. The email step blocks the response, and the registration table has a lock that shows up under load.\n\nWe cannot rewrite it before the next enrolment window. We need a review of the slow path and a change that reduces contention without breaking old clients.',
    category: 'programming',
    helpType: 'review',
    status: 'in_progress',
    skills: ['PHP', 'Cloud Infrastructure', 'Python'],
    tags: ['performance', 'legacy-code', 'databases'],
    cover: '/challenges/legacy-code.jpg',
    created: daysAgo(5, 3),
    updated: daysAgo(2, 2),
  },
  {
    id: 'b0000000-0000-4000-8000-00000000000d',
    owner: 'a0000000-0000-4000-8000-00000000000d',
    title: 'Visitors skip the second floor of our museum',
    description:
      'We redid the ground floor last year and visitor numbers went up, but the second floor now gets fewer than a third of the people who come in. Staff say visitors do not realise there is another floor, and the only sign is a small arrow beside the stairs.\n\nWe ran a short intercept survey. Most people who skipped it said they were “just passing”, which tells us very little.\n\nWe want to test two or three low-cost changes — clearer signage, a short guided route, moving one popular exhibit upstairs — and measure which one actually moves people, without guessing from raw footfall.',
    category: 'design-creativity',
    helpType: 'research',
    status: 'open',
    skills: ['UI/UX Design', 'Research Methods', 'Product Design'],
    tags: ['wayfinding', 'evaluation', 'public-space'],
    cover: '/challenges/museum.jpg',
    created: daysAgo(6, 1),
    updated: daysAgo(6, 1),
  },
]

function ensureDemoExtras(db: DatabaseSync) {
  // Existing databases were created before cover images existed.
  try {
    db.exec('ALTER TABLE problems ADD COLUMN cover_url TEXT')
  } catch {
    // Column is already present.
  }

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
  const insertProfile = db.prepare(
    `INSERT OR IGNORE INTO profiles (id, display_name, username, bio, profession, location, onboarding_complete, is_demo, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`,
  )
  const insertSkill = db.prepare('INSERT OR IGNORE INTO user_skills (user_id, name, kind) VALUES (?, ?, ?)')

  for (const person of EXTRA_MEMBERS) {
    insertUser.run(person.id, person.email, hashPassword(DEMO_PASSWORD), daysAgo(person.createdDaysAgo))
    insertProfile.run(
      person.id,
      person.name,
      person.name.toLowerCase().replace(/\s+/g, '-'),
      person.bio,
      person.profession,
      person.location,
      daysAgo(person.createdDaysAgo),
    )
    for (const [name, kind] of person.skills) insertSkill.run(person.id, name, kind)
  }

  const insertProblem = db.prepare(
    `INSERT OR IGNORE INTO problems (id, owner_id, title, description, category, help_type, status, required_skills, tags, ai_analysis, cover_url, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, ?, ?)`,
  )
  for (const problem of EXTRA_PROBLEMS) {
    insertProblem.run(
      problem.id,
      problem.owner,
      problem.title,
      problem.description,
      problem.category,
      problem.helpType,
      problem.status,
      JSON.stringify(problem.skills),
      JSON.stringify(problem.tags),
      problem.cover,
      problem.created,
      problem.updated,
    )
  }

  const setCover = db.prepare(
    `UPDATE problems SET cover_url = ? WHERE id = ? AND (cover_url IS NULL OR cover_url = '')`,
  )
  for (const [id, cover] of [
    [PR.robot, '/challenges/robot-slam.jpg'],
    [PR.cracks, '/challenges/concrete-cracks.jpg'],
    [PR.people, '/challenges/people-counter.jpg'],
    [PR.panel, '/challenges/control-panel.jpg'],
  ] as const) {
    setCover.run(cover, id)
  }
}

const globalForDb = globalThis as unknown as { __skillsphereDb?: DatabaseSync }

/**
 * Where the demo SQLite file lives.
 *
 * Locally that is `<project>/.data/skillsphere.db`, so the data survives restarts.
 * On a serverless host the deployment directory is read-only; only the OS temp
 * directory is writable, and it is per instance and discarded between cold
 * starts, so the demo reseeds itself there.
 */
function demoDbFile(): string {
  if (process.env.DEMO_DB_PATH) return process.env.DEMO_DB_PATH
  if (process.env.VERCEL) return path.join(tmpdir(), 'skillsphere-demo', 'skillsphere.db')
  return path.join(process.cwd(), '.data', 'skillsphere.db')
}

export function getDb(): DatabaseSync {
  if (globalForDb.__skillsphereDb) return globalForDb.__skillsphereDb
  const file = demoDbFile()
  mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec(SCHEMA)
  seed(db)
  ensureDemoExtras(db)
  globalForDb.__skillsphereDb = db
  return db
}

export const DEMO_IDS = { P, PR }
