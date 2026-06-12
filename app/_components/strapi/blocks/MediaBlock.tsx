// blocks/MediaBlock.tsx
const STRAPI = process.env.NEXT_PUBLIC_STRAPI_API_URL;

export function MediaBlock({ file }: { file?: { url: string; alternativeText?: string } }) {
  if (!file?.url) return null;

  return (
    <img
      src={`${process.env.NEXT_PUBLIC_STRAPI_API_URL}${file.url}`}
      alt={file.alternativeText || ""}
      className="max-w-full"
    />
  );
}