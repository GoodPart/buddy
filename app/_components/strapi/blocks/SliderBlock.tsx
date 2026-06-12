import SwiperComponent from "../../Swiper";

const STRAPI = process.env.NEXT_PUBLIC_STRAPI_API_URL;

// blocks/SliderBlock.tsx
export function SliderBlock({ files }: { files: { url: string; alternativeText?: string }[] }) {
  return (
    <div className="w-full h-full">
      <SwiperComponent 
        slides={files.map((file) => ({ imageUrl: `${STRAPI}${file.url}`, title: file.alternativeText || "", description: "" }))} 
      />
    </div>
  );
}