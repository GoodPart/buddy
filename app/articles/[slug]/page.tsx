import { draftMode } from "next/headers";
import { BlockRenderer } from "@/app/_components/strapi/BlockRenderer";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { isEnabled } = await draftMode();
  const status = isEnabled ? "draft" : "published";
  const {slug} = await params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/articles?filters[slug][$eq]=${slug}&populate[cover]=true&populate[blocks][populate]=*&status=${status}`,
    { cache: "no-store" }
  );
  const { data } = await res.json();
  const article = data[0];

  return (
    <div>
      <p>{isEnabled ? "📝 Draft Preview" : "✅ Published"}</p>
      <img
        src={`${process.env.NEXT_PUBLIC_STRAPI_API_URL}${article.cover.url}`}
        alt={article.cover.alternativeText || article.title}
        width={300}
        />
        <h1>{article.title}</h1>
        <p>{article.description}</p>

        <BlockRenderer blocks={article.blocks} />
    </div>
  );
}