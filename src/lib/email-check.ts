import { notion, NOTION_DB_ID } from "./notion";

export async function checkEmailExists(email: string) {
  const existing = await notion.databases.query({
    database_id: NOTION_DB_ID,
    filter: { property: "Email", email: { equals: email } }
  });
  return existing.results.length > 0;
}