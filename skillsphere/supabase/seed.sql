-- ===========================================================================
-- SkillSphere — demo dataset
-- Run AFTER 0001_init.sql. Every record created here is marked is_demo = true
-- so it is never confused with real user content.
--
-- The demo accounts all use the password: SkillSphere123!
-- (auth users are inserted directly, with a bcrypt hash, so they can sign in
-- immediately. Do not do this in production.)
-- ===========================================================================

-- Demo auth users -----------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'ahmed@demo.skillsphere.app', crypt('SkillSphere123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Ahmed Hassan"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'omar@demo.skillsphere.app', crypt('SkillSphere123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Omar Khaled"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'mona@demo.skillsphere.app', crypt('SkillSphere123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Mona Hassan"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
   'sarah@demo.skillsphere.app', crypt('SkillSphere123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Sarah Ahmed"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated',
   'layla@demo.skillsphere.app', crypt('SkillSphere123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Layla Mansour"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated',
   'nadir@demo.skillsphere.app', crypt('SkillSphere123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Nadir Fahmy"}', '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@demo.skillsphere.app'
on conflict do nothing;

-- Profiles ------------------------------------------------------------------
insert into public.profiles (id, display_name, username, bio, profession, location, onboarding_complete, is_demo)
values
  ('a0000000-0000-4000-8000-000000000001', 'Ahmed Hassan', 'ahmed-hassan',
   'I build perception and navigation systems for mobile robots, and I like problems that sit between machine learning and the physical world.',
   'AI Engineer', 'Cairo, Egypt', true, true),
  ('a0000000-0000-4000-8000-000000000002', 'Omar Khaled', 'omar-khaled',
   'Field robotics, ROS 2 and the unglamorous work of making a robot survive a real building.',
   'Robotics Engineer', 'Alexandria, Egypt', true, true),
  ('a0000000-0000-4000-8000-000000000003', 'Mona Hassan', 'mona-hassan',
   'I work on measurement: how do you know the thing you built actually works?',
   'Data Scientist & Researcher', 'Giza, Egypt', true, true),
  ('a0000000-0000-4000-8000-000000000004', 'Sarah Ahmed', 'sarah-ahmed',
   'Visual place recognition and learned features. I care about how models behave when the input distribution shifts.',
   'Computer Vision Engineer', 'Cairo, Egypt', true, true),
  ('a0000000-0000-4000-8000-000000000005', 'Layla Mansour', 'layla-mansour',
   'Interfaces for people who are busy, outdoors, or wearing gloves.',
   'Product Designer', 'Cairo, Egypt', true, true),
  ('a0000000-0000-4000-8000-000000000006', 'Nadir Fahmy', 'nadir-fahmy',
   'Firmware, sensors and timing. I like the part of robotics where the datasheet is the source of truth.',
   'Embedded Systems Engineer', 'Mansoura, Egypt', true, true)
on conflict (id) do update set
  display_name = excluded.display_name,
  username = excluded.username,
  bio = excluded.bio,
  profession = excluded.profession,
  location = excluded.location,
  onboarding_complete = true,
  is_demo = true;

-- Skills --------------------------------------------------------------------
insert into public.user_skills (user_id, name, kind)
values
  ('a0000000-0000-4000-8000-000000000001', 'Python', 'expertise'),
  ('a0000000-0000-4000-8000-000000000001', 'Robotics', 'expertise'),
  ('a0000000-0000-4000-8000-000000000001', 'Computer Vision', 'expertise'),
  ('a0000000-0000-4000-8000-000000000001', 'Machine Learning', 'expertise'),
  ('a0000000-0000-4000-8000-000000000001', 'ROS', 'interest'),
  ('a0000000-0000-4000-8000-000000000001', 'Embedded Systems', 'learning'),
  ('a0000000-0000-4000-8000-000000000001', 'Technical Writing', 'help'),
  ('a0000000-0000-4000-8000-000000000002', 'ROS', 'expertise'),
  ('a0000000-0000-4000-8000-000000000002', 'Embedded Systems', 'expertise'),
  ('a0000000-0000-4000-8000-000000000002', 'C++', 'expertise'),
  ('a0000000-0000-4000-8000-000000000002', 'Robotics', 'interest'),
  ('a0000000-0000-4000-8000-000000000002', 'Computer Vision', 'help'),
  ('a0000000-0000-4000-8000-000000000003', 'Statistics', 'expertise'),
  ('a0000000-0000-4000-8000-000000000003', 'Python', 'expertise'),
  ('a0000000-0000-4000-8000-000000000003', 'Research Methods', 'expertise'),
  ('a0000000-0000-4000-8000-000000000003', 'Data Science', 'interest'),
  ('a0000000-0000-4000-8000-000000000004', 'Computer Vision', 'expertise'),
  ('a0000000-0000-4000-8000-000000000004', 'Python', 'expertise'),
  ('a0000000-0000-4000-8000-000000000004', 'Machine Learning', 'expertise'),
  ('a0000000-0000-4000-8000-000000000004', 'Robotics', 'interest'),
  ('a0000000-0000-4000-8000-000000000005', 'UI/UX Design', 'expertise'),
  ('a0000000-0000-4000-8000-000000000005', 'Product Design', 'expertise'),
  ('a0000000-0000-4000-8000-000000000005', 'Research Methods', 'interest'),
  ('a0000000-0000-4000-8000-000000000006', 'Embedded Systems', 'expertise'),
  ('a0000000-0000-4000-8000-000000000006', 'C++', 'expertise'),
  ('a0000000-0000-4000-8000-000000000006', 'ROS', 'help'),
  ('a0000000-0000-4000-8000-000000000006', 'Robotics', 'interest')
on conflict do nothing;

-- Problems ------------------------------------------------------------------
insert into public.problems (id, owner_id, title, description, category, help_type, status, tags, required_skills, ai_analysis, is_demo, created_at, updated_at)
values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Improve robot navigation in changing lighting conditions',
   'Our differential-drive robot uses a visual SLAM stack (ROS 2 + RealSense D435i on a Jetson Orin Nano) to navigate a lab floor. It tracks position well until the lighting changes: when the blinds open in the afternoon, or when half the ceiling lights are switched off, the pose estimate drifts and re-localisation takes 30-60 seconds. Twice the robot has driven into a wall during that window.

We have wheel odometry and an IMU as well, but fusing them naively made things worse in the first test. I want to understand why the visual front end fails so abruptly, and whether a small change (more robust features, better keyframe handling, adding a cheap depth cue) would fix it before we consider retraining anything.

What we can offer: full access to the logs, the lab, and the robot for experiments.',
   'engineering-robotics', 'collaboration', 'in_progress',
   array['robotics', 'slam', 'computer-vision', 'localisation'],
   array['ROS', 'Computer Vision', 'Python', 'Embedded Systems'],
   '{"main_problem":"Visual SLAM loses reliable pose tracking when scene illumination changes abruptly, forcing slow re-localisation and unsafe motion.","objective":"Identify why the visual front end degrades under lighting change and select a change that restores stable localisation without a full retrain.","required_skills":["ROS","Computer Vision","Python","Sensor Fusion","Embedded Systems"],"keywords":["visual SLAM","place recognition","illumination change","re-localisation","sensor fusion"],"category":"engineering-robotics","missing_information":["Which SLAM package and front end are in use","Whether tracking is lost entirely or the pose drifts gradually","How IMU and wheel odometry are currently fused"],"investigation_directions":["Log inlier feature counts across a controlled lighting sweep","Compare hand-crafted features against a learned front end on the same sequences","Test a relocalisation trigger based on feature-count drop"]}'::jsonb,
   true, now() - interval '9 days', now() - interval '1 day'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004',
   'Detecting hairline cracks in concrete from drone photos',
   'We have about 4,000 drone images of building facades taken at different heights and times of day. The cracks we care about are thin (often 1-3 pixels wide) and frequently run next to window frames or tile grout, which the current model confuses them with.

Our segmentation model reaches a decent score on our test split but misses most of the hairline cases in practice. I suspect the annotation protocol is part of the problem: two annotators labelled the same 200 images and disagreed on roughly a third of the cracks.',
   'ai-ml', 'research', 'open',
   array['computer-vision', 'segmentation', 'dataset-quality'],
   array['Computer Vision', 'Machine Learning', 'Statistics'],
   null, true, now() - interval '6 days', now() - interval '6 days'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000006',
   'How do we model uncertainty in low-light sensor fusion?',
   'We fuse a time-of-flight distance sensor with a camera in a dim indoor environment. The ToF readings get noisy in a way that is clearly not Gaussian: occasional large outliers when the target is dark, and a bias that depends on ambient light.

A Kalman filter with fixed process and measurement noise is producing overconfident estimates. I would like to compare practical alternatives (adaptive covariance, robust loss, a learned noise model) without pretending we have the data to train something large.',
   'science-research', 'advice', 'open',
   array['sensor-fusion', 'uncertainty', 'state-estimation'],
   array['Statistics', 'Embedded Systems', 'Python'],
   null, true, now() - interval '4 days', now() - interval '3 days'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005',
   'Design an accessible control panel for field robots',
   'Operators use a tablet to take manual control of a field robot. In testing, three of five operators pressed the wrong control while wearing gloves, and the emergency stop was the least discoverable element on the screen.

I want to redesign the control layout around gloved use and outdoor glare. Looking for people who have designed for constrained input or industrial environments.',
   'design-creativity', 'collaboration', 'open',
   array['accessibility', 'hci', 'field-robotics'],
   array['UI/UX Design', 'Product Design', 'Research Methods'],
   null, true, now() - interval '3 days', now() - interval '3 days'),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001',
   'Validate a pricing experiment without enough traffic',
   'We changed the price of our team plan for a month and saw a 9% drop in conversions with 1,100 visitors. Leadership wants to know whether the change is real before we revert.

Our traffic is too low for a clean A/B test, and the change overlapped with a marketing campaign, which makes the comparison messy. Looking for a statistically honest way to decide, including the option of saying "we cannot tell yet".',
   'business', 'advice', 'solved',
   array['experimentation', 'statistics', 'pricing'],
   array['Statistics', 'Business Strategy', 'Data Science'],
   null, true, now() - interval '26 days', now() - interval '12 days')
on conflict (id) do nothing;

-- Comments ------------------------------------------------------------------
insert into public.comments (id, problem_id, author_id, body, created_at)
values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
   'Before changing the front end, log the number of tracked features per frame and the reprojection error across a controlled lighting sweep. In our case the failure was not gradual: below roughly 90 tracked features the pose solution became unstable, and the filter happily accepted it.',
   now() - interval '7 days'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003',
   'This reads like covariate shift in the place-recognition step rather than a modelling failure. If you want a fair comparison, fix the evaluation first: same recorded sequences, same start pose, and report time-to-relocalise and drift at fixed checkpoints.',
   now() - interval '5 days'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004',
   'We hit something similar on an AGV in a warehouse. Exposure compensation on the camera plus keeping a small bank of keyframes from each lighting condition made re-localisation much faster.',
   now() - interval '2 days')
on conflict (id) do nothing;

insert into public.comment_helpful (comment_id, user_id)
values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001')
on conflict do nothing;

-- Workspace ----------------------------------------------------------------
insert into public.problem_contributors (problem_id, user_id, role, added_by, created_at)
values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Co-maintainer', 'a0000000-0000-4000-8000-000000000001', now() - interval '8 days'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'Research advisor', 'a0000000-0000-4000-8000-000000000001', now() - interval '5 days')
on conflict do nothing;

insert into public.collaboration_tasks (id, problem_id, title, description, assignee_id, status, created_by, created_at)
values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'Reproduce the failure with controlled lighting',
   'Run the same 4-minute route with blinds open, blinds closed, and half lights off. Save rosbag files for each.',
   'a0000000-0000-4000-8000-000000000002', 'done', 'a0000000-0000-4000-8000-000000000001', now() - interval '6 days'),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
   'Log tracked-feature counts across the lighting sweep',
   'Add a small node that records feature count, reprojection error and pose covariance per frame.',
   'a0000000-0000-4000-8000-000000000001', 'in_progress', 'a0000000-0000-4000-8000-000000000001', now() - interval '6 days'),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001',
   'Compare ORB-SLAM3 against a learned front end on the same sequences',
   'Same start pose, same sequences, report time-to-relocalise and drift at fixed checkpoints.',
   'a0000000-0000-4000-8000-000000000006', 'todo', 'a0000000-0000-4000-8000-000000000001', now() - interval '6 days')
on conflict (id) do nothing;

insert into public.shared_resources (id, problem_id, title, url, description, added_by, created_at)
values
  ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'ORB-SLAM3 paper', 'https://arxiv.org/abs/2007.11898',
   'The visual-inertial SLAM system we are currently running. Section 5 covers relocalisation.',
   'a0000000-0000-4000-8000-000000000001', now() - interval '8 days'),
  ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
   'Nav2 documentation', 'https://docs.nav2.org/',
   'Reference for the navigation stack; useful when we test recovery behaviours.',
   'a0000000-0000-4000-8000-000000000002', now() - interval '7 days')
on conflict (id) do nothing;

-- Solution and contributions ------------------------------------------------
insert into public.solution_reports (id, problem_id, author_id, outcome_status, outcome_description, attempted, worked, evidence, created_at)
values
  ('f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001',
   'partially_solved',
   'We could not conclude that the price change caused the conversion drop, and we said so. The team agreed to re-run the change as a sequential test after the campaign window instead of reverting on a noisy signal.',
   'Compared the month against the previous month, then against a matched weekday baseline, and finally computed a confidence interval for the difference in conversion rate.',
   'Writing down the decision rule before looking at the data. Once "we cannot tell yet" was an acceptable outcome, the conversation moved from arguing about the number to designing the next test.',
   'https://en.wikipedia.org/wiki/Sequential_probability_ratio_test',
   now() - interval '12 days')
on conflict (id) do nothing;

insert into public.contributions (id, user_id, problem_id, solution_id, summary, confirmed, created_at)
values
  ('ab000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000007',
   'f0000000-0000-4000-8000-000000000001',
   'Designed the statistical framing and reviewed the confidence interval before the report was published.',
   true, now() - interval '12 days'),
  ('ab000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000007',
   'f0000000-0000-4000-8000-000000000001',
   'Ran the analysis and wrote the outcome report.',
   true, now() - interval '12 days')
on conflict (id) do nothing;

-- Connections ---------------------------------------------------------------
insert into public.connections (id, requester_id, addressee_id, status, created_at)
values
  ('ac000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'accepted', now() - interval '20 days'),
  ('ac000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'accepted', now() - interval '15 days'),
  ('ac000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'pending', now() - interval '2 days')
on conflict do nothing;

-- Announcements -------------------------------------------------------------
insert into public.announcements (id, title, body, created_at)
values
  ('ad000000-0000-4000-8000-000000000001', 'SkillSphere demo dataset loaded',
   'This project ships with seed data so the full workflow can be demonstrated: a robotics problem with AI analysis, related problems, matched contributors, a workspace and a recorded outcome. Every seeded record is marked as demo content and is never mixed with your own posts.',
   now() - interval '1 day'),
  ('ad000000-0000-4000-8000-000000000002', 'How contributor matching works',
   'Recommendations combine required-skill overlap, stated interests, contribution history and profile relevance. Every suggestion lists the evidence behind it. Connection counts and popularity are not part of the score.',
   now() - interval '2 days')
on conflict (id) do nothing;
