import { NextRequest, NextResponse } from "next/server";
import {
  DocumentMetadataSchema,
  DocumentTypeSchema,
} from "@/contracts/document";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import { extractDocumentFactsWithGemini } from "@/lib/server/gemini";
import {
  getMeetingById,
  saveDocumentMetadata,
  updateMeeting,
  uploadFileToFirebaseStorage,
} from "@/lib/server/store";

const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  try {
    const { meetingId } = await params;
    const meeting = await getMeetingById(meetingId);
    if (!meeting) {
      throw new WopsApiError(
        "NOT_FOUND",
        `Meeting '${meetingId}' was not found`,
        404,
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new WopsApiError(
        "BAD_REQUEST",
        "Expected multipart/form-data request with a 'file' field",
        400,
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    if (!fileEntry || !(fileEntry instanceof File)) {
      throw new WopsApiError(
        "BAD_REQUEST",
        "Missing 'file' binary in multipart/form-data payload",
        400,
        [{ field: "file", message: "A valid file upload is required" }],
      );
    }

    const isPdfMime = fileEntry.type === "application/pdf";
    const isPdfName = fileEntry.name.toLowerCase().endsWith(".pdf");
    if (!isPdfMime && !isPdfName) {
      throw new WopsApiError(
        "VALIDATION_ERROR",
        "Unsupported file format. Only PDF files (.pdf) are supported in MVP.",
        422,
        [{ field: "file", message: "Only application/pdf files are supported" }],
      );
    }

    if (fileEntry.size === 0) {
      throw new WopsApiError(
        "UNPROCESSABLE_ENTITY",
        "Uploaded document file cannot be empty",
        422,
        [{ field: "file", message: "File size must be greater than 0 bytes" }],
      );
    }

    if (fileEntry.size > MAX_PDF_FILE_SIZE_BYTES) {
      throw new WopsApiError(
        "UNPROCESSABLE_ENTITY",
        "Uploaded PDF exceeds the 10 MB maximum file size limit",
        422,
        [{ field: "file", message: "Maximum allowed size is 10,485,760 bytes" }],
      );
    }

    const rawType = formData.get("type");
    const docType =
      typeof rawType === "string" && rawType.trim() !== ""
        ? DocumentTypeSchema.parse(rawType.trim())
        : "brief";

    const docId = `doc_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    const uploadedAt = new Date().toISOString();
    const arrayBuffer = await fileEntry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = fileEntry.type || "application/pdf";

    const storageUri = await uploadFileToFirebaseStorage({
      meetingId,
      documentId: docId,
      fileName: fileEntry.name,
      mimeType,
      buffer,
    });

    const { summary, extractedFacts } = await extractDocumentFactsWithGemini({
      meeting,
      documentId: docId,
      fileName: fileEntry.name,
      mimeType,
      buffer,
    });

    const processedAt = new Date().toISOString();

    const document = await saveDocumentMetadata(
      DocumentMetadataSchema.parse({
        id: docId,
        meetingId,
        name: fileEntry.name,
        mimeType,
        sizeBytes: fileEntry.size,
        type: docType,
        processingStatus: "ready",
        storageUri,
        summary,
        extractedFacts,
        uploadedAt,
        processedAt,
      }),
    );

    const updatedDocIds = Array.from(
      new Set([...meeting.documentIds, document.id]),
    );
    await updateMeeting({
      ...meeting,
      documentIds: updatedDocIds,
      contextVersion: (meeting.contextVersion ?? 1) + 1,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
