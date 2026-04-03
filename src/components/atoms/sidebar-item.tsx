export default function SidebarItem({ data }: any) {
  const finalHref = data.link ? data.link : `#${data.sectionSlug}`;
  const isExternal = !!data.link;
  const isActiveSection = data.activeSection;

  return (
    <li
      className={`sidebar-item family-neighbor fw-bold ${isExternal ? 'external-item' : ''} ${isActiveSection ? 'active-item' : ''}`}
    >
      <a
        href={finalHref}
        className="sidebar-link"
        rel={isExternal ? 'noopener noreferrer' : undefined}
        aria-current={isActiveSection ? 'page' : undefined}
      >
        {data.sectionTitle}
      </a>
    </li>
  );
}
