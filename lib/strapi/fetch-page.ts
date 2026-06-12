import { draftMode } from "next/headers";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;

export async function fetchPageBySlug(slug: string) {
  const { isEnabled } = await draftMode();
  const status = isEnabled ? "draft" : "published";

  const res = await fetch(
    `${STRAPI_URL}/api/pages?filters[slug][$eq]=${slug}&populate[blocks][populate]=*&status=${status}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;
  const { data } = await res.json();
  return data?.[0] ?? null;
}