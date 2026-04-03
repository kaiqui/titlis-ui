import { useState } from 'react';
import { Iframe } from '@/components/atoms/iframe';

export function Tabs(data: any) {
  const tabsData = data?.data;
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  if (!tabsData || !Array.isArray(tabsData) || tabsData.length === 0) return null;

  const activeTabContent = tabsData[activeTabIndex];
  const hasVideo = activeTabContent?.video?.providerUid;

  return (
    <div className="tabs-wrapper">
      <div className="tabs-header">
        {tabsData.map((tab, index) => {
          const Tag = (tab.titleHtmlTag?.tag[0] ? tab.titleHtmlTag.tag[0] : 'div') as React.ElementType;
          const fontSize = tab.titleFont?.fontsize;
          const fontFamilyClass = tab.titleFont?.fontfamily?.[0] || 'family-neighbor';
          const fontWeightClass = tab.titleFont?.fontweight?.[0] || 'fw-normal';
          const isActive = activeTabIndex === index;
          const colorActive = tab.activeColor?.hex || '#999999';
          const colorDefault = tab.defaultColor?.hex || '#999999';
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabIndex(index)}
              style={{ color: tab.titleColor?.hex, '--bg-active': colorActive, '--bg-default': colorDefault, fontSize } as React.CSSProperties}
              className={`tab-button ${fontFamilyClass} ${fontWeightClass} ${isActive ? 'is-active' : ''}`}
            >
              {tab.tabIcon?.url && (
                <img src={tab.tabIcon.url} alt={tab.title} width={tab.tabIcon.width} height={tab.tabIcon.height} className="tab-icon" />
              )}
              <Tag>{tab.title}</Tag>
            </button>
          );
        })}
      </div>
      <div className="tabs-content">
        {hasVideo && <div className="video-responsive-wrapper"><Iframe data={activeTabContent.video} /></div>}
      </div>
    </div>
  );
}
