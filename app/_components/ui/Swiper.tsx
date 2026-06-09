"use client";

import type { BannerList as BannerListType } from '@/.storyblok/types/293042638864865/storyblok-components';

import { Swiper as SwiperComponent } from "swiper/react";
import { SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Scrollbar, A11y, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/scrollbar";
import "swiper/css/a11y";
import Link from "next/link";


interface SwiperSlideProps {
    title: string;
    subTitle: string;
    image: string;
    link?: string | null;
}

type SwiperProps = {
    bannerItem?: BannerListType["bannerItem"];
  };

export default function Swiper({ bannerItem }: SwiperProps) {
    console.log(bannerItem);
    return (
        <SwiperComponent
            className="w-full h-[400px]"
            modules={[Navigation, Pagination, Scrollbar, A11y, Autoplay]}
            navigation
            loop={true}
            autoplay={{ delay: 2500, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            scrollbar={{ draggable: true }}
            a11y={{ enabled: true }}
        >
            {bannerItem?.map((child) => (
                <SwiperSlide key={child.title}>
                    <div className="relative w-full h-full">
                        <div className="thumbnail w-full h-full">
                            <div className="w-full h-full bg-orange-500"></div>
                        </div>
                        <div className="content absolute bottom-10 left-10 right-0 z-10">
                            <h1 className="text-4xl font-bold">{child.title}</h1>
                            <p className="text-gray-500">{child.subTitle}</p>
                        </div>
                    </div>
                </SwiperSlide>
            ))}
        </SwiperComponent>
    )
}