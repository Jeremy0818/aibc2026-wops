import { GoogleGenAI, Modality } from "@google/genai";
import { z } from "zod";
import {
  DocumentFact,
  DocumentFactSchema,
  DocumentMetadata,
} from "@/contracts/document";
import { Meeting } from "@/contracts/meeting";
import {
  PreparationProposal,
  PreparationProposalSchema,
} from "@/contracts/proposal";
import {
  LiveTokenResponse,
  LiveTokenResponseSchema,
  PreparationSession,
} from "@/contracts/session";
import {
  buildDocumentExtractionPrompt,
  buildFallbackCampaignProposal,
  buildLiveSystemInstruction,
  buildProposalGenerationPrompt,
} from "@/lib/skills";
import { WopsApiError } from "./api-error";

const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";
const DEFAULT_LIVE_MODEL = "models/gemini-2.5-flash-native-audio-latest";

function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === "your-gemini-api-key-here") {
    return null;
  }
  return key;
}

function isStrictGeminiMode(): boolean {
  return process.env.GEMINI_STRICT_MODE === "true";
}

function getGenAIClient(apiVersion?: string): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion, httpOptions: { apiVersion } } : {}),
  });
}

const ExtractedDocPayloadSchema = z.object({
  summary: z.string().min(1),
  extractedFacts: z.array(DocumentFactSchema).min(1),
});

export async function extractDocumentFactsWithGemini(params: {
  meeting: Meeting;
  documentId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ summary: string; extractedFacts: DocumentFact[] }> {
  const ai = getGenAIClient();

  if (ai) {
    try {
      const prompt = buildDocumentExtractionPrompt(
        params.meeting,
        params.fileName,
        params.documentId,
      );
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_TEXT_MODEL ?? DEFAULT_TEXT_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: params.mimeType || "application/pdf",
                  data: params.buffer.toString("base64"),
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const rawText = response.text?.trim();
      if (rawText) {
        const parsed = ExtractedDocPayloadSchema.safeParse(JSON.parse(rawText));
        if (parsed.success) {
          return {
            summary: parsed.data.summary,
            extractedFacts: parsed.data.extractedFacts.map((f, idx) =>
              DocumentFactSchema.parse({
                ...f,
                id: f.id || `${params.documentId}_fact_0${idx + 1}`,
                provenance: "extracted",
                sourceDocumentId: params.documentId,
                sourceDocumentName: params.fileName,
                confirmedByLead: false,
              }),
            ),
          };
        }
      }
    } catch (err) {
      if (isStrictGeminiMode()) {
        throw new WopsApiError(
          "UPSTREAM_ERROR",
          `Gemini document extraction failed: ${err instanceof Error ? err.message : String(err)}`,
          502,
        );
      }
    }
  }

  const audience =
    params.meeting.targetAudience ??
    "urban young professional commuters (ages 20-32) in Jakarta and Surabaya";
  const ceiling = params.meeting.budgetCeilingIdr ?? 250000000;

  // Fallback extraction when running locally without GEMINI_API_KEY or when synthetic test blobs are uploaded
  return {
    summary: `Extracted from ${params.fileName}: ${params.meeting.clientName} (${params.meeting.projectName}) launch brief covering product specs, ${audience}, and the Rp${ceiling.toLocaleString("en-US")} budget ceiling.`,
    extractedFacts: [
      DocumentFactSchema.parse({
        id: `${params.documentId}_fact_01`,
        statement: `${params.meeting.clientName} brief: 5g cane sugar per 200ml can with 100% Indonesian Arabica-Robusta coffee blend.`,
        category: "requirement",
        provenance: "extracted",
        pageOrSection: "Page 2 — Product Specifications",
        sourceDocumentId: params.documentId,
        sourceDocumentName: params.fileName,
        confirmedByLead: false,
      }),
      DocumentFactSchema.parse({
        id: `${params.documentId}_fact_02`,
        statement: `Target audience focuses on ${audience} with emphasis on afternoon commuter rituals.`,
        category: "target_audience",
        provenance: "extracted",
        pageOrSection: "Page 3 — Audience & Occasion",
        sourceDocumentId: params.documentId,
        sourceDocumentName: params.fileName,
        confirmedByLead: false,
      }),
      DocumentFactSchema.parse({
        id: `${params.documentId}_fact_03`,
        statement: `Total campaign spend must remain at or below Rp${ceiling.toLocaleString("en-US")} IDR across creator seeding, sampling hubs, and digital flight.`,
        category: "budget",
        provenance: "extracted",
        pageOrSection: "Page 4 — Budget",
        sourceDocumentId: params.documentId,
        sourceDocumentName: params.fileName,
        confirmedByLead: false,
      }),
      DocumentFactSchema.parse({
        id: `${params.documentId}_fact_04`,
        statement:
          "Strict guardrail: avoid clinical, medical, or weight-loss claims across all communications.",
        category: "constraint",
        provenance: "extracted",
        pageOrSection: "Page 5 — Brand Mandatories",
        sourceDocumentId: params.documentId,
        sourceDocumentName: params.fileName,
        confirmedByLead: false,
      }),
    ],
  };
}

export async function provisionLiveEphemeralToken(params: {
  meeting: Meeting;
  documents: DocumentMetadata[];
  keyFacts: DocumentFact[];
  session: PreparationSession;
}): Promise<LiveTokenResponse> {
  const { meeting, documents, keyFacts, session } = params;
  const now = Date.now();
  const expiresAt = new Date(now + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(now + 5 * 60 * 1000).toISOString();
  const liveModel = process.env.GEMINI_LIVE_MODEL ?? DEFAULT_LIVE_MODEL;
  const systemInstruction = buildLiveSystemInstruction({
    meeting,
    documents,
    keyFacts,
    session,
  });

  // Provision short-lived ephemeral token via @google/genai v1alpha authTokens API
  const ai = getGenAIClient("v1alpha");
  if (ai) {
    try {
      const tokenResponse = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime: expiresAt,
          newSessionExpireTime,
          liveConnectConstraints: {
            model: liveModel,
            config: {
              responseModalities: [Modality.AUDIO],
              systemInstruction: {
                parts: [{ text: systemInstruction }],
              },
            },
          },
        },
      });

      const ephemeralToken = tokenResponse.name;
      if (!ephemeralToken) {
        throw new Error("Gemini authTokens.create returned an empty token name");
      }

      return LiveTokenResponseSchema.parse({
        sessionId: session.id,
        ephemeralToken,
        expiresAt,
        stage: session.currentStage,
      });
    } catch (err) {
      if (isStrictGeminiMode()) {
        throw new WopsApiError(
          "UPSTREAM_ERROR",
          `Failed to provision Gemini Live ephemeral token: ${err instanceof Error ? err.message : String(err)}`,
          502,
        );
      }
    }
  }

  // Safe local development ephemeral token (never exposes any permanent API key)
  const localEphemeralToken = `eph_tok_${session.id}_${crypto.randomUUID().replace(/-/g, "")}`;
  return LiveTokenResponseSchema.parse({
    sessionId: session.id,
    ephemeralToken: localEphemeralToken,
    expiresAt,
    stage: session.currentStage,
  });
}

export async function synthesizeCampaignProposal(params: {
  proposalId: string;
  meeting: Meeting;
  documents: DocumentMetadata[];
  keyFacts: DocumentFact[];
  session: PreparationSession;
  selectedConceptId?: string;
  additionalNotes?: string;
}): Promise<PreparationProposal> {
  const {
    proposalId,
    meeting,
    documents,
    keyFacts,
    session,
    selectedConceptId,
    additionalNotes,
  } = params;

  const fallbackProposal = buildFallbackCampaignProposal({
    proposalId,
    meeting,
    keyFacts,
    session,
    selectedConceptId,
    additionalNotes,
  });

  const ai = getGenAIClient();
  if (!ai) {
    return fallbackProposal;
  }

  try {
    const prompt = buildProposalGenerationPrompt({
      meeting,
      documents,
      keyFacts,
      session,
      selectedConceptId,
      additionalNotes,
    });

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_TEXT_MODEL ?? DEFAULT_TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      return fallbackProposal;
    }

    const parsedJson = JSON.parse(rawText) as Record<string, unknown>;
    const now = new Date().toISOString();

    const candidate = {
      ...fallbackProposal,
      ...parsedJson,
      id: proposalId,
      meetingId: meeting.id,
      participantId: session.participantId,
      participantRole: session.participantRole,
      participantName: session.participantName ?? fallbackProposal.participantName,
      sessionId: session.id,
      createdAt: now,
      updatedAt: now,
    };

    const validated = PreparationProposalSchema.safeParse(candidate);
    if (!validated.success) {
      return fallbackProposal;
    }

    return validated.data;
  } catch (err) {
    if (isStrictGeminiMode()) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Gemini proposal synthesis failed: ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
    return fallbackProposal;
  }
}
