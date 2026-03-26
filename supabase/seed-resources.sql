-- Seed shared resources (run in Supabase SQL Editor)
INSERT INTO resources (category, name, description, url, icon, sort_order) VALUES
-- Dev & Deployment
('dev', 'GitHub', 'Repos, PRs, issues', 'https://github.com', '⚙️', 1),
('dev', 'Vercel', 'Deployments, domains, analytics', 'https://vercel.com/dashboard', '▲', 2),
('dev', 'Supabase', 'Database, auth, storage', 'https://supabase.com/dashboard', '🟢', 3),
('dev', 'Google Play Console', 'App publishing & reviews', 'https://play.google.com/console', '▶️', 4),
-- Marketing & Content
('marketing', 'Canva', 'Brand assets, social, presentations', 'https://www.canva.com', '🎨', 1),
('marketing', 'YouTube', 'Channel, uploads, analytics', 'https://studio.youtube.com', '📹', 2),
('marketing', 'Social Accounts', 'Instagram, Facebook, LinkedIn', '#', '📱', 3),
-- AI Tools
('ai', 'Claude / Anthropic', 'AI assistant, API console', 'https://claude.ai', '🧠', 1),
('ai', 'ChatGPT / OpenAI', 'Custom GPTs, API', 'https://chat.openai.com', '💬', 2),
('ai', 'Lovable', 'Vibe-coded prototypes', 'https://lovable.dev', '💜', 3),
-- Business
('business', 'Finance App', 'Coming soon — not yet chosen', '#', '💰', 1),
('business', 'CRM', 'Coming soon — not yet chosen', '#', '👥', 2),
('business', 'Google Calendar', 'Shared team calendar', 'https://calendar.google.com', '📅', 3),
('business', 'Slack', 'Team chat & notifications', '#', '💬', 4),
-- Brand
('brand', 'Brand Kit', 'Colours, fonts, logos, guidelines', '#', '🎨', 1),
('brand', 'Photo Library', 'Team photos, product shots', '#', '📸', 2),
-- Contacts
('contacts', 'Francois du Plessis', 'Business Mentor', '#', '👤', 1),
('contacts', 'NZVA Contacts', 'Association leads', '#', '👥', 2),
('contacts', 'Deb', 'Veterinarian & Educator', '#', '🐾', 3),
('contacts', 'Shaan', 'Web Designer / Developer', '#', '💻', 4);
