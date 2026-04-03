import type { Key } from 'react';
import SidebarItem from '@/components/atoms/sidebar-item';

export default function Sidebar({ data, slug, sidebar }: any) {
  return (
    <aside className="sidebar-container">
      <nav>
        <ul className="sidebar-list">
          {sidebar
            .filter((menuItem: { slug: string }) => menuItem.slug !== 'livrodamarcajeitto')
            .map((menuItem: { slug: Key | null | undefined; title: any }) => {
              const isActiveSection = slug === menuItem.slug;
              return (
                <div key={menuItem.slug}>
                  <SidebarItem data={{ sectionTitle: menuItem.title, link: '/livrodamarcajeitto/' + menuItem.slug, activeSection: isActiveSection }} />
                  {isActiveSection && data?.map((subSection: any) => {
                    if (!subSection.sectionSlug) return null;
                    return <div key={subSection.id}><SidebarItem data={subSection} /></div>;
                  })}
                </div>
              );
            })}
        </ul>
      </nav>
    </aside>
  );
}
