"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react";
import { useState } from "react";
import type { JSONContent } from "@tiptap/core";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database.generated";

const defaultContent = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }] };

export function RichTextEditor({ name = "bodyJson", textName = "bodyText", initialValue, label = "Content" }: { name?: string; textName?: string; initialValue?: Json; label?: string }) {
  const [json, setJson] = useState(() => JSON.stringify(initialValue ?? defaultContent));
  const [text, setText] = useState("");
  const editor = useEditor({
    extensions: [StarterKit],
    content: (initialValue ?? defaultContent) as JSONContent,
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose-afgekia min-h-52 px-4 py-3 focus:outline-none", "aria-label": label } },
    onCreate: ({ editor: instance }) => setText(instance.getText()),
    onUpdate: ({ editor: instance }) => { setJson(JSON.stringify(instance.getJSON())); setText(instance.getText()); },
  });
  const controls = [
    [Bold, "Bold", () => editor?.chain().focus().toggleBold().run(), editor?.isActive("bold")],
    [Italic, "Italic", () => editor?.chain().focus().toggleItalic().run(), editor?.isActive("italic")],
    [Heading2, "Heading", () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), editor?.isActive("heading", { level: 2 })],
    [List, "Bullet list", () => editor?.chain().focus().toggleBulletList().run(), editor?.isActive("bulletList")],
    [ListOrdered, "Numbered list", () => editor?.chain().focus().toggleOrderedList().run(), editor?.isActive("orderedList")],
    [Quote, "Quote", () => editor?.chain().focus().toggleBlockquote().run(), editor?.isActive("blockquote")],
  ] as const;
  return <div><p className="mb-2 text-sm font-medium">{label}</p><input type="hidden" name={name} value={json} /><input type="hidden" name={textName} value={text} /><div className="overflow-hidden rounded-xl border bg-background focus-within:ring-2 focus-within:ring-ring"><div className="flex flex-wrap gap-1 border-b bg-muted/50 p-2">{controls.map(([Icon, title, command, active]) => <Button key={title} type="button" size="icon-sm" variant={active ? "secondary" : "ghost"} onClick={command} aria-label={title} aria-pressed={Boolean(active)}><Icon /></Button>)}<span className="mx-1 w-px bg-border" /><Button type="button" size="icon-sm" variant="ghost" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} aria-label="Undo"><Undo2 /></Button><Button type="button" size="icon-sm" variant="ghost" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} aria-label="Redo"><Redo2 /></Button></div><EditorContent editor={editor} className={cn("[&_.ProseMirror]:outline-none")} /></div></div>;
}
