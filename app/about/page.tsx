import { BlockRenderer } from "@/app/_components/strapi/BlockRenderer";
export default async function About() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/about?populate[blocks][populate]=*`);
    const { data } = await res.json();
    return (
        <div>
            about page
            <BlockRenderer blocks={data.blocks} />
        </div>
    )
}