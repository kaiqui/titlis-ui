import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as React from 'react';

interface FontConfig {
  fontfamily?: string[];
  fontweight?: string[];
  fontsize?: string[];
}

interface TitleData {
  title: string;
  titleColor?: { hex: string };
  titleFont?: FontConfig;
  titleHtmlTag?: { tag: string[] };
}

interface SubtitleData {
  subtitle: string;
  subtitleColor?: { hex: string };
  subtitleFont?: FontConfig;
  subtitleHtmlTag?: { tag: string[] };
}

interface TextData {
  text: string;
  textColor?: { hex: string };
  textFont?: FontConfig;
}

export function Title({ data, color }: Readonly<{ data: TitleData; color?: { hex: string } }>) {
  const title = data;
  const titleStyle: React.CSSProperties = {
    color: color?.hex || title?.titleColor?.hex || 'black',
    fontSize: title?.titleFont?.fontsize?.[0] || '2.5rem',
  };
  const fontFamilyClass = title?.titleFont?.fontfamily?.[0] || 'family-neighbor';
  const fontWeightClass = title?.titleFont?.fontweight?.[0] || 'fw-normal';
  const Tag = (
    data?.titleHtmlTag?.tag?.[0] && /^[a-zA-Z][a-zA-Z0-9-]*$/.test(data.titleHtmlTag.tag[0])
      ? data.titleHtmlTag.tag[0]
      : 'h1'
  ) as React.ElementType;

  return (
    <>
      {title?.title ? (
        <Tag className={`${fontFamilyClass} ${fontWeightClass} limit-title-sm`} style={titleStyle}>
          {title?.title}
        </Tag>
      ) : null}
    </>
  );
}

export function Subtitle({ data, color }: Readonly<{ data: SubtitleData; color?: { hex: string } }>) {
  const subtitle = data;
  const subtitleStyle: React.CSSProperties = {
    color: color?.hex || subtitle?.subtitleColor?.hex || 'black',
    fontSize: subtitle?.subtitleFont?.fontsize?.[0] || '1.5rem',
  };
  const fontFamilyClass = subtitle?.subtitleFont?.fontfamily?.[0] || 'family-reminder';
  const fontWeightClass = subtitle?.subtitleFont?.fontweight?.[0] || 'fw-normal';
  const Tag = (
    data?.subtitleHtmlTag?.tag?.[0] && /^[a-zA-Z][a-zA-Z0-9-]*$/.test(data.subtitleHtmlTag.tag[0])
      ? data.subtitleHtmlTag.tag[0]
      : 'h2'
  ) as React.ElementType;

  return (
    <>
      {subtitle?.subtitle ? (
        <Tag className={`${fontFamilyClass} ${fontWeightClass} limit-subtitle-sm`} style={subtitleStyle}>
          {subtitle?.subtitle}
        </Tag>
      ) : null}
    </>
  );
}

const MarkdownAnchor = (AnchorStyle: React.CSSProperties) =>
  function A(props: React.HTMLAttributes<HTMLAnchorElement>) {
    return (
      <a target="_blank" style={AnchorStyle} {...props}>
        {(props as any).children || 'Link'}
      </a>
    );
  };

const MarkdownParagraph = (textStyle: React.CSSProperties) =>
  function P(props: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p style={textStyle} {...props} />;
  };

export function Text({ data }: Readonly<{ data: TextData }>) {
  const text = data;
  const textStyle: React.CSSProperties = {
    fontSize: text?.textFont?.fontsize?.[0] || '1.2rem',
    color: text?.textColor?.hex || 'black',
    lineHeight: '110%',
  };
  const anchorStyle: React.CSSProperties = {
    fontSize: data?.textFont?.fontsize?.[0] || '1.2rem',
    color: data?.textColor?.hex || 'black',
    textDecoration: 'underline',
  };
  const fontFamilyClass = text?.textFont?.fontfamily?.[0] || 'family-montserrat';

  const MarkdownImage = () =>
    function img({ src, alt }: { src?: string; alt?: string }) {
      if (!src) return null;
      return (
        <span style={{ display: 'block', position: 'relative', maxWidth: 500, width: '100%' }}>
          <img
            src={src}
            alt={alt || ''}
            style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: 500 }}
          />
        </span>
      );
    };

  return (
    <>
      {text?.text ? (
        <div className={fontFamilyClass}>
          <ReactMarkdown
            components={{
              p: MarkdownParagraph(textStyle),
              img: MarkdownImage(),
              a: MarkdownAnchor(anchorStyle),
            }}
            remarkPlugins={[remarkGfm]}
          >
            {text?.text}
          </ReactMarkdown>
        </div>
      ) : null}
    </>
  );
}
