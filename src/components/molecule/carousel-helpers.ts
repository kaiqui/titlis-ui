import React from 'react';

export const getCommonImageStyles = (carouselObj: any): React.CSSProperties => {
  const isImageSlide = carouselObj.layout === 'imageSlide';
  return {
    width: isImageSlide ? '100vw' : '80%',
    height: isImageSlide ? '100%' : 'auto',
    minHeight: isImageSlide ? '600px' : 'auto',
    objectFit: isImageSlide ? 'cover' : 'contain',
    objectPosition: 'center',
  };
};

export const getFormBorderClass = (visual: string | undefined): string => {
  if (!visual) return '';
  switch (visual) {
    case 'border-default': return 'border-default';
    case 'border-light': return 'border-light';
    case 'border-triple': return 'border-triple';
    case 'border-radius': return 'border-radius';
    default: return '';
  }
};

export const getFormStyles = (form: any): React.CSSProperties => {
  const hex = form.backgroundColor?.hex || 'transparent';
  const borderColor = form.borderForm?.borderColor?.hex;
  return {
    backgroundColor: hex,
    '--color-var': hex,
    borderColor: borderColor,
    padding: '10px',
    opacity: 1,
  } as React.CSSProperties;
};
