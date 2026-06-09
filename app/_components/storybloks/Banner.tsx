import type { BannerList as BannerListType } from '@/.storyblok/types/293042638864865/storyblok-components';

import { SbBlokData, storyblokEditable } from "@storyblok/react/rsc";
import Swiper from "../ui/Swiper";
export default function Banner({ blok }: { blok: BannerListType }) {
    return (
      <div className="banner" {...storyblokEditable(blok as SbBlokData)}>
        <Swiper bannerItem={blok.bannerItem} />
      </div>
    );
  }