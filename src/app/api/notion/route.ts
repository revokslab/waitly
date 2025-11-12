import { NextResponse } from "next/server";
import { notion, NOTION_DB_ID } from "~/lib/notion";
import { generateCode } from "~/lib/utils";

export async function POST(request: Request) {
  try {
    const { email, firstname, referredBy } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const existing = await notion.databases.query({
      database_id: NOTION_DB_ID,
      filter: {
        property: "Email",
        email: { equals: email },
      },
    });

    if (existing.results.length > 0) {
      return NextResponse.json(
        { error: "You're already on the waitlist!" },
        { status: 409 }
      );
    }

    // Generate unique referral code
    const code = generateCode();

    // Find referrer by matching Referred By → Referral Code
    let referrerPageId: string | null = null;
    if (referredBy) {
      const results = await notion.databases.query({
        database_id: NOTION_DB_ID,
        filter: {
          property: "Referral Code",
          rich_text: { equals: referredBy },
        },
      });

      if (results.results.length > 0) {
        referrerPageId = results.results[0].id;
      }
    }

    // Create new entry
    const page = await notion.pages.create({
      parent: { database_id: NOTION_DB_ID },
      properties: {
        Name: {
          title: [{ text: { content: firstname || email.split("@")[0] } }],
        },
        Email: { email },
        "Referral Code": {
          rich_text: [{ text: { content: code } }],
        },
        "Referred By": referredBy
          ? { rich_text: [{ text: { content: referredBy } }] }
          : { rich_text: [] },
        // Link referrer via Relation
        Referrer: referrerPageId
          ? { relation: [{ id: referrerPageId }] }
          : { relation: [] },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Added to waitlist",
        code, // ← Used in form to generate share link
        notionId: page.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Notion API error:", error.message);
    return NextResponse.json(
      {
        error: "Failed to save to Notion",
        details: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}