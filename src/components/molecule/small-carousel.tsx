import { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay, Navigation } from 'swiper/modules';
import 'swiper/swiper.css';

export function SmallCarousel(data: any) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  const slides = data.data.flatMap((a: any) => a.carousel);
  const prevRef = useRef<any>(null);
  const nextRef = useRef<any>(null);

  return (
    <div style={{ width: '100%', padding: '20px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <button
          ref={prevRef}
          aria-label="Anterior"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '2rem', padding: '0 12px' }}
          onClick={() => swiperInstance?.slidePrev()}
        >
          ‹
        </button>

        <Swiper
          style={{ width: '60%', minWidth: '0', marginLeft: '0', marginRight: '0' }}
          modules={[Pagination, Autoplay, Navigation]}
          navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
          spaceBetween={5}
          slidesPerView={2}
          slidesPerGroup={2}
          breakpoints={{
            640: { slidesPerView: 4, slidesPerGroup: 4, spaceBetween: 10 },
            768: { slidesPerView: 6, slidesPerGroup: 6, spaceBetween: 10 },
            1024: { slidesPerView: 8, slidesPerGroup: 8, spaceBetween: 10 },
          }}
          loop
          autoHeight={false}
          autoplay={{ delay: 10000, disableOnInteraction: true }}
          onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
          onSwiper={(swiper) => setSwiperInstance(swiper)}
          initialSlide={activeIndex}
        >
          {slides.map((carouselObj: any, idx: number) => (
            <SwiperSlide key={carouselObj.id || idx}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                <img
                  src={carouselObj.image.url}
                  alt=""
                  width={carouselObj.image.width}
                  height={carouselObj.image.height}
                  style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        <button
          ref={nextRef}
          aria-label="Próximo"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '2rem', padding: '0 12px' }}
          onClick={() => swiperInstance?.slideNext()}
        >
          ›
        </button>
      </div>
    </div>
  );
}
