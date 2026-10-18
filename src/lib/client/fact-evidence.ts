import type { DocumentFact } from "@/contracts/document";

const ORIGINAL_EVIDENCE_STORAGE_KEY = "wops:fact_original_evidence_v1";

export interface FactOriginalEvidence {
  factId: string;
  originalStatement: string;
  sourceDocumentName?: string;
  pageOrSection?: string;
  recordedAt: string;
}

function getStoredEvidenceMap(): Record<string, FactOriginalEvidence> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(ORIGINAL_EVIDENCE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, FactOriginalEvidence>;
  } catch {
    return {};
  }
}

function saveStoredEvidenceMap(
  map: Record<string, FactOriginalEvidence>
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ORIGINAL_EVIDENCE_STORAGE_KEY,
      JSON.stringify(map)
    );
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Records the original extracted statement for a fact if not already tracked.
 * Guarantees the original PDF source excerpt is never overwritten by subsequent lead corrections.
 */
export function recordOriginalFactEvidence(fact: DocumentFact): void {
  if (typeof window === "undefined" || !fact.id) return;
  const currentMap = getStoredEvidenceMap();
  if (!currentMap[fact.id]) {
    currentMap[fact.id] = {
      factId: fact.id,
      originalStatement: fact.statement,
      sourceDocumentName: fact.sourceDocumentName,
      pageOrSection: fact.pageOrSection,
      recordedAt: new Date().toISOString(),
    };
    saveStoredEvidenceMap(currentMap);
  }
}

/**
 * Bulk records original evidence for an array of extracted facts.
 */
export function recordOriginalFactsEvidence(facts: DocumentFact[]): void {
  if (typeof window === "undefined") return;
  const currentMap = getStoredEvidenceMap();
  let changed = false;
  for (const fact of facts) {
    if (fact.id && !currentMap[fact.id]) {
      currentMap[fact.id] = {
        factId: fact.id,
        originalStatement: fact.statement,
        sourceDocumentName: fact.sourceDocumentName,
        pageOrSection: fact.pageOrSection,
        recordedAt: new Date().toISOString(),
      };
      changed = true;
    }
  }
  if (changed) {
    saveStoredEvidenceMap(currentMap);
  }
}

/**
 * Retrieves the untouched original source statement extracted from the PDF.
 */
export function getOriginalFactStatement(fact: DocumentFact): string {
  if (typeof window === "undefined") {
    return fact.statement;
  }
  const currentMap = getStoredEvidenceMap();
  const evidence = currentMap[fact.id];
  return evidence?.originalStatement ?? fact.statement;
}

/**
 * Determines whether a fact has received a Team Lead correction.
 */
export function isFactCorrectedByLead(fact: DocumentFact): boolean {
  const original = getOriginalFactStatement(fact);
  return (
    Boolean(fact.confirmedByLead) &&
    fact.statement.trim() !== original.trim()
  );
}
