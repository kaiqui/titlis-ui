import { CardSection } from './sections/cardSection';
import { ImageLeft } from './sections/imageLeft';
import { ImageRight } from './sections/imageRight';
import { ImageOverlay } from './sections/imageOverlay';
import React from 'react';
import { SidebySide } from './sections/imageSidebySide';
import { Carousel } from './molecule/carousel';
import { AccordionSection } from './sections/accordionSection';
import { FormSection } from './sections/formSection';
import { SmallCarousel } from './molecule/small-carousel';
import { TabsSection } from './sections/tabsSection';
import { PaletteSection } from './sections/paletteSection';
import { AlertBarSection } from './sections/alertBarSection';

export function DynamicSections({ section = [], layout = {} }: Readonly<{ section: any[]; layout: any }>) {
  const result: React.ReactElement[] = [];
  const buffers = collectBuffers(section, result);

  const sectionKey = `section-${layout?.visualVariation}`;
  const layoutString = layout?.visualVariation;
  const background = resolveBackground(layout);
  const mobileBackground = resolveMobileBackground(layout);

  renderByLayout({ layoutString, sectionKey, result, buffers, background, mobileBackground, section });

  return <>{result}</>;
}

function collectBuffers(section: any[], result: React.ReactElement[]) {
  let buffer: any[] = [];
  let btnBuffer: any[] = [];
  let imgBuffer: any[] = [];
  let formBuffer: any[] = [];
  let formFirebaseBuffer: any[] = [];
  let textBuffer: any[] = [];
  let accordion: any[] = [];
  let carouselBuffer: any[] = [];
  let tabsBuffer: any[] = [];
  let paletteBuffer: any[] = [];

  section.forEach((data, i) => {
    switch (data.__typename) {
      case 'CardRecord': buffer.push(data); break;
      case 'ButtonRecord': btnBuffer.push(data); break;
      case 'ImageRecord': imgBuffer.push(data); break;
      case 'FormRecord': formBuffer.push(data); break;
      case 'TitleSectionRecord': textBuffer.push(data); break;
      case 'FormFirebaseRecord': formFirebaseBuffer.push(data); break;
      case 'AccordionRecord':
        accordion.push(data);
        if (accordion.length > 0) {
          result.push(<AccordionSection key={data.id || i} data={accordion} text={textBuffer} />);
          accordion = [];
          textBuffer = [];
        }
        break;
      case 'CarouselRecord': carouselBuffer.push(data); break;
      case 'TabRecord': tabsBuffer.push(data); break;
      case 'ColorPaletteRecord': paletteBuffer.push(data); break;
      default: break;
    }
  });

  return { buffer, btnBuffer, imgBuffer, formBuffer, formFirebaseBuffer, textBuffer, carouselBuffer, tabsBuffer, paletteBuffer };
}

function resolveBackground(layout: any) {
  return (layout.backgroundWImg && layout?.backgroundImage) ? layout.backgroundImage : layout?.backgroundSection;
}

function resolveMobileBackground(layout: any) {
  return (layout?.mobileImage && layout.backgroundWImg) ? layout.mobileImage : null;
}

function renderByLayout({ layoutString, sectionKey, result, buffers, background, mobileBackground, section }: any) {
  const { buffer, btnBuffer, imgBuffer, formBuffer, formFirebaseBuffer, textBuffer, carouselBuffer, tabsBuffer, paletteBuffer } = buffers;

  switch (layoutString) {
    case 'CardVertical':
    case 'CardHorizontal':
    case 'CardSimple':
    case 'CardSimpleImg':
      result.push(<CardSection key={sectionKey} cards={buffer} background={background} btn={btnBuffer} layout={layoutString} text={textBuffer} img={imgBuffer} />);
      break;
    case 'ImageLeft':
    case 'imageLeft':
      result.push(<ImageLeft key={sectionKey} cards={buffer} background={background} btn={btnBuffer} img={imgBuffer} text={textBuffer} layout={layoutString} />);
      break;
    case 'ImageRight':
      result.push(<ImageRight key={sectionKey} cards={buffer} background={background} btn={btnBuffer} img={imgBuffer} text={textBuffer} layout={layoutString} />);
      break;
    case 'ImageOverlay':
      result.push(<ImageOverlay key={sectionKey} cards={buffer} background={background} btn={btnBuffer} img={imgBuffer} form={formBuffer} layout={layoutString} backgroundMobile={mobileBackground} />);
      break;
    case 'ImageSide':
      result.push(<SidebySide key={sectionKey} background={background} btn={btnBuffer} img={imgBuffer} />);
      break;
    case 'FormSection':
      result.push(<FormSection key={sectionKey} background={background} form={formBuffer} img={imgBuffer} formFire={formFirebaseBuffer} />);
      break;
    case 'CarouselSection': {
      const isSmall = Boolean(section?.[0]?.carousel?.[0]?.layout === 'smallImagesCarousel');
      result.push(isSmall
        ? <SmallCarousel key={sectionKey} background={background} data={carouselBuffer} />
        : <Carousel key={sectionKey} background={background} data={carouselBuffer} />);
      break;
    }
    case 'leftSideTabs':
      result.push(<TabsSection key={sectionKey} background={background} data={tabsBuffer} text={textBuffer} />);
      break;
    case 'paletteCard':
      result.push(<PaletteSection key={sectionKey} background={background} data={paletteBuffer} text={textBuffer} />);
      break;
    case 'AlertBarSection':
      result.push(<AlertBarSection key={sectionKey} background={background} btn={btnBuffer} text={textBuffer} />);
      break;
    default: break;
  }
}
