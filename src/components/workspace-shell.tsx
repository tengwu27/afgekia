import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { Brand } from "@/components/brand";
import { ProjectAssistant } from "@/components/project-assistant";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/domain";

export interface WorkspaceLink { href: Route; label: string; icon: LucideIcon }

export function WorkspaceShell({ profile, links, children, label }: { profile: Profile; links: WorkspaceLink[]; children: React.ReactNode; label: string }) {
  return <div className="min-h-screen bg-muted/30 lg:grid lg:grid-cols-[16.5rem_1fr]"><aside className="border-b bg-sidebar lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0"><div className="flex items-center justify-between p-5 lg:block lg:p-7"><Brand /><form action={logoutAction} className="lg:hidden"><Button type="submit" variant="ghost" size="sm"><LogOut /> Sign out</Button></form><p className="hidden lg:mt-3 lg:block lg:text-xs lg:font-semibold lg:tracking-widest lg:text-muted-foreground lg:uppercase">{label}</p></div><nav aria-label={`${label} navigation`} className="flex gap-1 overflow-x-auto px-4 pb-4 lg:flex-col lg:px-5">{links.map(({ href, label: linkLabel, icon: Icon }) => <Button key={href} asChild variant="ghost" className="justify-start"><Link href={href}><Icon /> {linkLabel}</Link></Button>)}</nav><div className="hidden border-t p-5 lg:absolute lg:right-0 lg:bottom-0 lg:left-0 lg:block"><p className="truncate text-sm font-medium">{profile.full_name}</p><p className="truncate text-xs text-muted-foreground">{profile.email}</p><form action={logoutAction}><Button type="submit" variant="ghost" size="sm" className="mt-3 -ml-2"><LogOut /> Sign out</Button></form></div></aside><main className="min-w-0"><div className="mx-auto w-full max-w-7xl p-5 sm:p-8 lg:p-10">{children}</div></main>{profile.role !== "admin" ? <ProjectAssistant /> : null}</div>;
}
