import { notFound } from "next/navigation";
import { draftMode } from "next/headers";
import { BlockRenderer } from "@/app/_components/strapi/BlockRenderer";
import { fetchPageBySlug } from "@/lib/strapi/fetch-page";

const RESERVED = ["articles", "api", "signin", "signup", "mypage", "post"];

export default async function CmsPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  if (RESERVED.includes(slug[0])) notFound();

  const path = slug.join("/");
  const page = await fetchPageBySlug(path);
  if (!page) notFound();

  const { isEnabled } = await draftMode();

  return (
    <article>
      {isEnabled && <p>📝 Draft Preview</p>}
      <h1>{page.title}</h1>
      <BlockRenderer blocks={page.blocks} />
    </article>
  );
}