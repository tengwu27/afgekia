import "server-only";

import { cache } from "react";

import { demoArticles, demoPortfolio, demoServices, demoSettings } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Article, BookingService, PortfolioItem, SiteSettings } from "@/types/domain";

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (!isSupabaseConfigured()) return demoSettings;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("site_settings").select("*").eq("singleton", true).single();
  return data ?? demoSettings;
});

export const getServices = cache(async (): Promise<BookingService[]> => {
  if (!isSupabaseConfigured()) return demoServices;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("booking_services").select("*").eq("active", true).order("display_order");
  return data ?? [];
});

export const getPortfolio = cache(async (): Promise<PortfolioItem[]> => {
  if (!isSupabaseConfigured()) return demoPortfolio;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("portfolio_items").select("*, updates:portfolio_updates(*)").eq("status", "published").order("sort_order");
  return (data ?? []) as PortfolioItem[];
});

export const getPortfolioItem = cache(async (slug: string): Promise<PortfolioItem | null> => {
  if (!isSupabaseConfigured()) return demoPortfolio.find((item) => item.slug === slug) ?? null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("portfolio_items").select("*, updates:portfolio_updates(*)").eq("slug", slug).eq("status", "published").maybeSingle();
  return data as PortfolioItem | null;
});

export const getArticles = cache(async (): Promise<Article[]> => {
  if (!isSupabaseConfigured()) return demoArticles;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("articles").select("*").eq("status", "published").order("published_at", { ascending: false });
  return data ?? [];
});

export const getArticle = cache(async (slug: string): Promise<Article | null> => {
  if (!isSupabaseConfigured()) return demoArticles.find((article) => article.slug === slug) ?? null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("articles").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return data;
});
