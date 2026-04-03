import { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay, Navigation } from 'swiper/modules';
import 'swiper/swiper.css';
import { CarouselSlideContent } from './CarouselSlideContent';

export function Carousel(data: any) {
  const sectionBackground = data.background;
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef<any>(null);
  const slides = data.data.flatMap((a: any) => a.carousel);
  const slideBackgroundColor = slides?.[0]?.card?.backgroundColor?.hex || '#ffffff';
  const slideBorder = slides?.[0]?.layout === 'cardImage' ? 'border-default' : '';

  let outerDivStyle = '';
  let innerDivStyle = '';
  let imageDivStyle = '';

  switch (slides?.[0]?.layout) {
    case 'imageSlide':
      outerDivStyle = 'carousel-image-slide-outer';
      innerDivStyle = 'carousel-image-slide-inner';
      break;
    case 'cardImage':
    default:
      outerDivStyle = 'carousel-card-image-slide-outer';
      innerDivStyle = 'carousel-card-image-slide-inner';
      imageDivStyle = 'carousel-card-image-slide-image';
      break;
  }

  return (
    <div
      className={outerDivStyle}
      style={{
        backgroundColor: sectionBackground?.hex,
        backgroundImage: sectionBackground?.url ? `url(${sectionBackground.url})` : undefined,
      }}
    >
      <div
        style={{ position: 'relative', backgroundColor: slideBackgroundColor, maxWidth: '100vw', overflow: 'hidden' }}
        className={`${innerDivStyle} ${slideBorder}`}
      >
        <Swiper
          modules={[Pagination, Autoplay, Navigation]}
          navigation={{ nextEl: '.custom-swiper-next', prevEl: '.custom-swiper-prev' }}
          spaceBetween={100}
          slidesPerView={1}
          slidesPerGroup={1}
          loop
          autoHeight={false}
          autoplay={{ delay: 10000, disableOnInteraction: true }}
          onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          style={{ width: '100%', height: '100%' }}
        >
          {slides.map((carouselObj: any, idx: number) => (
            <SwiperSlide key={carouselObj.id || idx}>
              <CarouselSlideContent carouselObj={carouselObj} idx={idx} imageDivStyle={imageDivStyle} />
            </SwiperSlide>
          ))}
        </Swiper>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, marginRight: 20, position: 'absolute', bottom: '20px', left: '0', width: '100%', zIndex: 50 }}>
          {slides.map((slide: any, idx: number) => (
            <button
              key={slide.id || idx}
              onClick={() => swiperRef.current?.slideToLoop(idx)}
              style={{
                width: 20, height: 20, borderRadius: '50%', margin: '0 5px',
                background: idx === activeIndex ? '#FFFFFF' : '#ffffff66',
                border: 'none', cursor: 'pointer', pointerEvents: 'auto',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
