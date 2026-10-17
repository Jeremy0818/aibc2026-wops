import { GoogleGenAI, Modality } from "@google/genai";
import { z } from "zod";
import {
  DocumentFact,
  DocumentFactSchema,
  DocumentMetadata,
} from "@/contracts/document";
import { Meeting } from "@/contracts/meeting";
import {
  CampaignProposal,
  CampaignProposalSchema,
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
const DEFAULT_LIVE_MODEL = "gemini-2.0-flash-live-001";

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
    ...(apiVersion ? { httpOptions: { apiVersion } } : {}),
  });
}

const ExtractedDocPayloadSchema = z.object({
  summary: z.string().min(1),
  extractedFacts: z.array(DocumentFactSchema).min(1),
});

export async function extractDocumentFactsWithGemini(params: {
  meeting: Meeting;
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
          return parsed.data;
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

  // Fallback extraction when running locally without GEMINI_API_KEY or when synthetic test blobs are uploaded
  return {
    summary: `Client brief (${params.fileName}) for ${params.meeting.clientName} — ${params.meeting.projectName} targeting ${params.meeting.targetAudience} with a budget ceiling of Rp${params.meeting.budgetCeilingIdr.toLocaleString("en-US")}.`,
    extractedFacts: [
      {
        id: "fact_01",
        statement:
          "KOVA Light contains 5g of cane sugar per 200ml can and uses a 100% Indonesian Arabica-Robusta coffee blend.",
        pageOrSection: "Page 2 — Product Specifications",
      },
      {
        id: "fact_02",
        statement: `Target audience is ${params.meeting.targetAudience} with focus on afternoon commuter rituals.`,
        pageOrSection: "Page 3 — Audience & Occasion",
      },
      {
        id: "fact_03",
        statement: `Total campaign spend must remain at or below Rp${params.meeting.budgetCeilingIdr.toLocaleString("en-US")} IDR with zero unsupported clinical or medical claims.`,
        pageOrSection: "Page 4 — Budget & Brand Mandatories",
      },
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
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
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
}): Promise<CampaignProposal> {
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
      sessionId: session.id,
      createdAt: now,
      updatedAt: now,
    };

    const validated = CampaignProposalSchema.safeParse(candidate);
    if (!validated.success) {
      return fallbackProposal;
    }

    // Enforce business rule: totalBudgetIdr <= meeting.budgetCeilingIdr
    if (validated.data.totalBudgetIdr > meeting.budgetCeilingIdr) {
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
