import type { JSONContent } from "@tiptap/core";

import type { Article, BookingService, PortfolioItem, SiteSettings } from "@/types/domain";

const now = "2026-08-23T18:00:00.000Z";

function document(...paragraphs: string[]): JSONContent {
  return {
    type: "doc",
    content: paragraphs.map((text, index) =>
      index === 1
        ? { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] }
        : { type: "paragraph", content: [{ type: "text", text }] },
    ),
  };
}

export const demoSettings: SiteSettings = {
  singleton: true,
  business_name: "Afgekia",
  tagline: "Thoughtful support for work that matters.",
  description: "Afgekia brings calm structure to ambitious work through practical project support, clear communication, and dependable follow-through.",
  contact_email: "hello@afgekia.example",
  phone: null,
  address: null,
  timezone: "America/Los_Angeles",
  instagram_url: null,
  linkedin_url: null,
  booking_lead_hours: 24,
  booking_horizon_days: 90,
  created_at: now,
  updated_at: now,
};

export const demoServices: BookingService[] = [
  ["10000000-0000-4000-8000-000000000001", "Project clarity session", "project-clarity-session", "A focused working session to untangle priorities, define the next useful milestone, and leave with a practical action plan.", 60],
  ["10000000-0000-4000-8000-000000000002", "Workflow reset", "workflow-reset", "A deeper review of the tools, handoffs, and routines slowing the work down, followed by a simpler operating rhythm.", 90],
  ["10000000-0000-4000-8000-000000000003", "Ongoing assistance consult", "ongoing-assistance-consult", "Explore steady project coordination and business-assistance support for a growing body of work.", 45],
].map(([id, name, slug, description, duration], index) => ({
  id: String(id), name: String(name), slug: String(slug), description: String(description),
  duration_minutes: Number(duration), active: true, display_order: (index + 1) * 10,
  created_at: now, updated_at: now,
}));

const portfolioBase = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    slug: "launching-a-calm-client-onboarding-system",
    eyebrow: "Operations · Client experience",
    title: "A calmer client onboarding system",
    summary: "A scattered first week became one clear, welcoming path from signed agreement to confident kickoff.",
    body: ["We mapped every handoff, removed duplicated forms, and gave both the team and its clients one dependable source of truth.", "The result", "Fewer follow-up emails, faster preparation, and a first impression that felt considered from the start."],
    accent: "olive" as const,
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    slug: "turning-a-busy-quarter-into-a-visible-plan",
    eyebrow: "Planning · Coordination",
    title: "Turning a busy quarter into a visible plan",
    summary: "A growing list of commitments became a paced roadmap with owners, milestones, and room for the unexpected.",
    body: ["The work began with a practical inventory: what was fixed, what was flexible, and what no longer deserved a place on the calendar.", "A shared view", "We built a view of the quarter that made tradeoffs visible before they became emergencies."],
    accent: "terracotta" as const,
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    slug: "building-an-editorial-rhythm-that-lasts",
    eyebrow: "Content · Publishing",
    title: "An editorial rhythm that lasts",
    summary: "A sustainable content system replaced last-minute publishing with a small, repeatable weekly practice.",
    body: ["Instead of chasing a larger content calendar, we created a smaller rhythm that the team could actually keep.", "A lighter system", "Ideas now move through a lightweight capture, drafting, review, and publishing flow."],
    accent: "gold" as const,
  },
];

export const demoPortfolio: PortfolioItem[] = portfolioBase.map((item, index) => ({
  ...item,
  body_json: document(...item.body),
  body_text: item.body.join(" "),
  cover_path: null,
  status: "published",
  featured: index < 2,
  sort_order: (index + 1) * 10,
  seo_title: item.title,
  seo_description: item.summary,
  published_at: new Date(Date.parse(now) - index * 2_592_000_000).toISOString(),
  created_by: null,
  created_at: now,
  updated_at: now,
  updates: index < 2 ? [{
    id: `21000000-0000-4000-8000-00000000000${index + 1}`,
    portfolio_item_id: item.id,
    title: index === 0 ? "The kickoff path is live" : "Milestones agreed and sequenced",
    body_json: document(index === 0 ? "The welcome hub, checklist, and internal handoff now work as one calm flow." : "The team aligned on three decision points and moved lower-value work out of the critical path."),
    body_text: index === 0 ? "The welcome hub, checklist, and internal handoff now work as one calm flow." : "The team aligned on three decision points and moved lower-value work out of the critical path.",
    progress: index === 0 ? 100 : 72,
    published_at: now,
    created_by: null,
    created_at: now,
    updated_at: now,
  }] : [],
}));

export const demoArticles: Article[] = [
  ["a-kinder-way-to-prioritize", "A kinder way to prioritize a crowded week", "A short practice for separating what is urgent, what is important, and what can wait without guilt.", "A useful plan does more than sort tasks. It protects attention for the work that only you can do."],
  ["what-a-useful-project-update-includes", "What a useful project update includes", "The four pieces that help clients understand progress without reading a full activity log.", "The best update answers four questions: what changed, what it means, what happens next, and where a decision is needed."],
  ["making-room-for-follow-through", "Making room for follow-through", "Why a small buffer around important work is a planning tool, not wasted time.", "A plan without room to respond is only a wish. Small buffers protect delivery and make promises more dependable."],
].map(([slug, title, excerpt, body], index) => ({
  id: `30000000-0000-4000-8000-00000000000${index + 1}`,
  slug, title, excerpt,
  body_json: document(body, "A practical next step", "Choose one commitment this week and protect the space it needs to finish well."),
  body_text: `${body} Choose one commitment this week and protect the space it needs to finish well.`,
  cover_path: null,
  status: "published",
  featured: index === 0,
  seo_title: title,
  seo_description: excerpt,
  published_at: new Date(Date.parse(now) - index * 1_209_600_000).toISOString(),
  author_id: null,
  created_at: now,
  updated_at: now,
}));
