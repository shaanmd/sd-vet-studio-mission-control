// SD VetStudio Mission Control — Dashboard Config
// Edit this file to update links, tasks, highlights, contacts, and projects.
// No coding knowledge required — just update the text/URLs below.

export const highlights = [
  {
    id: "1",
    title: "Course Platform Launch",
    description: "6WSD course platform — finalise module content and run test cohort.",
    url: "#",
    tag: "Active",
  },
  {
    id: "2",
    title: "VetRoute MVP",
    description: "Complete route planner MVP and prep for first user demo.",
    url: "#",
    tag: "Active",
  },
  {
    id: "3",
    title: "SD VetStudio Brand Refresh",
    description: "Finalise brand guidelines and apply across all platforms.",
    url: "#",
    tag: "In Review",
  },
];

export const calendarUrl = "https://calendar.google.com";

export const planning = {
  taskManager: { label: "Task Manager", url: "#", description: "SD Vet TaskManager (Supabase)" },
  projectPrioritiser: { label: "Project Prioritiser", url: "#", description: "Sooper Dooper Project Prioritiser" },
  calendar: { label: "📅 Calendar", url: "https://calendar.google.com", description: "SD VetStudio shared Google Calendar" },
};

export const projects = [
  { name: "6WSD Course Platform", emoji: "🎓", url: "#", status: "Active" },
  { name: "6WSD Landing", emoji: "🌐", url: "#", status: "Active" },
  { name: "VetRoute", emoji: "🗺️", url: "#", status: "Active" },
  { name: "Vet Vitality Companion", emoji: "🐾", url: "#", status: "Active" },
  { name: "Canine CCL Rehab", emoji: "🦴", url: "#", status: "Active" },
  { name: "Happy Hound Score", emoji: "🐶", url: "#", status: "Paused" },
  { name: "Pet Align", emoji: "⚖️", url: "#", status: "Paused" },
  { name: "Dog Training Game", emoji: "🎮", url: "#", status: "Paused" },
  { name: "Equine Nutrition", emoji: "🐴", url: "#", status: "Review" },
];

export const resources = [
  {
    category: "Marketing",
    emoji: "📣",
    items: [
      { label: "Social Templates", url: "#" },
      { label: "Copy References", url: "#" },
      { label: "Campaign Tools", url: "#" },
    ],
  },
  {
    category: "Software",
    emoji: "💻",
    items: [
      { label: "Vercel Dashboard", url: "https://vercel.com/dashboard" },
      { label: "Supabase", url: "https://supabase.com/dashboard" },
      { label: "GitHub", url: "https://github.com" },
    ],
  },
  {
    category: "AI Tools",
    emoji: "🤖",
    items: [
      { label: "Claude", url: "https://claude.ai" },
      { label: "ChatGPT", url: "https://chatgpt.com" },
      { label: "Gemini", url: "https://gemini.google.com" },
    ],
  },
  {
    category: "Learning",
    emoji: "📖",
    items: [
      { label: "CS50", url: "https://cs50.harvard.edu" },
      { label: "Zero To Mastery", url: "https://zerotomastery.io" },
      { label: "DeepLearning.AI", url: "https://deeplearning.ai" },
    ],
  },
];

export const brand = [
  {
    category: "Canva",
    emoji: "🎨",
    items: [
      { label: "Brand Workspace", url: "https://www.canva.com" },
      { label: "SD VetStudio Templates", url: "https://www.canva.com" },
    ],
  },
  {
    category: "Assets",
    emoji: "📁",
    items: [
      { label: "Logo Files (Drive)", url: "#" },
      { label: "Style Library", url: "#" },
      { label: "Brand Guidelines", url: "#" },
    ],
  },
  {
    category: "Colours & Fonts",
    emoji: "🖌️",
    items: [
      { label: "Colour Palette", url: "#", note: "#1E6B5E · #F5F0E8 · #D4A853 · #2C3E50" },
      { label: "Font Reference", url: "#", note: "Heading: Playfair Display · Body: Inter" },
    ],
  },
];

export const contacts = [
  { name: "Francois du Plessis", role: "Business Mentor", contact: "", emoji: "🧭" },
  { name: "NZVA Contacts", role: "Association Leads", contact: "", emoji: "🏛️" },
  { name: "Deb", role: "Veterinarian & Educator", contact: "", emoji: "🐾" },
  { name: "Shaan", role: "Web Designer / Developer", contact: "", emoji: "💻" },
];

export const admin = [
  {
    category: "Invoicing",
    emoji: "🧾",
    items: [
      { label: "Invoice Template", url: "#" },
      { label: "Sent Invoices", url: "#" },
    ],
  },
  {
    category: "Legal & Contracts",
    emoji: "⚖️",
    items: [
      { label: "Contract Templates", url: "#" },
      { label: "Signed Agreements", url: "#" },
    ],
  },
  {
    category: "Accounts",
    emoji: "💳",
    items: [
      { label: "Subscriptions Tracker", url: "#" },
      { label: "Business Accounts", url: "#" },
    ],
  },
  {
    category: "Documents",
    emoji: "📄",
    items: [
      { label: "Business Docs (Drive)", url: "#" },
      { label: "Meeting Notes", url: "#" },
    ],
  },
];

// ── Daily Tasks ─────────────────────────────────────────────────────────────
// Top 3 daily tasks for each team member to reach our goals.
// Update these weekly as priorities shift.

export const dailyTasks = {
  deb: {
    name: "Deb",
    emoji: "🐾",
    role: "Veterinarian & Educator",
    color: "teal",
    tasks: [
      {
        id: "d1",
        task: "Review & update Highlights panel",
        description: "Check current sprint priorities and update one focus area. Keeps us aligned.",
        tag: "Strategy",
      },
      {
        id: "d2",
        task: "Create or review one piece of content",
        description: "Write a social post, review a course module, or draft a case study.",
        tag: "Content",
      },
      {
        id: "d3",
        task: "Connect with one key contact",
        description: "Reach out to a collaborator, mentor, or association lead — relationships drive the business.",
        tag: "Networking",
      },
    ],
  },
  shaan: {
    name: "Shaan",
    emoji: "💻",
    role: "Web Designer / Developer",
    color: "amber",
    tasks: [
      {
        id: "s1",
        task: "Ship one focused task on the active project",
        description: "Pick the top-priority ticket and close it. One thing done beats five half-started.",
        tag: "Build",
      },
      {
        id: "s2",
        task: "Check Vercel deployments & errors",
        description: "Review runtime logs on live projects. Catch issues before users do.",
        tag: "Ops",
      },
      {
        id: "s3",
        task: "Update project status in config",
        description: "Keep Projects list accurate — move anything Paused/Active/Review. Future-you will thank you.",
        tag: "Maintenance",
      },
    ],
  },
};
