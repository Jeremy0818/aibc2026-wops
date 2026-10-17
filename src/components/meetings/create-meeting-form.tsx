"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { MeetingParticipant } from "@/contracts/meeting";
import { useMockMode } from "@/hooks/use-meetings";
import { useDocumentFirstSetup } from "@/hooks/use-document-first-setup";
import { KOVA_DEMO_MEETING_DRAFT } from "@/lib/client/mock-meetings";
import { ErrorState } from "@/components/ui/state-views";
import { ClientDocumentsPicker } from "./client-documents-picker";
import { SetupReviewPanel } from "./setup-review-panel";

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
  "mt-1.5 w-full rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] px-4 py-3 text-base sm:text-sm text-[#1f1e1c] placeholder:text-[#8a847c] transition focus:border-[#d95d39] focus:bg-white focus:outline-none disabled:opacity-60";

function SectionHeading({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-base font-semibold text-[#1f1e1c] sm:text-lg">
        {step}. {title}
      </h2>
      <p className="text-xs leading-relaxed text-[#5c5852]">{description}</p>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1.5 text-xs text-[#d95d39]">{message}</p>
  ) : null;
}

export function CreateMeetingForm() {
  const { mockMode } = useMockMode();
  const setup = useDocumentFirstSetup();

  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState("2026-10-20T10:00");
  const [meetingObjective, setMeetingObjective] = useState("");
  const [leadRole, setLeadRole] = useState("Creative Team Lead");
  const [participants, setParticipants] = useState<ParticipantDraft[]>([
    { name: "", role: "Creative Campaign Planner", email: "" },
    { name: "", role: "Senior Brand Designer", email: "" },
  ]);

  const { fieldErrors, phase, hasDraft, isLocked } = setup;
  const formDisabled = hasDraft || isLocked;

  // Fills ONLY Team Lead–owned fields. Client brief details come from documents.
  const applyKovaBasics = () => {
    setTitle(KOVA_DEMO_MEETING_DRAFT.title);
    setClientName(KOVA_DEMO_MEETING_DRAFT.clientName);
    setProjectName(KOVA_DEMO_MEETING_DRAFT.projectName);
    setScheduledLocal(toDatetimeLocalValue(KOVA_DEMO_MEETING_DRAFT.scheduledAt));
    setMeetingObjective(KOVA_DEMO_MEETING_DRAFT.meetingObjective);
    setLeadRole(KOVA_DEMO_MEETING_DRAFT.leadRole);
    const employees = KOVA_DEMO_MEETING_DRAFT.participants.filter(
      (p) =>
        p.role.trim().toLowerCase() !==
        KOVA_DEMO_MEETING_DRAFT.leadRole.trim().toLowerCase()
    );
    setParticipants(
      employees.map((p) => ({ name: p.name, role: p.role, email: p.email ?? "" }))
    );
  };

  const addSampleKovaPdf = () => {
    const sample = new File(
      ["%PDF-1.4\n% WOPS! demo-mode sample client brief\n"],
      "KOVA-Brand-Brief-2026.pdf",
      { type: "application/pdf", lastModified: 0 }
    );
    setup.addFiles([sample]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedDate = scheduledLocal ? new Date(scheduledLocal) : null;
    const scheduledAt =
      parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toISOString()
        : "";

    const cleanedParticipants: MeetingParticipant[] = participants
      .filter((p) => p.name.trim() || p.role.trim() || p.email.trim())
      .map((p) => ({
        name: p.name.trim(),
        role: p.role.trim(),
        ...(p.email.trim() ? { email: p.email.trim() } : {}),
      }));

    void setup.submit({
      title,
      clientName,
      projectName,
      scheduledAt,
      meetingObjective,
      leadRole,
      participants: cleanedParticipants,
    });
  };

  const selectableCount = setup.queue.filter((q) => q.status === "queued").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <Link
            href="/meetings"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#5c5852] transition hover:text-[#1f1e1c]"
          >
            <span aria-hidden="true">←</span>
            <span>Back to meetings</span>
          </Link>
          <p className="text-xs font-medium text-[#d95d39]">
            Team Lead · Meeting Setup
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1f1e1c] sm:text-3xl">
            Create Meeting
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-[#5c5852]">
            Add meeting basics, attach the client&apos;s documents, and assign your
            team. WOPS! extracts the brief for you — no manual transcription required.
          </p>
        </div>

        {!formDisabled ? (
          <button
            type="button"
            onClick={applyKovaBasics}
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 self-start rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-4 py-2 text-xs font-medium text-[#b44322] transition hover:bg-[#fae5dc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39] sm:self-auto"
          >
            <span aria-hidden="true">✦</span>
            <span>Fill KOVA demo basics &amp; team</span>
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* 1. Basics */}
        <section className="wops-warm-card rounded-3xl p-5 sm:p-7">
          <SectionHeading
            step={1}
            title="Meeting basics"
            description="Essential meeting metadata. The client campaign brief will be extracted from the documents below."
          />
          <fieldset disabled={formDisabled} className="mt-5 space-y-4">
            <div>
              <label htmlFor="meeting-title" className="block text-xs font-medium text-[#1f1e1c]">
                Meeting title <span className="text-[#d95d39]">*</span>
              </label>
              <input
                id="meeting-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., KOVA Low-Sugar RTD Launch Ideation"
                aria-invalid={Boolean(fieldErrors.title)}
                className={inputBaseClass}
              />
              <FieldError message={fieldErrors.title} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="client-name" className="block text-xs font-medium text-[#1f1e1c]">
                  Client <span className="text-[#d95d39]">*</span>
                </label>
                <input
                  id="client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., KOVA"
                  aria-invalid={Boolean(fieldErrors.clientName)}
                  className={inputBaseClass}
                />
                <FieldError message={fieldErrors.clientName} />
              </div>
              <div>
                <label htmlFor="project-name" className="block text-xs font-medium text-[#1f1e1c]">
                  Project <span className="text-[#d95d39]">*</span>
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., KOVA Light — Low-Sugar RTD Launch"
                  aria-invalid={Boolean(fieldErrors.projectName)}
                  className={inputBaseClass}
                />
                <FieldError message={fieldErrors.projectName} />
              </div>
            </div>

            <div>
              <label htmlFor="scheduled-at" className="block text-xs font-medium text-[#1f1e1c]">
                When is the meeting? <span className="text-[#d95d39]">*</span>
              </label>
              <input
                id="scheduled-at"
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                aria-invalid={Boolean(fieldErrors.scheduledAt)}
                className={inputBaseClass}
              />
              <FieldError message={fieldErrors.scheduledAt} />
            </div>

            <div>
              <label htmlFor="meeting-objective" className="block text-xs font-medium text-[#1f1e1c]">
                What should the team align on internally?{" "}
                <span className="text-[#d95d39]">*</span>
              </label>
              <textarea
                id="meeting-objective"
                rows={3}
                value={meetingObjective}
                onChange={(e) => setMeetingObjective(e.target.value)}
                placeholder="e.g., Agree on one creative direction and a 6-week launch plan before the client review."
                aria-invalid={Boolean(fieldErrors.meetingObjective)}
                className={inputBaseClass}
              />
              <FieldError message={fieldErrors.meetingObjective} />
            </div>
          </fieldset>
        </section>

        {/* 2. Client documents */}
        <section className="wops-warm-card rounded-3xl p-5 sm:p-7">
          <SectionHeading
            step={2}
            title="Client documents"
            description="Attach client briefs once for the whole team. WOPS! extracts objectives, audience, budget ceiling, and constraints with source citations."
          />
          <div className="mt-5">
            <ClientDocumentsPicker
              queue={setup.queue}
              canEditSelection={!formDisabled}
              canRetry={hasDraft && phase === "review"}
              onAddFiles={setup.addFiles}
              onRemove={setup.removeFile}
              onRetry={(id) => void setup.retryFile(id)}
              onAddSample={mockMode && !formDisabled ? addSampleKovaPdf : undefined}
            />
          </div>
        </section>

        {/* 3. Team */}
        <section className="wops-warm-card rounded-3xl p-5 sm:p-7">
          <SectionHeading
            step={3}
            title="Who's preparing?"
            description="All assigned employees share the same client document brief. Each role gets its own tailored AI preparation session."
          />
          <fieldset disabled={formDisabled} className="mt-5 space-y-4">
            <div>
              <label htmlFor="lead-role" className="block text-xs font-medium text-[#1f1e1c]">
                Your role (meeting owner) <span className="text-[#d95d39]">*</span>
              </label>
              <input
                id="lead-role"
                type="text"
                value={leadRole}
                onChange={(e) => setLeadRole(e.target.value)}
                placeholder="Creative Team Lead"
                aria-invalid={Boolean(fieldErrors.leadRole)}
                className={inputBaseClass}
              />
              <FieldError message={fieldErrors.leadRole} />
            </div>

            <div className="border-t border-[#ebe6dd] pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[#1f1e1c]">
                  Assigned employees <span className="text-[#d95d39]">*</span>
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setParticipants((prev) => [
                      ...prev,
                      { name: "", role: "", email: "" },
                    ])
                  }
                  className="text-xs font-medium text-[#d95d39] hover:underline"
                >
                  + Add employee
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {participants.map((person, index) => {
                  const update = (patch: Partial<ParticipantDraft>) =>
                    setParticipants((prev) =>
                      prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
                    );
                  return (
                    <div
                      key={index}
                      className="space-y-2.5 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-3.5 sm:grid sm:grid-cols-12 sm:gap-2.5 sm:space-y-0"
                    >
                      <input
                        type="text"
                        value={person.name}
                        aria-label={`Employee ${index + 1} name`}
                        onChange={(e) => update({ name: e.target.value })}
                        placeholder="Name (e.g., Nadia Kusuma)"
                        aria-invalid={Boolean(fieldErrors[`participants.${index}.name`])}
                        className="w-full rounded-xl border border-[#ebe6dd] bg-white px-3 py-2 text-base text-[#1f1e1c] placeholder:text-[#8a847c] sm:col-span-4 sm:text-xs"
                      />
                      <input
                        type="text"
                        value={person.role}
                        aria-label={`Employee ${index + 1} role`}
                        onChange={(e) => update({ role: e.target.value })}
                        placeholder="Role (e.g., Campaign Planner)"
                        aria-invalid={Boolean(fieldErrors[`participants.${index}.role`])}
                        className="w-full rounded-xl border border-[#ebe6dd] bg-white px-3 py-2 text-base text-[#1f1e1c] placeholder:text-[#8a847c] sm:col-span-4 sm:text-xs"
                      />
                      <div className="flex items-center gap-2 sm:col-span-4">
                        <input
                          type="email"
                          value={person.email}
                          aria-label={`Employee ${index + 1} email (optional)`}
                          onChange={(e) => update({ email: e.target.value })}
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
                            aria-label={`Remove employee ${index + 1}`}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ebe6dd] bg-white text-xs text-[#5c5852] hover:bg-[#f4f1ea]"
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>
                      {fieldErrors[`participants.${index}.name`] ||
                      fieldErrors[`participants.${index}.role`] ||
                      fieldErrors[`participants.${index}.email`] ? (
                        <p className="text-xs text-[#d95d39] sm:col-span-12">
                          {fieldErrors[`participants.${index}.name`] ??
                            fieldErrors[`participants.${index}.role`] ??
                            fieldErrors[`participants.${index}.email`]}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <FieldError message={fieldErrors.participants} />
            </div>
          </fieldset>
        </section>

        {/* 4. Review — grounded facts review and explicit setup finalization */}
        <section className="wops-warm-card rounded-3xl p-5 sm:p-7">
          <SectionHeading
            step={4}
            title="Review the extracted brief & finalize"
            description="Source-backed facts extracted from your documents. Confirming setup unlocks role-aware AI preparation for your team."
          />
          <div className="mt-5">
            <SetupReviewPanel
              phase={phase}
              meeting={setup.meeting}
              queue={setup.queue}
              documents={setup.contextDocuments}
              synthesizedBrief={setup.synthesizedBrief}
              keyFacts={setup.keyFacts}
              contextError={setup.contextError}
              finalizeError={setup.finalizeError}
              onReloadContext={() =>
                setup.meeting ? void setup.refreshContext(setup.meeting.id) : undefined
              }
              onFinalizeSetup={() => void setup.finalizeSetup()}
            />
          </div>
        </section>

        {phase === "draft_failed" && setup.draftError ? (
          <ErrorState
            title="Couldn't create the meeting draft"
            message={`${setup.draftError.message} Nothing was uploaded — your details and selected files are still here.`}
            code={setup.draftError.code}
          />
        ) : null}

        {/* Action bar */}
        {!hasDraft ? (
          <div className="flex flex-col-reverse items-stretch justify-between gap-3 pt-2 sm:flex-row sm:items-center">
            <Link
              href="/meetings"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#ebe6dd] bg-white px-6 py-2.5 text-sm font-medium text-[#5c5852] transition hover:bg-[#f4f1ea] hover:text-[#1f1e1c]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLocked}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#d95d39] px-7 py-3 text-sm font-medium text-white shadow-xs transition hover:bg-[#c34e2c] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
            >
              {phase === "creating_draft" ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Creating meeting draft…</span>
                </>
              ) : (
                <>
                  <span>
                    {selectableCount > 0
                      ? `Create meeting & upload ${selectableCount} ${selectableCount === 1 ? "document" : "documents"}`
                      : "Create meeting draft"}
                  </span>
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
