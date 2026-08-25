import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { InferAgentUIMessage, ToolLoopAgent, isStepCount, tool } from "ai";
import { z } from "zod";

import { createAIModel } from "@/lib/ai/gateway";
import { listingStageLabels } from "@/lib/projects";
import type { Database } from "@/types/database.generated";
import type { Role } from "@/types/domain";

const projectIdSchema = z.object({
  projectId: z.string().uuid().describe("The exact project ID returned by listAccessibleProjects."),
});

export function createProjectAssistant({
  supabase,
  role,
  onEnd,
}: {
  supabase: SupabaseClient<Database>;
  role: Role;
  onEnd?: (event: {
    inputTokens: number | undefined;
    outputTokens: number | undefined;
    totalTokens: number | undefined;
    toolNames: string[];
  }) => Promise<void>;
}) {
  const listAccessibleProjects = tool({
    description:
      "List the real-estate listing projects the signed-in user is allowed to access. Use this before selecting a project by address or seller nickname.",
    inputSchema: z.object({}),
    execute: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, property_address_short, seller_nickname, title, status, progress, target_date, updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(20);
      if (error) throw new Error("Projects could not be loaded.");
      return data.map((project) => ({
        id: project.id,
        propertyAddress: project.property_address_short,
        sellerNickname: project.seller_nickname,
        title: project.title,
        status: project.status,
        progress: project.progress,
        targetDate: project.target_date,
      }));
    },
  });

  const getProjectStatus = tool({
    description:
      "Get current status and overall owner-managed progress for one accessible listing project.",
    inputSchema: projectIdSchema,
    execute: async ({ projectId }) => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, property_address_short, seller_nickname, summary, status, progress, start_date, target_date, updated_at",
        )
        .eq("id", projectId)
        .maybeSingle();
      if (error || !data) return { found: false as const };
      return {
        found: true as const,
        project: {
          id: data.id,
          propertyAddress: data.property_address_short,
          sellerNickname: data.seller_nickname,
          summary: data.summary,
          status: data.status,
          progress: data.progress,
          startDate: data.start_date,
          targetDate: data.target_date,
          updatedAt: data.updated_at,
        },
      };
    },
  });

  const getProjectTimeline = tool({
    description:
      "Get the stage timeline and seller-visible milestones for one accessible listing project.",
    inputSchema: projectIdSchema,
    execute: async ({ projectId }) => {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .maybeSingle();
      if (!project) return { found: false as const };

      const [{ data: stages, error: stagesError }, { data: milestones, error: milestonesError }] =
        await Promise.all([
          supabase
            .from("project_stages")
            .select(
              "id, code, status, position, planned_start_date, planned_end_date, actual_started_at, actual_completed_at, skip_reason",
            )
            .eq("project_id", projectId)
            .order("position"),
          supabase
            .from("milestones")
            .select("id, project_stage_id, title, description, status, due_date, completed_at, position")
            .eq("project_id", projectId)
            .order("position"),
        ]);
      if (stagesError || milestonesError) throw new Error("The project timeline could not be loaded.");

      return {
        found: true as const,
        stages: stages.map((stage) => ({
          id: stage.id,
          name: listingStageLabels[stage.code],
          status: stage.status,
          plannedStartDate: stage.planned_start_date,
          plannedEndDate: stage.planned_end_date,
          actualStartedAt: stage.actual_started_at,
          actualCompletedAt: stage.actual_completed_at,
          skipReason: stage.skip_reason,
        })),
        milestones: milestones.map((milestone) => ({
          id: milestone.id,
          stageId: milestone.project_stage_id,
          title: milestone.title,
          description: milestone.description,
          status: milestone.status,
          dueDate: milestone.due_date,
          completedAt: milestone.completed_at,
        })),
      };
    },
  });

  const getLatestProjectUpdates = tool({
    description:
      "Get the most recent updates the signed-in user is authorized to read for one listing project.",
    inputSchema: projectIdSchema.extend({
      limit: z.number().int().min(1).max(5).default(3),
    }),
    execute: async ({ projectId, limit }) => {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .maybeSingle();
      if (!project) return { found: false as const };

      const { data, error } = await supabase
        .from("project_updates")
        .select("id, title, body_text, audience, status_snapshot, progress_snapshot, occurred_at")
        .eq("project_id", projectId)
        .order("occurred_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error("Project updates could not be loaded.");
      return {
        found: true as const,
        updates: data.map((update) => ({
          title: update.title,
          summary: update.body_text,
          audience: update.audience,
          projectStatus: update.status_snapshot,
          progress: update.progress_snapshot,
          occurredAt: update.occurred_at,
        })),
      };
    },
  });

  const getAssessmentApprovalStatus = tool({
    description:
      "Get the current assessment revision and approval counts for one accessible listing project.",
    inputSchema: projectIdSchema,
    execute: async ({ projectId }) => {
      const { data: project } = await supabase
        .from("projects")
        .select("id, official_assessment_revision_id")
        .eq("id", projectId)
        .maybeSingle();
      if (!project) return { found: false as const };

      const { data: revision, error } = await supabase
        .from("assessment_plan_revisions")
        .select(
          "id, revision_number, status, approvals_required, approvals_received, submitted_at, approved_at",
        )
        .eq("project_id", projectId)
        .order("revision_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error("Assessment approval status could not be loaded.");
      if (!revision) return { found: true as const, revision: null };

      const { data: visibleApprovals } = await supabase
        .from("assessment_plan_approvals")
        .select("status")
        .eq("revision_id", revision.id);
      const statusCounts = (visibleApprovals ?? []).reduce<Record<string, number>>(
        (counts, approval) => {
          counts[approval.status] = (counts[approval.status] ?? 0) + 1;
          return counts;
        },
        {},
      );

      return {
        found: true as const,
        isOfficial: project.official_assessment_revision_id === revision.id,
        revision: {
          number: revision.revision_number,
          status: revision.status,
          approvalsRequired: revision.approvals_required,
          approvalsReceived: revision.approvals_received,
          submittedAt: revision.submitted_at,
          approvedAt: revision.approved_at,
          visibleApprovalStatusCounts: statusCounts,
        },
      };
    },
  });

  return new ToolLoopAgent({
    model: createAIModel(),
    instructions: [
      "You are Afgekia's concise, warm project assistant for real-estate listing preparation.",
      "Answer only from the live records returned by your tools. Always use a tool before stating a project fact.",
      "If the user does not identify a project, list accessible projects. If multiple projects match, ask which one they mean.",
      "Never invent dates, progress, approvals, or updates. Clearly say when a record is missing.",
      "You are read-only. Never claim to edit, approve, reschedule, or publish anything.",
      "Do not provide legal, financial, appraisal, brokerage, or real-estate advice.",
      role === "client"
        ? "The user is a seller client. Keep internal operations private and summarize only records authorized by database policy."
        : "The user is the assigned project owner. Summarize only owner-visible records authorized by database policy and avoid exposing secrets or credentials.",
    ].join("\n"),
    tools: {
      listAccessibleProjects,
      getProjectStatus,
      getProjectTimeline,
      getLatestProjectUpdates,
      getAssessmentApprovalStatus,
    },
    stopWhen: isStepCount(6),
    timeout: { totalMs: 30_000, stepMs: 15_000, firstChunkMs: 12_000 },
    onEnd: async ({ usage, steps }) => {
      if (!onEnd) return;
      const toolNames = [
        ...new Set(
          steps.flatMap((step) => step.toolCalls.map((toolCall) => toolCall.toolName)),
        ),
      ];
      await onEnd({
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        toolNames,
      });
    },
  });
}

export type ProjectAssistantMessage = InferAgentUIMessage<
  ReturnType<typeof createProjectAssistant>
>;
