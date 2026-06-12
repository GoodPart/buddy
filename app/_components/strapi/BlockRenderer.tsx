import { RichTextBlock } from "./blocks/RichTextBlock";
import { QuoteBlock } from "./blocks/QuoteBlock";
import { MediaBlock } from "./blocks/MediaBlock";
import { SliderBlock } from "./blocks/SliderBlock";

const blockMap: Record<string, React.ComponentType<any>> = {
  "shared.rich-text": RichTextBlock,
  "shared.quote": QuoteBlock,
  "shared.media": MediaBlock,
  "shared.slider": SliderBlock,
};

export function BlockRenderer({ blocks }: { blocks: any[] }) {
  if (!blocks?.length) return null;

  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block, i) => {
        const Component = blockMap[block.__component];
        if (!Component) return null;
        return <Component key={block.id ?? i} {...block} />;
      })}
    </div>
  );
}