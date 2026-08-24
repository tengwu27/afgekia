import { describe, expect, it } from "vitest";

import { normalizeRichText, richTextToSafeHtml } from "@/lib/rich-text";

describe("rich-text sanitization", () => {
  it("renders supported structured content", () => { const html = richTextToSafeHtml({ type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Progress" }] }] }); expect(html).toContain("<h2>Progress</h2>"); });
  it("removes unsafe protocols and attributes", () => { const html = richTextToSafeHtml({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "bad", marks: [{ type: "link", attrs: { href: "javascript:alert(1)", onclick: "alert(1)" } }] }] }] }); expect(html).not.toContain("javascript:"); expect(html).not.toContain("onclick"); });
  it("normalizes malformed values to an empty document", () => { expect(normalizeRichText("not-json").type).toBe("doc"); });
});
