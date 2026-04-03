import React from 'react';
import { Link } from 'react-router-dom';
import { Title, Subtitle, Text } from '@/components/atoms/typography';
import { Card } from './card';
import { Forms } from './forms';
import { getCommonImageStyles, getFormBorderClass, getFormStyles } from './carousel-helpers';

interface CarouselSlideContentProps {
  carouselObj: any;
  idx: number;
  imageDivStyle: string;
}

export const CarouselSlideContent: React.FC<CarouselSlideContentProps> = ({ carouselObj, idx, imageDivStyle }) => {
  const hasMobileImg = !!(carouselObj?.mobileImage?.url);
  const commonImageStyles = getCommonImageStyles(carouselObj);
  const baseImageClass = carouselObj?.layout === 'cardImage' ? 'hero-image-carousel' : '';
  const cardBorderTripleClass = carouselObj?.card?.border?.visual === 'border-triple' ? 'pl-4' : '';
  const formBorderClass = getFormBorderClass(carouselObj?.form?.borderForm?.visual);

  const renderCardImageContent = carouselObj?.card !== null && carouselObj?.layout === 'cardImage';
  const renderImageSlideContent = carouselObj?.layout === 'imageSlide';

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%' }}
      className={carouselObj?.layout === 'cardImage' ? 'carousel-card-layout' : ''}
    >
      {carouselObj?.slideLink && (
        <Link
          to={carouselObj?.slideLink}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, cursor: 'pointer' }}
          aria-label="Ir para a página do slide"
        />
      )}

      <div className={imageDivStyle}>
        <img
          src={carouselObj.image.url}
          alt="..."
          className={`${baseImageClass} ${hasMobileImg ? 'hide-on-mobile' : ''}`}
          width={carouselObj.image.width}
          height={carouselObj.image.height}
          style={commonImageStyles}
          loading={idx === 0 ? 'eager' : 'lazy'}
        />
        {hasMobileImg && (
          <img
            src={carouselObj.mobileImage.url}
            alt="..."
            className={`${baseImageClass} show-only-on-mobile`}
            width={carouselObj.mobileImage.width || carouselObj.image.width}
            height={carouselObj.mobileImage.height || carouselObj.image.height}
            style={commonImageStyles}
          />
        )}
      </div>

      {renderCardImageContent && (
        <div className={`card-container flex-col ${carouselObj.card.textAlign} ${cardBorderTripleClass}`}>
          <div />
          <div className="text-content-mobile" style={{ height: 'auto', width: '100%', padding: '1%' }}>
            <Title data={carouselObj.card} />
            <Subtitle data={carouselObj.card} />
            <Text data={carouselObj.card} />
          </div>
        </div>
      )}

      {renderImageSlideContent && (
        <div
          className="card-mobile-center"
          style={{
            position: 'absolute', top: 0, right: 0, height: '100%', width: '40%',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            alignItems: 'center', zIndex: 20, paddingRight: '5%', pointerEvents: 'auto',
          }}
        >
          <div style={{ width: '100%', padding: '20px' }}>
            {carouselObj.card && <Card data={{ cards: [carouselObj.card] }} />}
            {carouselObj.form && (
              <div className={`opacity-light padding-form ${formBorderClass}`} style={getFormStyles(carouselObj.form)}>
                <Title data={carouselObj.form} color={carouselObj.form.textColor} />
                <Subtitle data={carouselObj.form} color={carouselObj.form.textColor} />
                <Text data={carouselObj.form} />
                <Forms
                  key={carouselObj.form.id}
                  class={carouselObj.form.visualVariation}
                  btn={carouselObj.form.button}
                  color={carouselObj.form.textColor}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
