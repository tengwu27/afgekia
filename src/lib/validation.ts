import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(320);

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128)
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

export function isIanaTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return value.includes("/") || value === "UTC";
  } catch {
    return false;
  }
}

export const ianaTimezoneSchema = z.string().trim().min(1).max(80).refine(isIanaTimezone, "Enter a valid IANA timezone.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
  next: z.string().max(300).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "The new passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "Choose a password you have not just used.",
    path: ["newPassword"],
  });

export const bookingRequestSchema = z
  .object({
    ownerId: z.string().uuid("Choose a project owner."),
    serviceId: z.string().uuid("Choose an appointment type."),
    fullName: z.string().trim().min(2).max(120),
    email: emailSchema,
    phone: z.string().trim().max(40).optional().transform((value) => value || null),
    timezone: ianaTimezoneSchema,
    preferredAt: z.string().datetime({ offset: true }),
    alternateAt: z
      .string()
      .optional()
      .transform((value) => value || null)
      .pipe(z.string().datetime({ offset: true }).nullable()),
    message: z.string().trim().min(20).max(3000),
    privacyConsent: z.literal("on"),
    formStartedAt: z.coerce.number().int().positive(),
    website: z.string().max(0, "Please leave the website field empty."),
  })
  .superRefine((value, context) => {
    const now = Date.now();
    const preferred = Date.parse(value.preferredAt);
    const startedAgo = now - value.formStartedAt;

    if (preferred <= now) {
      context.addIssue({
        code: "custom",
        path: ["preferredAt"],
        message: "Choose a future time.",
      });
    }
    if (value.alternateAt && Date.parse(value.alternateAt) <= now) {
      context.addIssue({
        code: "custom",
        path: ["alternateAt"],
        message: "Choose a future alternate time.",
      });
    }
    if (value.alternateAt === value.preferredAt) {
      context.addIssue({
        code: "custom",
        path: ["alternateAt"],
        message: "Choose a different alternate time.",
      });
    }
    if (startedAgo < 3_000 || startedAgo > 7_200_000) {
      context.addIssue({
        code: "custom",
        path: ["formStartedAt"],
        message: "Please refresh the page and try again.",
      });
    }
  });

export const createOwnerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  timezone: ianaTimezoneSchema.default("America/Los_Angeles"),
});

export const registrationSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    timezone: ianaTimezoneSchema,
    privacyConsent: z.literal("on"),
    formStartedAt: z.coerce.number().int().positive(),
    website: z.string().max(0, "Please leave the website field empty."),
  })
  .superRefine((input, context) => {
    if (input.password !== input.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: "The passwords do not match." });
    }
    const elapsed = Date.now() - input.formStartedAt;
    if (elapsed < 3_000 || elapsed > 7_200_000) {
      context.addIssue({ code: "custom", path: ["formStartedAt"], message: "Please refresh and try again." });
    }
  });

export const projectRequestSchema = z
  .object({
    ownerId: z.string().uuid("Choose a project owner."),
    propertyAddressShort: z.string().trim().min(2).max(100),
    sellerNickname: z.string().trim().min(1).max(50),
    summary: z.string().trim().min(20).max(600),
    details: z.string().trim().max(12_000),
    privacyConsent: z.literal("on"),
    formStartedAt: z.coerce.number().int().positive(),
    website: z.string().max(0, "Please leave the website field empty."),
  })
  .superRefine((input, context) => {
    const elapsed = Date.now() - input.formStartedAt;
    if (elapsed < 3_000 || elapsed > 7_200_000) {
      context.addIssue({ code: "custom", path: ["formStartedAt"], message: "Please refresh and try again." });
    }
  });

export const projectRequestDecisionSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "declined"]),
  ownerResponse: z.string().trim().max(2000).optional(),
});

export const projectMemberEmailSchema = z.object({
  projectId: z.string().uuid(),
  email: emailSchema,
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().regex(slugPattern).max(120),
  description: z.string().trim().min(20).max(800),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  displayOrder: z.coerce.number().int().min(0).max(10_000),
});

export const projectSchema = z.object({
  propertyAddressShort: z.string().trim().min(2).max(100),
  sellerNickname: z.string().trim().min(1).max(50),
  summary: z.string().trim().min(20).max(600),
  description: z.string().trim().max(12_000),
  clientUserId: z.string().uuid().optional().or(z.literal("")),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
});

export const projectProgressSchema = z
  .object({
    projectId: z.string().uuid(),
    status: z.enum(["planning", "active", "on_hold", "completed", "archived"]),
    progress: z.coerce.number().int().min(0).max(100),
    targetDate: z.string().optional(),
    targetChangeType: z.enum(["minor", "material"]),
    targetChangeReason: z.string().trim().max(500).optional(),
  })
  .superRefine((input, context) => {
    if (
      input.targetChangeType === "material" &&
      (input.targetChangeReason?.length ?? 0) < 10
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetChangeReason"],
        message: "Describe the material target-date change for the sellers.",
      });
    }
  });

export const milestoneSchema = z
  .object({
    projectId: z.string().uuid(),
    projectStageId: z.string().uuid().optional().or(z.literal("")),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(3000),
    status: z.enum(["not_started", "active", "blocked", "done"]),
    dueDate: z.string().optional(),
    position: z.coerce.number().int().min(0).max(10_000),
    clientVisible: z.boolean(),
    changeType: z.enum(["minor", "material"]),
    changeReason: z.string().trim().max(500).optional(),
  })
  .superRefine((input, context) => {
    if (input.changeType === "material" && (input.changeReason?.length ?? 0) < 10) {
      context.addIssue({
        code: "custom",
        path: ["changeReason"],
        message: "Describe the material milestone change for the sellers.",
      });
    }
  });

export const projectStageSchema = z
  .object({
    projectId: z.string().uuid(),
    stageId: z.string().uuid(),
    status: z.enum(["not_started", "active", "blocked", "done", "skipped"]),
    plannedStartDate: z.string().optional(),
    plannedEndDate: z.string().optional(),
    skipReason: z.string().trim().max(500).optional(),
    changeType: z.enum(["minor", "material"]),
    changeReason: z.string().trim().max(500).optional(),
  })
  .superRefine((input, context) => {
    if (
      input.plannedStartDate &&
      input.plannedEndDate &&
      input.plannedEndDate < input.plannedStartDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["plannedEndDate"],
        message: "The planned end date cannot be before the start date.",
      });
    }

    if (input.status === "skipped" && (input.skipReason?.length ?? 0) < 5) {
      context.addIssue({
        code: "custom",
        path: ["skipReason"],
        message: "Explain why this stage does not apply.",
      });
    }

    if (input.changeType === "material" && (input.changeReason?.length ?? 0) < 10) {
      context.addIssue({
        code: "custom",
        path: ["changeReason"],
        message: "Describe the material change for the sellers.",
      });
    }
  });

export const assessmentSubmissionSchema = z.object({
  projectId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export const assessmentResponseSchema = z
  .object({
    projectId: z.string().uuid(),
    revisionId: z.string().uuid(),
    response: z.enum(["approved", "changes_requested"]),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((input, context) => {
    if (input.response === "changes_requested" && (input.note?.length ?? 0) < 10) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Describe the change you need in at least 10 characters.",
      });
    }
  });

export const projectApproverSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  isApprover: z.boolean(),
});

export const richTextJsonSchema = z.string().transform((value, context) => {
  try {
    const parsed = JSON.parse(value) as unknown;
    const result = z
      .object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() })
      .passthrough()
      .safeParse(parsed);
    if (!result.success) throw new Error("Invalid editor document.");
    return result.data;
  } catch {
    context.addIssue({ code: "custom", message: "The rich-text content is invalid." });
    return z.NEVER;
  }
});

export const projectUpdateSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  bodyJson: richTextJsonSchema,
  bodyText: z.string().trim().min(1).max(12_000),
  audience: z.enum(["owner", "client"]),
});

export const bookingStatusSchema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum([
    "submitted",
    "confirmed",
    "reschedule_proposed",
    "declined",
    "cancelled",
    "completed",
  ]),
  adminNotes: z.string().trim().max(3000).optional(),
});


export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const flattened = z.flattenError(error);
  return Object.fromEntries(
    Object.entries(flattened.fieldErrors).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [],
    ]),
  );
}

const projectTransitions = {
  planning: ["planning", "active", "on_hold", "archived"],
  active: ["active", "on_hold", "completed", "archived"],
  on_hold: ["on_hold", "active", "archived"],
  completed: ["completed", "active", "archived"],
  archived: ["archived", "planning", "active"],
} as const;

const bookingTransitions = {
  submitted: ["submitted", "confirmed", "reschedule_proposed", "declined", "cancelled"],
  confirmed: ["confirmed", "reschedule_proposed", "cancelled", "completed"],
  reschedule_proposed: ["reschedule_proposed", "confirmed", "declined", "cancelled"],
  declined: ["declined"],
  cancelled: ["cancelled"],
  completed: ["completed"],
} as const;

export function isProjectTransitionAllowed(from: keyof typeof projectTransitions, to: string) {
  return (projectTransitions[from] as readonly string[]).includes(to);
}

export function isBookingTransitionAllowed(from: keyof typeof bookingTransitions, to: string) {
  return (bookingTransitions[from] as readonly string[]).includes(to);
}

export function validateProgressForStatus(status: string, progress: number) {
  if (status === "completed" && progress !== 100) return "Completed projects must be at 100% progress.";
  if (status === "planning" && progress === 100) return "A planning project cannot be at 100% progress.";
  return null;
}
