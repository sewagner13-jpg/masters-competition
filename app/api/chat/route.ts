import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createChatMessageSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(40, "Name must be 40 characters or fewer")
    .transform((value) => value.replace(/\s+/g, " ")),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(180, "Message must be 180 characters or fewer")
    .transform((value) => value.replace(/\s+/g, " ")),
});

const MESSAGE_LIMIT = 40;
const DUPLICATE_WINDOW_MS = 15_000;

async function ensureChatTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ChatMessage" (
      "id" TEXT PRIMARY KEY,
      "displayName" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx"
    ON "ChatMessage" ("createdAt")
  `);
}

export async function GET() {
  try {
    await ensureChatTable();

    const messages = await prisma.chatMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: MESSAGE_LIMIT,
    });

    return NextResponse.json({
      messages: messages.reverse(),
    });
  } catch (err) {
    console.error("[api/chat] GET error:", err);
    return NextResponse.json({ error: "Failed to load chat." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureChatTable();

    const body = await req.json();
    const parsed = createChatMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid chat message." },
        { status: 400 }
      );
    }

    const { displayName, message } = parsed.data;
    const recentMessage = await prisma.chatMessage.findFirst({
      where: { displayName },
      orderBy: { createdAt: "desc" },
      select: { message: true, createdAt: true },
    });

    if (
      recentMessage &&
      recentMessage.message === message &&
      Date.now() - recentMessage.createdAt.getTime() < DUPLICATE_WINDOW_MS
    ) {
      return NextResponse.json(
        { error: "Slow down a bit before sending the same message again." },
        { status: 429 }
      );
    }

    const created = await prisma.chatMessage.create({
      data: { displayName, message },
    });

    return NextResponse.json({ message: created }, { status: 201 });
  } catch (err) {
    console.error("[api/chat] POST error:", err);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
