"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Scrollbar, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/scrollbar";

interface SwiperSlideProps {
    imageUrl: string;
    title: string;
    description: string;
}

export default function SwiperComponent({ slides }: { slides: SwiperSlideProps[] }) {
    return (
        <Swiper 
            modules={[Navigation, Pagination, Scrollbar, Autoplay]}
            autoplay={{ delay: 2500, disableOnInteraction: false }}
            spaceBetween={30}
            slidesPerView={3}
        >
            {slides.map((slide) => (
                <SwiperSlide key={slide.title}>
                    <img src={slide.imageUrl} alt={slide.title} />
                    <h3>{slide.title}</h3>
                    <p>{slide.description}</p>
                </SwiperSlide>
            ))}
        </Swiper>
    )
}