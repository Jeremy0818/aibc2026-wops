"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  CreateMeetingRequestSchema,
  type CreateMeetingRequest,
} from "@/contracts/meeting";
import { useMockMode } from "@/hooks/use-meetings";
import { formatIdr } from "@/lib/client/formatters";
import { createMeeting, WopsApiClientError } from "@/lib/client/meetings-api";
import { KOVA_DEMO_MEETING_DRAFT } from "@/lib/client/mock-meetings";
import { ErrorState } from "@/components/ui/state-views";

interface ParticipantDraft {
  name: string;
  role: string;
  email: string;
}

function toDatetimeLocalValue(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "2026-10-20T10:00";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const inputBaseClass =
  "mt-1.5 w-full rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] px-4 py-3 text-base sm:text-sm text-[#1f1e1c] placeholder:text-[#8a847c] transition focus:border-[#d95d39] focus:bg-white focus:outline-none";

export function CreateMeetingForm() {
  const router = useRouter();
  const { mockMode, toggleMockMode } = useMockMode();

  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState("2026-10-20T10:00");
  const [meetingObjective, setMeetingObjective] = useState("");
  const [clientObjective, setClientObjective] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [budgetCeilingInput, setBudgetCeilingInput] = useState("250000000");
  const [leadRole, setLeadRole] = useState("Creative Team Lead");
  const [participantRole, setParticipantRole] = useState(
    "Creative Campaign Planner"
  );

  const [clientRequirements, setClientRequirements] = useState<string[]>([""]);
  const [constraints, setConstraints] = useState<string[]>([""]);
  const [participants, setParticipants] = useState<ParticipantDraft[]>([
    {
      name: "",
      role: "Creative Campaign Planner",
      email: "",
    },
  ]);
  const [showRosterDetails, setShowRosterDetails] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<WopsApiClientError | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdMeetingId, setCreatedMeetingId] = useState<string | null>(null);

  const parsedBudgetPreview = Number(budgetCeilingInput);

  const applyKovaPreset = () => {
    setTitle(KOVA_DEMO_MEETING_DRAFT.title);
    setClientName(KOVA_DEMO_MEETING_DRAFT.clientName);
    setProjectName(KOVA_DEMO_MEETING_DRAFT.projectName);
    setScheduledLocal(toDatetimeLocalValue(KOVA_DEMO_MEETING_DRAFT.scheduledAt));
    setMeetingObjective(KOVA_DEMO_MEETING_DRAFT.meetingObjective);
    setClientObjective(KOVA_DEMO_MEETING_DRAFT.clientObjective);
    setTargetAudience(KOVA_DEMO_MEETING_DRAFT.targetAudience);
    setBudgetCeilingInput(String(KOVA_DEMO_MEETING_DRAFT.budgetCeilingIdr));
    setLeadRole(KOVA_DEMO_MEETING_DRAFT.leadRole);
    setParticipantRole(KOVA_DEMO_MEETING_DRAFT.participantRole);
    setClientRequirements([...KOVA_DEMO_MEETING_DRAFT.clientRequirements]);
    setConstraints([...KOVA_DEMO_MEETING_DRAFT.constraints]);
    setParticipants(
      KOVA_DEMO_MEETING_DRAFT.participants.map((p) => ({
        name: p.name,
        role: p.role,
        email: p.email ?? "",
      }))
    );
    setShowRosterDetails(true);
    setFieldErrors({});
    setSubmitError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    const nextFieldErrors: Record<string, string> = {};

    const parsedDate = scheduledLocal ? new Date(scheduledLocal) : null;
    const scheduledAtIso =
      parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toISOString()
        : "";

    if (!scheduledAtIso) {
      nextFieldErrors.scheduledAt =
        "Please pick a valid date and time for the meeting.";
    }

    const numericBudget =
      budgetCeilingInput.trim() === "" ? NaN : Number(budgetCeilingInput);
    if (
      !Number.isFinite(numericBudget) ||
      !Number.isInteger(numericBudget) ||
      numericBudget < 0
    ) {
      nextFieldErrors.budgetCeilingIdr =
        "Please enter a whole number in IDR (for example, 250000000).";
    }

    const cleanedRequirements = clientRequirements
      .map((item) => item.trim())
      .filter(Boolean);
    const cleanedConstraints = constraints
      .map((item) => item.trim())
      .filter(Boolean);
    const cleanedParticipants = participants
      .filter(
        (p) =>
          p.name.trim() !== "" ||
          p.role.trim() !== "" ||
          p.email.trim() !== ""
      )
      .map((p) => ({
        name: p.name.trim(),
        role: p.role.trim(),
        ...(p.email.trim() ? { email: p.email.trim() } : {}),
      }));

    const candidatePayload = {
      title: title.trim(),
      clientName: clientName.trim(),
      projectName: projectName.trim(),
      scheduledAt: scheduledAtIso,
      meetingObjective: meetingObjective.trim(),
      clientObjective: clientObjective.trim(),
      clientRequirements: cleanedRequirements,
      targetAudience: targetAudience.trim(),
      constraints: cleanedConstraints,
      budgetCeilingIdr: numericBudget,
      participantRole: participantRole.trim(),
      leadRole: leadRole.trim(),
      participants: cleanedParticipants,
    };

    const zodResult = CreateMeetingRequestSchema.safeParse(candidatePayload);
    if (!zodResult.success || Object.keys(nextFieldErrors).length > 0) {
      if (!zodResult.success) {
        for (const issue of zodResult.error.issues) {
          const pathKey = issue.path.join(".") || "form";
          const rootKey = String(issue.path[0] ?? "form");
          if (!nextFieldErrors[pathKey]) {
            nextFieldErrors[pathKey] = issue.message;
          }
          if (!nextFieldErrors[rootKey]) {
            nextFieldErrors[rootKey] = issue.message;
          }
          if (rootKey === "participants") {
            setShowRosterDetails(true);
          }
        }
      }
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateMeetingRequest = zodResult.data;
      const created = await createMeeting(payload);
      setCreatedMeetingId(created.id);
      router.push(`/meetings/${encodeURIComponent(created.id)}`);
    } catch (err) {
      if (err instanceof WopsApiClientError) {
        setSubmitError(err);
        if (err.details) {
          const apiFieldErrors: Record<string, string> = {};
          for (const detail of err.details) {
            if (detail.field) {
              apiFieldErrors[detail.field] = detail.message;
            }
          }
          setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
        }
      } else {
        setSubmitError(
          new WopsApiClientError({
            message:
              err instanceof Error ? err.message : "Failed to save meeting",
            status: 500,
            code: "INTERNAL_ERROR",
          })
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Conversational Intro Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#5c5852] transition hover:text-[#1f1e1c]"
          >
            <span aria-hidden="true">←</span>
            <span>Back to home</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1f1e1c] sm:text-3xl">
            Prepare for a meeting
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-[#5c5852]">
            Share the context once. WOPS! will use these details to guide a
            focused voice thinking session before everyone meets.
          </p>
        </div>

        <button
          type="button"
          onClick={applyKovaPreset}
          className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 self-start rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-4 py-2 text-xs font-medium text-[#b44322] transition hover:bg-[#fae5dc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39] sm:self-auto"
        >
          <span aria-hidden="true">✦</span>
          <span>Fill with KOVA demo brief</span>
        </button>
      </div>

      {submitError ? (
        <ErrorState
          title="Couldn't save your meeting brief"
          message={submitError.message}
          code={submitError.code}
          showMockToggle={!mockMode}
          onEnableMockMode={() => toggleMockMode(true)}
        />
      ) : null}

      {createdMeetingId ? (
        <div
          role="status"
          className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-5 text-emerald-950"
        >
          <p className="text-sm font-medium">
            Brief saved! Opening your meeting space...
          </p>
          <Link
            href={`/meetings/${encodeURIComponent(createdMeetingId)}`}
            className="mt-1.5 inline-block text-xs font-semibold underline"
          >
            Continue to brief →
          </Link>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Group 1: The Basics */}
        <section className="wops-warm-card rounded-3xl p-5 sm:p-7">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#1f1e1c] sm:text-lg">
              1. What&apos;s the meeting about?
            </h2>
            <p className="text-xs text-[#5c5852]">
              Give the session a clear name, client, and time so your team knows
              what they&apos;re preparing for.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="meeting-title"
                className="block text-xs font-medium text-[#1f1e1c]"
              >
                Meeting title <span className="text-[#d95d39]">*</span>
              </label>
              <input
                id="meeting-title"
                name="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., KOVA Low-Sugar RTD Launch Ideation"
                aria-invalid={Boolean(fieldErrors.title)}
                className={inputBaseClass}
              />
              {fieldErrors.title ? (
                <p className="mt-1.5 text-xs text-[#d95d39]">
                  {fieldErrors.title}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="client-name"
                  className="block text-xs font-medium text-[#1f1e1c]"
                >
                  Client or brand <span className="text-[#d95d39]">*</span>
                </label>
                <input
                  id="client-name"
                  name="clientName"
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., KOVA"
                  aria-invalid={Boolean(fieldErrors.clientName)}
                  className={inputBaseClass}
                />
                {fieldErrors.clientName ? (
                  <p className="mt-1.5 text-xs text-[#d95d39]">
                    {fieldErrors.clientName}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="project-name"
                  className="block text-xs font-medium text-[#1f1e1c]"
                >
                  Project or campaign <span className="text-[#d95d39]">*</span>
                </label>
                <input
                  id="project-name"
                  name="projectName"
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., KOVA Light — Low-Sugar RTD Launch"
                  aria-invalid={Boolean(fieldErrors.projectName)}
                  className={inputBaseClass}
                />
                {fieldErrors.projectName ? (
                  <p className="mt-1.5 text-xs text-[#d95d39]">
                    {fieldErrors.projectName}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <label
                htmlFor="scheduled-at"
                className="block text-xs font-medium text-[#1f1e1c]"
              >
                When is the meeting? <span className="text-[#d95d39]">*</span>
              </label>
              <input
                id="scheduled-at"
                name="scheduledAt"
                type="datetime-local"
                required
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                aria-invalid={Boolean(fieldErrors.scheduledAt)}
                className={inputBaseClass}
              />
              {fieldErrors.scheduledAt ? (
                <p className="mt-1.5 text-xs text-[#d95d39]">
                  {fieldErrors.scheduledAt}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {/* Group 2: Goals, Audience & Budget */}
        <section className="wops-warm-card rounded-3xl p-5 sm:p-7">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#1f1e1c] sm:text-lg">
              2. Goals, audience &amp; budget
            </h2>
            <p className="text-xs text-[#5c5852]">
              What should the team walk away with, who are we speaking to, and
              what is our spending ceiling?
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="meeting-objective"
                className="block text-xs font-medium text-[#1f1e1c]"
              >
                What do we need to align on in this meeting?{" "}
                <span className="text-[#d95d39]">*</span>
              </label>
              <textarea
                id="meeting-objective"
                rows={3}
                required
                value={meetingObjective}
                onChange={(e) => setMeetingObjective(e.target.value)}
                placeholder="e.g., Agree on a primary creative direction and 6-week launch plan before agency review."
                aria-invalid={Boolean(fieldErrors.meetingObjective)}
                className={inputBaseClass}
              />
              {fieldErrors.meetingObjective ? (
                <p className="mt-1.5 text-xs text-[#d95d39]">
                  {fieldErrors.meetingObjective}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="client-objective"
                className="block text-xs font-medium text-[#1f1e1c]"
              >
                What is the client&apos;s campaign goal?{" "}
                <span className="text-[#d95d39]">*</span>
              </label>
              <textarea
                id="client-objective"
                rows={2}
                required
                value={clientObjective}
                onChange={(e) => setClientObjective(e.target.value)}
                placeholder="e.g., Drive product trial among urban young professionals in Jakarta and Surabaya."
                aria-invalid={Boolean(fieldErrors.clientObjective)}
                className={inputBaseClass}
              />
              {fieldErrors.clientObjective ? (
                <p className="mt-1.5 text-xs text-[#d95d39]">
                  {fieldErrors.clientObjective}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="target-audience"
                className="block text-xs font-medium text-[#1f1e1c]"
              >
                Who is the target audience?{" "}
                <span className="text-[#d95d39]">*</span>
              </label>
              <input
                id="target-audience"
                type="text"
                required
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., Urban Gen Z and young millennial commuters in Jakarta & Surabaya (20-32)"
                aria-invalid={Boolean(fieldErrors.targetAudience)}
                className={inputBaseClass}
              />
              {fieldErrors.targetAudience ? (
                <p className="mt-1.5 text-xs text-[#d95d39]">
                  {fieldErrors.targetAudience}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="budget-ceiling-idr"
                className="block text-xs font-medium text-[#1f1e1c]"
              >
                Budget ceiling (IDR) <span className="text-[#d95d39]">*</span>
              </label>
              <input
                id="budget-ceiling-idr"
                name="budgetCeilingIdr"
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                required
                value={budgetCeilingInput}
                onChange={(e) => setBudgetCeilingInput(e.target.value)}
                placeholder="250000000"
                aria-invalid={Boolean(fieldErrors.budgetCeilingIdr)}
                className={inputBaseClass}
              />
              <p className="mt-1.5 text-xs text-[#5c5852]">
                Up to{" "}
                <strong className="font-medium text-[#1f1e1c]">
                  {Number.isFinite(parsedBudgetPreview)
                    ? formatIdr(parsedBudgetPreview)
                    : "—"}
                </strong>{" "}
                · Treated as a maximum ceiling, not a mandatory full spend.
              </p>
              {fieldErrors.budgetCeilingIdr ? (
                <p className="mt-1 text-xs text-[#d95d39]">
                  {fieldErrors.budgetCeilingIdr}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {/* Group 3: Requirements & Guardrails */}
        <section className="wops-warm-card rounded-3xl p-5 sm:p-7">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#1f1e1c] sm:text-lg">
              3. Must-haves &amp; guardrails
            </h2>
            <p className="text-xs text-[#5c5852]">
              Add any deliverables the client asked for or boundaries WOPS!
              should keep in mind during ideation.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            {/* Client Requirements */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#1f1e1c]">
                  Client requirements
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setClientRequirements((prev) => [...prev, ""])
                  }
                  className="text-xs font-medium text-[#d95d39] hover:underline"
                >
                  + Add requirement
                </button>
              </div>
              {clientRequirements.map((reqItem, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={reqItem}
                    aria-label={`Client requirement ${index + 1}`}
                    onChange={(e) => {
                      const next = [...clientRequirements];
                      next[index] = e.target.value;
                      setClientRequirements(next);
                    }}
                    placeholder="e.g., Highlight low-sugar positioning without medical claims"
                    className="w-full rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] px-4 py-2.5 text-base text-[#1f1e1c] placeholder:text-[#8a847c] focus:border-[#d95d39] focus:bg-white focus:outline-none sm:text-sm"
                  />
                  {clientRequirements.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setClientRequirements((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      aria-label={`Remove requirement ${index + 1}`}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ebe6dd] text-xs text-[#5c5852] hover:bg-[#f4f1ea]"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Constraints */}
            <div className="space-y-2.5 border-t border-[#ebe6dd] pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#1f1e1c]">
                  Constraints &amp; things to avoid
                </label>
                <button
                  type="button"
                  onClick={() => setConstraints((prev) => [...prev, ""])}
                  className="text-xs font-medium text-[#d95d39] hover:underline"
                >
                  + Add constraint
                </button>
              </div>
              {constraints.map((conItem, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={conItem}
                    aria-label={`Constraint ${index + 1}`}
                    onChange={(e) => {
                      const next = [...constraints];
                      next[index] = e.target.value;
                      setConstraints(next);
                    }}
                    placeholder="e.g., No unsupported health claims; stay under Rp250,000,000 ceiling"
                    className="w-full rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] px-4 py-2.5 text-base text-[#1f1e1c] placeholder:text-[#8a847c] focus:border-[#d95d39] focus:bg-white focus:outline-none sm:text-sm"
                  />
                  {constraints.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setConstraints((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      aria-label={`Remove constraint ${index + 1}`}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ebe6dd] text-xs text-[#5c5852] hover:bg-[#f4f1ea]"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Group 4: People & Roles (Progressive disclosure for roster) */}
        <section className="wops-warm-card rounded-3xl p-5 sm:p-7">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#1f1e1c] sm:text-lg">
              4. Who&apos;s involved?
            </h2>
            <p className="text-xs text-[#5c5852]">
              Tell WOPS! who sets the brief and who will join the preparation
              voice call.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="lead-role"
                className="block text-xs font-medium text-[#1f1e1c]"
              >
                Brief owner role <span className="text-[#d95d39]">*</span>
              </label>
              <input
                id="lead-role"
                type="text"
                required
                value={leadRole}
                onChange={(e) => setLeadRole(e.target.value)}
                placeholder="Creative Team Lead"
                aria-invalid={Boolean(fieldErrors.leadRole)}
                className={inputBaseClass}
              />
              {fieldErrors.leadRole ? (
                <p className="mt-1.5 text-xs text-[#d95d39]">
                  {fieldErrors.leadRole}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="participant-role"
                className="block text-xs font-medium text-[#1f1e1c]"
              >
                Who receives the WOPS! call?{" "}
                <span className="text-[#d95d39]">*</span>
              </label>
              <input
                id="participant-role"
                type="text"
                required
                value={participantRole}
                onChange={(e) => setParticipantRole(e.target.value)}
                placeholder="Creative Campaign Planner"
                aria-invalid={Boolean(fieldErrors.participantRole)}
                className={inputBaseClass}
              />
              {fieldErrors.participantRole ? (
                <p className="mt-1.5 text-xs text-[#d95d39]">
                  {fieldErrors.participantRole}
                </p>
              ) : null}
            </div>
          </div>

          {/* Progressive Disclosure for Specific Participant Names/Emails */}
          <div className="mt-5 border-t border-[#ebe6dd] pt-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowRosterDetails((prev) => !prev)}
                aria-expanded={showRosterDetails}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5c5852] transition hover:text-[#1f1e1c]"
              >
                <span>
                  {showRosterDetails
                    ? "Hide specific team members"
                    : "Add specific team members (optional)"}
                </span>
                <span aria-hidden="true">
                  {showRosterDetails ? "▴" : "▾"}
                </span>
              </button>

              {showRosterDetails ? (
                <button
                  type="button"
                  onClick={() =>
                    setParticipants((prev) => [
                      ...prev,
                      {
                        name: "",
                        role: participantRole || "Planner",
                        email: "",
                      },
                    ])
                  }
                  className="text-xs font-medium text-[#d95d39] hover:underline"
                >
                  + Add person
                </button>
              ) : null}
            </div>

            {showRosterDetails ? (
              <div className="mt-3 space-y-3">
                {participants.map((person, index) => (
                  <div
                    key={index}
                    className="space-y-2.5 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-3.5 sm:grid sm:grid-cols-12 sm:gap-2.5 sm:space-y-0"
                  >
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={person.name}
                        aria-label={`Participant ${index + 1} name`}
                        onChange={(e) => {
                          const next = [...participants];
                          next[index] = {
                            ...next[index],
                            name: e.target.value,
                          };
                          setParticipants(next);
                        }}
                        placeholder="Name (e.g., Nadia Kusuma)"
                        className="w-full rounded-xl border border-[#ebe6dd] bg-white px-3 py-2 text-base text-[#1f1e1c] placeholder:text-[#8a847c] sm:text-xs"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={person.role}
                        aria-label={`Participant ${index + 1} role`}
                        onChange={(e) => {
                          const next = [...participants];
                          next[index] = {
                            ...next[index],
                            role: e.target.value,
                          };
                          setParticipants(next);
                        }}
                        placeholder="Role"
                        className="w-full rounded-xl border border-[#ebe6dd] bg-white px-3 py-2 text-base text-[#1f1e1c] placeholder:text-[#8a847c] sm:text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-4">
                      <input
                        type="email"
                        value={person.email}
                        aria-label={`Participant ${index + 1} email (optional)`}
                        onChange={(e) => {
                          const next = [...participants];
                          next[index] = {
                            ...next[index],
                            email: e.target.value,
                          };
                          setParticipants(next);
                        }}
                        placeholder="Email (optional)"
                        className="w-full rounded-xl border border-[#ebe6dd] bg-white px-3 py-2 text-base text-[#1f1e1c] placeholder:text-[#8a847c] sm:text-xs"
                      />
                      {participants.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setParticipants((prev) =>
                              prev.filter((_, i) => i !== index)
                            )
                          }
                          aria-label={`Remove participant ${index + 1}`}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ebe6dd] bg-white text-xs text-[#5c5852] hover:bg-[#f4f1ea]"
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {fieldErrors.participants ? (
              <p className="mt-2 text-xs text-[#d95d39]">
                {fieldErrors.participants}
              </p>
            ) : null}
          </div>
        </section>

        {/* Primary Submit Action Bar */}
        <div className="flex flex-col-reverse items-stretch justify-between gap-3 pt-2 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#ebe6dd] bg-white px-6 py-2.5 text-sm font-medium text-[#5c5852] transition hover:bg-[#f4f1ea] hover:text-[#1f1e1c]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#d95d39] px-7 py-3 text-sm font-medium text-white shadow-xs transition hover:bg-[#c34e2c] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving brief...</span>
              </>
            ) : (
              <>
                <span>Save brief &amp; continue</span>
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
