import "server-only";

import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
import type { JSONContent } from "@tiptap/core";
import sanitizeHtml from "sanitize-html";

const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function normalizeRichText(value: unknown): JSONContent {
  if (
    value &&
    typeof value === "object" &&
    "type" in value &&
    value.type === "doc"
  ) {
    return value as JSONContent;
  }
  return EMPTY_DOCUMENT;
}

export function richTextToSafeHtml(value: unknown) {
  const html = generateHTML(normalizeRichText(value), [StarterKit]);
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "blockquote",
      "strong",
      "em",
      "s",
      "code",
      "pre",
      "br",
      "hr",
      "a",
    ],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: {
          ...attributes,
          rel: "noopener noreferrer",
        },
      }),
    },
  });
}
