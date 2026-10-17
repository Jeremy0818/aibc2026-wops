import type { DocumentFact, DocumentMetadata } from "@/contracts/document";

const CATEGORY_LABELS: Record<string, string> = {
  client_objective: "Client Objective",
  requirement: "Requirement",
  target_audience: "Target Audience",
  budget: "Budget Ceiling",
  constraint: "Constraint",
  deliverable: "Deliverable",
  timeline: "Timeline",
  other: "Brief Context",
};

export function GroundedBriefPreview({
  documents,
  synthesizedBrief,
  keyFacts,
}: {
  documents: DocumentMetadata[];
  synthesizedBrief?: string;
  keyFacts: DocumentFact[];
}) {
  const readyDocuments = documents.filter(
    (doc) => doc.processingStatus === "ready"
  );

  // Only show grounded preview once at least one document is ready
  if (readyDocuments.length === 0) {
    return null;
  }

  // Map fact IDs to their source document name when possible
  const factSourceDocMap = new Map<string, string>();
  for (const doc of readyDocuments) {
    for (const fact of doc.extractedFacts) {
      factSourceDocMap.set(fact.id, doc.name);
    }
  }

  const displayFacts =
    keyFacts.length > 0
      ? keyFacts
      : readyDocuments.flatMap((doc) => doc.extractedFacts);

  return (
    <section
      aria-labelledby="grounded-brief-preview-heading"
      className="wops-warm-card rounded-3xl p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-2.5 py-0.5 text-[11px] font-medium text-[#b44322]">
            <span aria-hidden="true">✦</span>
            <span>Grounded in client documents</span>
          </span>
          <h2
            id="grounded-brief-preview-heading"
            className="mt-2 text-base font-semibold text-[#1f1e1c] sm:text-lg"
          >
            What WOPS! learned from your brief
          </h2>
        </div>

        <span className="text-xs text-[#8a847c]">
          {readyDocuments.length} ready{" "}
          {readyDocuments.length === 1 ? "document" : "documents"}
        </span>
      </div>

      {/* Synthesized Brief Summary */}
      {synthesizedBrief ? (
        <div className="mt-4 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-4">
          <p className="text-xs font-medium text-[#8a847c]">
            Synthesized brief overview
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[#1f1e1c]">
            {synthesizedBrief}
          </p>
        </div>
      ) : null}

      {/* Extracted Source-Backed Facts */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-[#5c5852]">
            Source-backed facts from your documents
          </h3>
          <span className="text-xs text-[#8a847c]">
            {displayFacts.length}{" "}
            {displayFacts.length === 1 ? "fact" : "facts"}
          </span>
        </div>

        {displayFacts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dcd4c6] bg-[#faf9f6] p-4 text-xs leading-relaxed text-[#5c5852]">
            <p className="font-medium text-[#1f1e1c]">
              No structured facts were extracted from this document
            </p>
            <p className="mt-1">
              WOPS! never invents document facts. During preparation sessions,
              the AI thinking partner will ask your employee to confirm any open
              details.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {displayFacts.map((fact) => {
              const sourceDocName =
                fact.sourceDocumentName ?? factSourceDocMap.get(fact.id);
              const categoryLabel =
                CATEGORY_LABELS[fact.category] ?? "Brief Fact";

              return (
                <li
                  key={fact.id}
                  className="rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#ebe6dd] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1f1e1c]">
                      {categoryLabel}
                    </span>
                    {fact.provenance === "confirmed" ? (
                      <span className="rounded-full border border-[#cce5d8] bg-[#edf7f2] px-2 py-0.5 text-[10px] font-medium text-[#1f6a47]">
                        Confirmed
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-[#1f1e1c]">
                    {fact.statement}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-[#5c5852]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 font-medium text-[#1f1e1c]">
                      <span aria-hidden="true">📄</span>
                      <span>{sourceDocName ?? "Uploaded client brief"}</span>
                    </span>
                    {fact.pageOrSection ? (
                      <span className="rounded-full bg-[#f4f1ea] px-2.5 py-0.5 text-[#5c5852]">
                        {fact.pageOrSection}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Clear Distinction Between Document Facts and Open Human Decisions */}
      <div className="mt-5 rounded-2xl border border-[#ebe6dd] bg-[#f4f1ea]/60 p-4">
        <p className="text-xs font-medium text-[#1f1e1c]">
          Role-specific exploration happens in individual AI sessions
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#5c5852]">
          These grounded facts are shared across all participants. Individual
          creative trade-offs, channel mixes, and design territories are
          explored separately during each employee&apos;s 1-on-1 voice session.
        </p>
      </div>
    </section>
  );
}
