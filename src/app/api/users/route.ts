import { connection, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/api-response";
import { listRegisteredUsers } from "@/lib/server/user-profile";

/**
 * GET /api/users
 * Returns registered user profiles for participant selection in Live Mode.
 */
export async function GET(request: Request): Promise<NextResponse> {
  await connection();
  try {
    await authenticateRequest(request);
    const users = await listRegisteredUsers(50);
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Failed to list users");
  }
}
