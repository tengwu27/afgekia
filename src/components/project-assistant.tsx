"use client";

import { useChat } from "@ai-sdk/react";
import { Bot, RotateCcw, Send, Sparkles, Square } from "lucide-react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ProjectAssistantMessage } from "@/lib/ai/project-assistant";

const transport = new DefaultChatTransport({ api: "/api/chat" });
const quickPrompts = [
  "What is the latest project status?",
  "Show my next listing milestones.",
  "What changed in the latest update?",
];

export function ProjectAssistant() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, stop, setMessages } =
    useChat<ProjectAssistantMessage>({ transport });
  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const nextMessage = text.trim();
    if (!nextMessage || busy) return;
    void sendMessage({ text: nextMessage });
    setInput("");
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className="fixed right-4 bottom-4 z-40 h-11 rounded-full px-4 shadow-lg sm:right-6 sm:bottom-6"
          aria-label="Open project assistant"
        >
          <Sparkles /> Ask Afgekia
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-md"
        aria-describedby="project-assistant-description"
      >
        <SheetHeader className="border-b p-5 pr-14">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <span className="grid size-8 place-items-center rounded-full bg-primary/12 text-primary">
              <Bot className="size-4" />
            </span>
            Project assistant
          </SheetTitle>
          <SheetDescription id="project-assistant-description">
            Ask about live status, stages, milestones, approvals, or recent updates.
          </SheetDescription>
        </SheetHeader>

        <div
          className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
          aria-live="polite"
          aria-busy={busy}
        >
          {messages.length === 0 ? (
            <div className="space-y-5 pt-3">
              <div className="rounded-2xl bg-muted/60 p-5">
                <p className="font-heading text-2xl">What would you like to know?</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  I read only projects your account can access. Database records remain the
                  authoritative source.
                </p>
              </div>
              <div className="space-y-2">
                {quickPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="outline"
                    className="h-auto w-full justify-start py-3 text-left whitespace-normal"
                    onClick={() => submit(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  "max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                <p className="mb-1 text-[0.68rem] font-semibold tracking-wider uppercase opacity-70">
                  {message.role === "user" ? "You" : "Afgekia"}
                </p>
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <p key={message.id + "-text-" + index} className="whitespace-pre-wrap">
                        {part.text}
                      </p>
                    );
                  }
                  if (isToolUIPart(part)) {
                    return (
                      <p
                        key={part.toolCallId}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <Sparkles className="size-3" />
                        {part.state === "output-available"
                          ? "Project records checked"
                          : "Checking project records…"}
                      </p>
                    );
                  }
                  return null;
                })}
              </article>
            ))
          )}
          {status === "submitted" ? (
            <p className="text-xs text-muted-foreground">Reviewing accessible project records…</p>
          ) : null}
          {error ? (
            <div role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              The assistant could not complete that request. Please try again.
            </div>
          ) : null}
        </div>

        <div className="border-t bg-background p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit(input);
            }}
            className="space-y-3"
          >
            <Textarea
              aria-label="Message the project assistant"
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              maxLength={2000}
              rows={3}
              placeholder="Ask about an address, seller, stage, or update…"
              disabled={busy}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(input);
                }
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                disabled={busy || messages.length === 0}
              >
                <RotateCcw /> New chat
              </Button>
              {busy ? (
                <Button type="button" variant="outline" onClick={() => void stop()}>
                  <Square /> Stop
                </Button>
              ) : (
                <Button type="submit" disabled={!input.trim()}>
                  <Send /> Send
                </Button>
              )}
            </div>
          </form>
          <p className="mt-3 text-[0.68rem] leading-4 text-muted-foreground">
            Read-only summary assistant. It cannot approve plans or provide legal or real-estate
            advice.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
