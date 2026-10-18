"use client";

import { useState } from "react";
import type {
  CreateDocumentFactRequest,
  DocumentFact,
  DocumentMetadata,
  FactCategory,
  UpdateDocumentFactRequest,
} from "@/contracts/document";
import type { Meeting } from "@/contracts/meeting";
import { formatDateTime, formatIdr } from "@/lib/client/formatters";
import {
  getOriginalFactStatement,
  isFactCorrectedByLead,
} from "@/lib/client/fact-evidence";

const FACT_CATEGORIES: { value: FactCategory; label: string }[] = [
  { value: "client_objective", label: "Client Objective" },
  { value: "target_audience", label: "Target Audience" },
  { value: "requirement", label: "Requirement" },
  { value: "budget", label: "Budget Ceiling" },
  { value: "constraint", label: "Constraint / Guardrail" },
  { value: "deliverable", label: "Deliverable" },
  { value: "timeline", label: "Timeline" },
  { value: "other", label: "Other Brief Context" },
];

interface SectionConfig {
  key: string;
  categories: FactCategory[];
  defaultCategory: FactCategory;
  title: string;
  subtitle: string;
  emptyExplanation: string;
  badgeLabel: string;
  addLabel: string;
  inputPlaceholder: string;
}

const BRIEF_SECTIONS: SectionConfig[] = [
  {
    key: "objectives",
    categories: ["client_objective"],
    defaultCategory: "client_objective",
    title: "Client Campaign Objective",
    subtitle: "Core strategic goal and primary outcome expected by the client",
    emptyExplanation:
      "No structured campaign objective statement was extracted from the uploaded PDF.",
    badgeLabel: "Objective",
    addLabel: "Add Campaign Objective",
    inputPlaceholder:
      "e.g. Drive trial among urban commuters in Jakarta and Surabaya without sacrificing taste perception.",
  },
  {
    key: "audience",
    categories: ["target_audience"],
    defaultCategory: "target_audience",
    title: "Target Audience & Demographics",
    subtitle: "Who the campaign is designed to reach, engage, and convert",
    emptyExplanation:
      "No audience demographics or distribution corridors were extracted from the PDF.",
    badgeLabel: "Audience",
    addLabel: "Add Target Audience",
    inputPlaceholder:
      "e.g. Indonesian urban Gen Z and young millennial commuters (ages 20-32) in Jakarta and Surabaya transit corridors.",
  },
  {
    key: "requirements",
    categories: ["requirement"],
    defaultCategory: "requirement",
    title: "Client Requirements",
    subtitle: "Mandatory specs, messaging angles, and brief requirements",
    emptyExplanation:
      "No explicit client requirements were extracted from the PDF.",
    badgeLabel: "Requirement",
    addLabel: "Add Requirement",
    inputPlaceholder:
      "e.g. Highlight 5g cane sugar RTD positioning without making clinical or medical claims.",
  },
  {
    key: "budget",
    categories: ["budget"],
    defaultCategory: "budget",
    title: "Budget Ceiling & Commercials",
    subtitle: "Commercial ceiling and spending boundaries established by the client",
    emptyExplanation:
      "No budget ceiling facts were detected in the uploaded documents.",
    badgeLabel: "Budget",
    addLabel: "Add Budget Ceiling",
    inputPlaceholder: "Enter budget ceiling amount in IDR (e.g. 250000000)",
  },
  {
    key: "constraints",
    categories: ["constraint"],
    defaultCategory: "constraint",
    title: "Guardrails & Constraints",
    subtitle: "Brand guardrails, regulatory boundaries, and compliance rules",
    emptyExplanation:
      "No explicit constraints were extracted from the PDF.",
    badgeLabel: "Guardrail",
    addLabel: "Add Constraint",
    inputPlaceholder:
      "e.g. All copy and creator activations must avoid clinical, medical, or weight-loss claims.",
  },
  {
    key: "deliverables_timeline",
    categories: ["deliverable", "timeline"],
    defaultCategory: "deliverable",
    title: "Deliverables & Timeline",
    subtitle: "Phased rollout milestones, schedules, and campaign asset deliverables",
    emptyExplanation:
      "No timeline or deliverable facts were extracted from the PDF.",
    badgeLabel: "Scope",
    addLabel: "Add Deliverable / Milestone",
    inputPlaceholder:
      "e.g. 6-week phased rollout: Week 1 creator seeding, Week 3 commuter station sampling hubs.",
  },
];

export function EditableGroundedContext({
  meeting,
  documents,
  synthesizedBrief,
  keyFacts,
  missingCategories,
  isLeadPersona,
  onAddFact,
  onUpdateFact,
}: {
  meeting: Meeting;
  documents: DocumentMetadata[];
  synthesizedBrief?: string;
  keyFacts: DocumentFact[];
  missingCategories: FactCategory[];
  isLeadPersona: boolean;
  onAddFact: (input: CreateDocumentFactRequest) => Promise<DocumentFact>;
  onUpdateFact: (
    factId: string,
    updates: UpdateDocumentFactRequest
  ) => Promise<DocumentFact>;
}) {
  const readyDocs = documents.filter((d) => d.processingStatus === "ready");

  // State to track which section is currently adding a new fact
  const [addingSectionKey, setAddingSectionKey] = useState<string | null>(null);

  // Map fact ID to document name
  const docNameMap = new Map<string, string>();
  for (const doc of readyDocs) {
    for (const f of doc.extractedFacts) {
      docNameMap.set(f.id, doc.name);
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#d95d39]">
              Area 2
            </span>
            <span aria-hidden="true" className="text-[#dcd4c6]">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-2.5 py-0.5 text-[11px] font-medium text-[#b44322]">
              <span aria-hidden="true">✦</span>
              <span>Extracted &amp; Confirmed Brief</span>
            </span>
            <span className="text-xs text-[#8a847c]">
              {keyFacts.length} {keyFacts.length === 1 ? "fact" : "facts"} across{" "}
              {readyDocs.length} {readyDocs.length === 1 ? "document" : "documents"} · Revision v{meeting.contextVersion ?? 1}
            </span>
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#1f1e1c] sm:text-xl">
            Extracted &amp; Confirmed Brief
          </h2>
          <p className="mt-0.5 text-xs text-[#5c5852] sm:text-sm">
            Confirmed document facts and Team Lead additions serve as the single source of truth for all
            assigned employee preparation sessions.
          </p>
        </div>

        {/* Persona Indicator */}
        <div className="self-start sm:self-auto">
          {isLeadPersona ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#cce5d8] bg-[#edf7f2] px-3 py-1 text-xs font-medium text-[#1f6a47]">
              <span>Team Lead Mode (Editing &amp; Additions Enabled)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#ebe6dd] bg-[#faf9f6] px-3 py-1 text-xs font-medium text-[#5c5852]">
              <span>Employee Persona (Read-Only)</span>
            </span>
          )}
        </div>
      </div>

      {/* Synthesized Brief Overview (when available from ready documents) */}
      {synthesizedBrief ? (
        <div className="rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-4 sm:p-5">
          <p className="text-xs font-medium text-[#8a847c]">
            Synthesized brief overview
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[#1f1e1c]">
            {synthesizedBrief}
          </p>
        </div>
      ) : null}

      {/* Missing Categories Summary Banner */}
      {missingCategories.length > 0 ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-3.5 text-xs text-[#9a3412]">
          <span aria-hidden="true" className="font-bold">
            ℹ
          </span>
          <p className="leading-relaxed">
            <span className="font-semibold">
              {missingCategories.length}{" "}
              {missingCategories.length === 1
                ? "strategic section is"
                : "strategic sections are"}{" "}
              missing
            </span>{" "}
            from client documents. As Team Lead, use the &ldquo;+ Add Information&rdquo; buttons below to
            provide missing requirements, budget ceilings, or campaign goals before team preparation begins.
          </p>
        </div>
      ) : null}

      {/* Categorized Sections */}
      <div className="space-y-5">
        {BRIEF_SECTIONS.map((section) => {
          const matchingFacts = keyFacts.filter((f) =>
            section.categories.includes(f.category)
          );
          const hasFacts = matchingFacts.length > 0;
          const isAddingThisSection = addingSectionKey === section.key;

          return (
            <section
              key={section.key}
              aria-labelledby={`section-heading-${section.key}`}
              className="wops-warm-card rounded-3xl p-5 sm:p-6"
            >
              {/* Section Heading & Add Action */}
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#ebe6dd] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[#ebe6dd] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#8a847c]">
                      {section.badgeLabel}
                    </span>
                    <h3
                      id={`section-heading-${section.key}`}
                      className="text-base font-semibold text-[#1f1e1c]"
                    >
                      {section.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-[#5c5852]">
                    {section.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {hasFacts ? (
                    <span className="rounded-full bg-[#f4f1ea] px-2.5 py-0.5 text-[11px] font-medium text-[#5c5852]">
                      {matchingFacts.length}{" "}
                      {matchingFacts.length === 1 ? "fact" : "facts"}
                    </span>
                  ) : (
                    <span className="rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-0.5 text-[11px] font-medium text-[#9a3412]">
                      Missing from brief
                    </span>
                  )}

                  {isLeadPersona && !isAddingThisSection && (
                    <button
                      type="button"
                      onClick={() => setAddingSectionKey(section.key)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#ebe6dd] bg-white px-3 py-1 text-xs font-semibold text-[#d95d39] transition hover:border-[#f5d5c8] hover:bg-[#fdf1ec]"
                    >
                      <span aria-hidden="true">+</span>
                      <span>{section.addLabel}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add Fact Form Card */}
              {isAddingThisSection && (
                <div className="mt-4">
                  <AddFactFormCard
                    section={section}
                    meeting={meeting}
                    existingFacts={keyFacts}
                    onCancel={() => setAddingSectionKey(null)}
                    onSave={async (newFactInput) => {
                      await onAddFact(newFactInput);
                      setAddingSectionKey(null);
                    }}
                  />
                </div>
              )}

              {/* Facts List or Empty/Missing State */}
              <div className="mt-4 space-y-3">
                {hasFacts ? (
                  matchingFacts.map((fact) => (
                    <FactItemCard
                      key={fact.id}
                      fact={fact}
                      sourceDocName={
                        fact.sourceDocumentName ?? docNameMap.get(fact.id)
                      }
                      isLeadPersona={isLeadPersona}
                      onUpdateFact={onUpdateFact}
                    />
                  ))
                ) : !isAddingThisSection ? (
                  <div className="rounded-2xl border border-dashed border-[#dcd4c6] bg-[#faf9f6]/70 p-4">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fed7aa] text-xs font-bold text-[#9a3412]"
                      >
                        !
                      </span>
                      <div className="space-y-1 text-xs leading-relaxed text-[#5c5852]">
                        <p className="font-semibold text-[#1f1e1c]">
                          {section.emptyExplanation}
                        </p>
                        <p>
                          WOPS! never invents or hallucinates missing document
                          facts.
                          {isLeadPersona
                            ? " Click the button above to provide this context directly for your team."
                            : " The AI partner will explore this gap during employee preparation sessions."}
                        </p>
                        {isLeadPersona && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => setAddingSectionKey(section.key)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#d95d39] px-4 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#c34e2c]"
                            >
                              <span aria-hidden="true">+</span>
                              <span>{section.addLabel}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function AddFactFormCard({
  section,
  meeting,
  existingFacts,
  onCancel,
  onSave,
}: {
  section: SectionConfig;
  meeting: Meeting;
  existingFacts: DocumentFact[];
  onCancel: () => void;
  onSave: (input: CreateDocumentFactRequest) => Promise<void>;
}) {
  const isBudget = section.key === "budget";
  const [statementText, setStatementText] = useState("");
  const [budgetAmount, setBudgetAmount] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<FactCategory>(
    section.defaultCategory
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleBudgetChange = (raw: string) => {
    // Only accept numeric digits
    const digitsOnly = raw.replace(/[^\d]/g, "");
    setBudgetAmount(digitsOnly);
    setFormError(null);
  };

  const handleSubmit = async () => {
    setFormError(null);

    let finalStatement = statementText.trim();

    if (isBudget) {
      if (!budgetAmount) {
        setFormError("Please enter a valid numeric budget ceiling amount.");
        return;
      }
      const num = parseInt(budgetAmount, 10);
      if (Number.isNaN(num) || num <= 0) {
        setFormError("Budget ceiling must be a positive number greater than 0.");
        return;
      }
      finalStatement = `Total campaign budget ceiling is ${formatIdr(num)} (ceiling, not mandatory spend).`;
    } else {
      if (!finalStatement) {
        setFormError("Please enter information before saving.");
        return;
      }
    }

    // Duplicate check: ensure this exact statement is not already in the meeting
    const isDuplicate = existingFacts.some(
      (f) =>
        f.category === selectedCategory &&
        f.statement.trim().toLowerCase() === finalStatement.toLowerCase()
    );

    if (isDuplicate) {
      setFormError("An identical fact has already been added to this meeting context.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        statement: finalStatement,
        category: selectedCategory,
        provenance: "lead_added",
        confirmedByLead: true,
        addedByRole: meeting.leadRole,
        addedByUserId: "usr_lead_01",
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to add fact. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-[#d95d39] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2 border-b border-[#f4f1ea] pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#b44322]">
          <span aria-hidden="true">✎</span>
          <span>Add New Context — {section.title}</span>
        </div>
        <span className="rounded-full bg-[#fdf1ec] px-2 py-0.5 text-[10px] font-medium text-[#b44322]">
          Author: {meeting.leadRole}
        </span>
      </div>

      <div className="mt-3 space-y-3.5">
        {/* Category selector if section supports multiple (e.g. deliverables & timeline) */}
        {section.categories.length > 1 && (
          <div>
            <label
              htmlFor={`new-fact-cat-${section.key}`}
              className="block text-xs font-medium text-[#1f1e1c]"
            >
              Category type
            </label>
            <select
              id={`new-fact-cat-${section.key}`}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as FactCategory)}
              disabled={isSaving}
              className="mt-1 block rounded-xl border border-[#ebe6dd] bg-[#faf9f6] px-3 py-1.5 text-xs text-[#1f1e1c] focus:border-[#d95d39] focus:outline-hidden focus:ring-2 focus:ring-[#f5d5c8] disabled:opacity-50"
            >
              {section.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "deliverable" ? "Deliverable / Asset Scope" : "Timeline / Rollout Date"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Budget Numeric Field */}
        {isBudget ? (
          <div>
            <label
              htmlFor="budget-numeric-input"
              className="block text-xs font-medium text-[#1f1e1c]"
            >
              Budget Ceiling Amount (IDR)
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-[#8a847c]">
                Rp
              </span>
              <input
                id="budget-numeric-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="250000000"
                value={budgetAmount}
                onChange={(e) => handleBudgetChange(e.target.value)}
                disabled={isSaving}
                className="w-full rounded-xl border border-[#ebe6dd] bg-[#faf9f6] py-2.5 pr-3 pl-9 text-sm font-semibold text-[#1f1e1c] focus:border-[#d95d39] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#f5d5c8] disabled:opacity-50"
              />
            </div>
            {budgetAmount ? (
              <p className="mt-1.5 text-xs font-medium text-[#d95d39]">
                Formatted Preview: {formatIdr(parseInt(budgetAmount, 10) || 0)}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-[#8a847c]">
                Enter numbers only. Ceiling amount will be displayed in Indonesian Rupiah.
              </p>
            )}
          </div>
        ) : (
          <div>
            <label
              htmlFor={`fact-text-input-${section.key}`}
              className="block text-xs font-medium text-[#1f1e1c]"
            >
              Information Statement
            </label>
            <textarea
              id={`fact-text-input-${section.key}`}
              rows={3}
              placeholder={section.inputPlaceholder}
              value={statementText}
              onChange={(e) => {
                setStatementText(e.target.value);
                setFormError(null);
              }}
              disabled={isSaving}
              className="mt-1 w-full rounded-xl border border-[#ebe6dd] bg-[#faf9f6] p-3 text-xs leading-relaxed text-[#1f1e1c] focus:border-[#d95d39] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#f5d5c8] disabled:opacity-50"
            />
          </div>
        )}

        {/* Error Feedback */}
        {formError && (
          <div className="rounded-xl border border-[#f3c9c0] bg-[#fdf0ed] p-2.5 text-xs text-[#a5321b]">
            <p className="font-semibold">{formError}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-full border border-[#ebe6dd] px-3.5 py-1.5 text-xs font-medium text-[#5c5852] transition hover:bg-[#faf9f6] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || (isBudget ? !budgetAmount : !statementText.trim())}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#d95d39] px-4 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-[#c34e2c] disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving…</span>
              </>
            ) : (
              <span>Save Information</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function FactItemCard({
  fact,
  sourceDocName,
  isLeadPersona,
  onUpdateFact,
}: {
  fact: DocumentFact;
  sourceDocName?: string;
  isLeadPersona: boolean;
  onUpdateFact: (
    factId: string,
    updates: UpdateDocumentFactRequest
  ) => Promise<DocumentFact>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [statementDraft, setStatementDraft] = useState(fact.statement);
  const [categoryDraft, setCategoryDraft] = useState<FactCategory>(
    fact.category
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isHumanAdded = fact.provenance === "lead_added";
  const originalExcerpt = !isHumanAdded ? getOriginalFactStatement(fact) : "";
  const isEdited = !isHumanAdded && isFactCorrectedByLead(fact);

  const handleStartEdit = () => {
    setStatementDraft(fact.statement);
    setCategoryDraft(fact.category);
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setStatementDraft(fact.statement);
    setCategoryDraft(fact.category);
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmed = statementDraft.trim();
    if (!trimmed) {
      setSaveError("Fact statement cannot be empty.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await onUpdateFact(fact.id, {
        statement: trimmed,
        category: categoryDraft,
        provenance: isHumanAdded ? "lead_added" : "confirmed",
        confirmedByLead: true,
      });
      setIsEditing(false);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to save correction. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="rounded-2xl border-2 border-[#d95d39] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#b44322]">
            {isHumanAdded ? "Edit Lead Addition" : "Correct Extracted Fact"}
          </span>
          <span className="text-[11px] text-[#8a847c]">
            {isHumanAdded
              ? "Human-added fact"
              : "Original PDF evidence is safely preserved"}
          </span>
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <label
              htmlFor={`fact-edit-${fact.id}`}
              className="block text-xs font-medium text-[#1f1e1c]"
            >
              Statement
            </label>
            <textarea
              id={`fact-edit-${fact.id}`}
              rows={3}
              value={statementDraft}
              onChange={(e) => setStatementDraft(e.target.value)}
              disabled={isSaving}
              className="mt-1 w-full rounded-xl border border-[#ebe6dd] bg-[#faf9f6] p-3 text-xs leading-relaxed text-[#1f1e1c] focus:border-[#d95d39] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#f5d5c8] disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor={`fact-category-${fact.id}`}
              className="block text-xs font-medium text-[#1f1e1c]"
            >
              Category
            </label>
            <select
              id={`fact-category-${fact.id}`}
              value={categoryDraft}
              onChange={(e) => setCategoryDraft(e.target.value as FactCategory)}
              disabled={isSaving}
              className="mt-1 block rounded-xl border border-[#ebe6dd] bg-white px-3 py-1.5 text-xs text-[#1f1e1c] focus:border-[#d95d39] focus:outline-hidden focus:ring-2 focus:ring-[#f5d5c8] disabled:opacity-50"
            >
              {FACT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {saveError ? (
            <div className="rounded-xl border border-[#f3c9c0] bg-[#fdf0ed] p-2.5 text-xs text-[#a5321b]">
              <p>{saveError}</p>
              <button
                type="button"
                onClick={handleSave}
                className="mt-1 font-semibold underline"
              >
                Retry saving
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="rounded-full border border-[#ebe6dd] px-3.5 py-1.5 text-xs font-medium text-[#5c5852] transition hover:bg-[#faf9f6] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !statementDraft.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#d95d39] px-4 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-[#c34e2c] disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-4 transition hover:border-[#ded7cc]">
      {/* Fact Card Top Badges & Edit Action */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {isHumanAdded ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2 py-0.5 text-[10px] font-semibold text-[#1d4ed8]">
              <span aria-hidden="true">★</span>
              <span>Added by Team Lead</span>
            </span>
          ) : isEdited ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#cce5d8] bg-[#edf7f2] px-2 py-0.5 text-[10px] font-medium text-[#1f6a47]">
              <span aria-hidden="true">✓</span>
              <span>Lead Corrected</span>
            </span>
          ) : fact.confirmedByLead ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#cce5d8] bg-[#edf7f2] px-2 py-0.5 text-[10px] font-medium text-[#1f6a47]">
              <span aria-hidden="true">✓</span>
              <span>Confirmed</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#ebe6dd] bg-white px-2 py-0.5 text-[10px] font-medium text-[#5c5852]">
              <span aria-hidden="true">✦</span>
              <span>Extracted from PDF</span>
            </span>
          )}

          {fact.provenance === "assumption" ? (
            <span className="rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-medium text-[#9a3412]">
              Assumption
            </span>
          ) : null}
        </div>

        {isLeadPersona ? (
          <button
            type="button"
            onClick={handleStartEdit}
            className="inline-flex items-center gap-1 rounded-full border border-[#ebe6dd] bg-white px-2.5 py-1 text-xs font-medium text-[#5c5852] transition hover:border-[#f5d5c8] hover:bg-[#fdf1ec] hover:text-[#b44322]"
            aria-label={`Edit fact: ${fact.statement.slice(0, 30)}...`}
          >
            <span aria-hidden="true">✎</span>
            <span>Edit</span>
          </button>
        ) : null}
      </div>

      {/* Fact Statement */}
      <p className="mt-2.5 text-sm leading-relaxed text-[#1f1e1c]">
        {fact.statement}
      </p>

      {/* Preserved Original Source Excerpt (displayed separately when edited) */}
      {isEdited && originalExcerpt ? (
        <div className="mt-3 rounded-xl border border-[#f5d5c8] bg-[#fdf1ec]/60 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[#b44322]">
            <span aria-hidden="true">📑</span>
            <span>Original PDF Evidence (Preserved Source Text):</span>
          </div>
          <p className="mt-1 italic text-[#5c5852]">
            &ldquo;{originalExcerpt}&rdquo;
          </p>
        </div>
      ) : null}

      {/* Provenance Footer */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#5c5852]">
        {isHumanAdded ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f4ff] px-2.5 py-0.5 font-medium text-[#1e40af]">
            <span>Author: {fact.addedByRole ?? "Team Lead"}</span>
            {fact.createdAt && (
              <span>· {formatDateTime(fact.createdAt)}</span>
            )}
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 font-medium text-[#1f1e1c] shadow-2xs">
              <span aria-hidden="true">📄</span>
              <span>{sourceDocName ?? "Uploaded client brief"}</span>
            </span>
            {fact.pageOrSection ? (
              <span className="rounded-full bg-[#f4f1ea] px-2.5 py-0.5 text-[#5c5852]">
                {fact.pageOrSection}
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
