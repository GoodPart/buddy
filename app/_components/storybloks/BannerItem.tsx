import type { BannerItem as BannerItemType } from '@/.storyblok/types/293042638864865/storyblok-components';
import { SbBlokData, storyblokEditable } from "@storyblok/react/rsc";

export default function BannerItem({ blok }: { blok: BannerItemType }) {
  return (
    <div {...storyblokEditable(blok as SbBlokData)}>
      <h2>{blok.title}</h2>
      <p>{blok.subTitle}</p>
      {/* img: blok.image?.filename */}
    </div>
  );
}