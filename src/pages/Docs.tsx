import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, Menu, Search, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { fadeInUp } from '@/lib/motion/tokens'

// --------------------------------------------------------------------------
// Manifesto de módulos
// --------------------------------------------------------------------------
const modules = [
  { slug: 'visao-geral',         title: 'Visão Geral',                       file: () => import('../docs/00-visao-geral.md?raw') },
  { slug: 'primeiros-passos',    title: 'Primeiros Passos',                   file: () => import('../docs/01-primeiros-passos.md?raw') },
  { slug: 'service-yaml',        title: '.titlis/service.yaml',               file: () => import('../docs/11-service-yaml.md?raw') },
  { slug: 'hub',                 title: 'Hub de serviços',                    file: () => import('../docs/12-hub.md?raw') },
  { slug: 'cobertura',           title: 'Cobertura & Confiança',              file: () => import('../docs/13-cobertura.md?raw') },
  { slug: 'confiabilidade',      title: 'Confiabilidade',                     file: () => import('../docs/14-confiabilidade.md?raw') },
  { slug: 'scorecards',          title: 'Scorecards (legado)',                file: () => import('../docs/02-scorecards.md?raw') },
  { slug: 'slos',                title: 'SLOs',                               file: () => import('../docs/03-slos.md?raw') },
  { slug: 'assistente-ia',       title: 'ARIA — Assistente de IA',            file: () => import('../docs/05-assistente-ia.md?raw') },
  { slug: 'configuracoes',       title: 'Configurações',                      file: () => import('../docs/09-configuracoes.md?raw') },
  { slug: 'integracoes',         title: 'Integrações',                        file: () => import('../docs/10-integracoes.md?raw') },
]

const appLogoUrl = import.meta.env.VITE_APP_LOGO_URL?.trim() || '/logo.png'
const appName    = import.meta.env.VITE_APP_NAME?.trim()    || 'Titlis'

// --------------------------------------------------------------------------
// Renderizador de Markdown com links internos interceptados
// --------------------------------------------------------------------------
function DocMarkdown({ content }: { content: string }) {
  const navigate = useNavigate()

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a({ href, children, ...props }) {
          if (href?.startsWith('/docs/')) {
            return (
              <a
                href={href}
                onClick={(e) => { e.preventDefault(); navigate(href) }}
                className="docs-link"
                {...props}
              >
                {children}
              </a>
            )
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="docs-link" {...props}>
              {children}
              <ExternalLink size={12} className="docs-link-icon" />
            </a>
          )
        },
        h1: ({ children }) => <h1 className="docs-h1">{children}</h1>,
        h2: ({ children }) => <h2 className="docs-h2">{children}</h2>,
        h3: ({ children }) => <h3 className="docs-h3">{children}</h3>,
        h4: ({ children }) => <h4 className="docs-h4">{children}</h4>,
        p:  ({ children }) => <p  className="docs-p">{children}</p>,
        ul: ({ children }) => <ul className="docs-ul">{children}</ul>,
        ol: ({ children }) => <ol className="docs-ol">{children}</ol>,
        li: ({ children }) => <li className="docs-li">{children}</li>,
        table:  ({ children }) => <div className="docs-table-wrap"><table className="docs-table">{children}</table></div>,
        thead:  ({ children }) => <thead className="docs-thead">{children}</thead>,
        th:     ({ children }) => <th className="docs-th">{children}</th>,
        td:     ({ children }) => <td className="docs-td">{children}</td>,
        tr:     ({ children }) => <tr className="docs-tr">{children}</tr>,
        code({ inline, children, ...rest }: { inline?: boolean; children?: React.ReactNode }) {
          if (inline) return <code className="docs-code-inline" {...rest}>{children}</code>
          return (
            <div className="docs-code-block-wrap">
              <pre className="docs-code-block"><code>{children}</code></pre>
            </div>
          )
        },
        blockquote: ({ children }) => <blockquote className="docs-blockquote">{children}</blockquote>,
        hr: () => <hr className="docs-hr" />,
        strong: ({ children }) => <strong className="docs-strong">{children}</strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// --------------------------------------------------------------------------
// Navegação entre módulos (prev / next)
// --------------------------------------------------------------------------
function ModuleNav({ current }: { current: number }) {
  const prev = current > 0 ? modules[current - 1] : null
  const next = current < modules.length - 1 ? modules[current + 1] : null
  return (
    <div className="docs-module-nav">
      {prev
        ? (
            <Link to={`/docs/${prev.slug}`} className="docs-module-nav-btn">
              <ChevronLeft size={16} />
              <span>{prev.title}</span>
            </Link>
          )
        : <div />}
      {next && (
        <Link to={`/docs/${next.slug}`} className="docs-module-nav-btn docs-module-nav-next">
          <span>{next.title}</span>
          <ChevronRight size={16} />
        </Link>
      )}
    </div>
  )
}

// --------------------------------------------------------------------------
// Sidebar de navegação
// --------------------------------------------------------------------------
function DocsSidebar({
  currentSlug,
  open,
  onClose,
}: {
  currentSlug: string
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'docs-sidebar',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="docs-sidebar-header">
          <Link to="/docs" className="docs-sidebar-brand" onClick={onClose}>
            <div className="docs-sidebar-logo">
              <img src={appLogoUrl} alt="" className="h-5 w-5 object-contain" />
            </div>
            <span className="docs-sidebar-brand-name">{appName}</span>
            <span className="docs-sidebar-badge">Docs</span>
          </Link>
          <button
            type="button"
            className="docs-sidebar-close lg:hidden"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="docs-sidebar-nav">
          <p className="docs-sidebar-section-label">Documentação</p>
          {modules.map(mod => (
            <Link
              key={mod.slug}
              to={`/docs/${mod.slug}`}
              onClick={onClose}
              className={cn(
                'docs-sidebar-item',
                currentSlug === mod.slug && 'docs-sidebar-item-active',
              )}
            >
              {currentSlug === mod.slug && (
                <motion.span
                  layoutId="docs-sidebar-active"
                  className="docs-sidebar-item-active-bg"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <span style={{ position: 'relative' }}>{mod.title}</span>
            </Link>
          ))}
        </nav>

        <div className="docs-sidebar-footer">
          <Link to="/login" className="docs-sidebar-footer-link">
            Entrar na plataforma
            <ExternalLink size={12} />
          </Link>
        </div>
      </aside>
    </>
  )
}

// --------------------------------------------------------------------------
// Página principal
// --------------------------------------------------------------------------
export function Docs() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate  = useNavigate()
  const contentRef = useRef<HTMLDivElement>(null)

  const effectiveSlug = slug ?? 'visao-geral'
  const moduleIndex   = modules.findIndex(m => m.slug === effectiveSlug)
  const module        = moduleIndex >= 0 ? modules[moduleIndex] : null

  const [content,        setContent]       = useState<string | null>(null)
  const [loading,        setLoading]       = useState(true)
  const [sidebarOpen,    setSidebarOpen]   = useState(false)
  const [search,         setSearch]        = useState('')
  const [searchResults,  setSearchResults] = useState<typeof modules>([])

  // Redireciona slug inválido para overview
  useEffect(() => {
    if (slug && moduleIndex < 0) navigate('/docs/visao-geral', { replace: true })
  }, [slug, moduleIndex, navigate])

  // Carrega conteúdo do módulo
  useEffect(() => {
    if (!module) return
    setLoading(true)
    setContent(null)
    module.file()
      .then((mod: { default: string }) => {
        setContent(mod.default)
        setLoading(false)
        contentRef.current?.scrollTo({ top: 0 })
      })
      .catch(() => setLoading(false))
  }, [module])

  // Busca simples no título dos módulos
  useEffect(() => {
    const q = search.trim().toLowerCase()
    if (!q) { setSearchResults([]); return }
    setSearchResults(modules.filter(m => m.title.toLowerCase().includes(q)))
  }, [search])

  return (
    <div className="docs-shell">
      {/* Sidebar */}
      <DocsSidebar
        currentSlug={effectiveSlug}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Coluna de conteúdo */}
      <div className="docs-main">
        {/* Topbar */}
        <header className="docs-topbar">
          <button
            type="button"
            className="docs-topbar-menu lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <Link to="/docs" className="docs-topbar-brand lg:hidden">
            <img src={appLogoUrl} alt="" className="h-6 w-6 object-contain" />
            <span>{appName} Docs</span>
          </Link>

          {/* Busca */}
          <div className="docs-search-wrap">
            <Search size={15} className="docs-search-icon" />
            <input
              type="search"
              placeholder="Buscar na documentação…"
              className="docs-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="docs-search-results">
                {searchResults.map(m => (
                  <Link
                    key={m.slug}
                    to={`/docs/${m.slug}`}
                    className="docs-search-result-item"
                    onClick={() => setSearch('')}
                  >
                    <BookOpen size={14} />
                    {m.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/login" className="docs-topbar-cta">
            Entrar na plataforma
          </Link>
        </header>

        {/* Conteúdo */}
        <div className="docs-content-wrap" ref={contentRef}>
          <article className="docs-article">
            {loading && (
              <div className="docs-loading">
                <div className="docs-loading-bar" />
              </div>
            )}

            {!loading && content && (
              <AnimatePresence mode="wait">
                <motion.div key={effectiveSlug} {...fadeInUp}>
                  <DocMarkdown content={content} />
                  <ModuleNav current={moduleIndex} />
                </motion.div>
              </AnimatePresence>
            )}

            {!loading && !content && (
              <div className="docs-not-found">
                <p className="docs-not-found-title">Página não encontrada</p>
                <Link to="/docs/visao-geral" className="docs-link">Voltar para a Visão Geral</Link>
              </div>
            )}
          </article>
        </div>
      </div>

      <style>{docsStyles}</style>
    </div>
  )
}

// --------------------------------------------------------------------------
// Estilos (scoped via prefixo docs-)
// --------------------------------------------------------------------------
const docsStyles = `
  .docs-shell {
    display: flex;
    min-height: 100vh;
    background: var(--app-background);
    color: var(--color-foreground);
  }

  /* ── Sidebar ── */
  .docs-sidebar {
    position: fixed;
    inset-y: 0;
    left: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    width: 17rem;
    border-right: 1px solid var(--color-border);
    background: var(--color-card);
    transition: transform 300ms ease;
    overflow: hidden;
  }
  @media (min-width: 1024px) {
    .docs-sidebar { position: sticky; top: 0; height: 100vh; }
  }

  .docs-sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 1.25rem 1.25rem 1rem;
    border-bottom: 1px solid var(--color-border);
  }
  .docs-sidebar-brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    text-decoration: none;
    color: var(--color-foreground);
  }
  .docs-sidebar-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.6rem;
    background: var(--color-primary-soft);
    flex-shrink: 0;
  }
  .docs-sidebar-brand-name {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 0.95rem;
    letter-spacing: 0.04em;
  }
  .docs-sidebar-badge {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-primary-strong);
    background: var(--color-primary-soft);
    padding: 0.15rem 0.45rem;
    border-radius: 99px;
  }
  .docs-sidebar-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-muted-foreground);
    cursor: pointer;
    transition: color 150ms;
  }
  .docs-sidebar-close:hover { color: var(--color-foreground); }

  .docs-sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 0.75rem;
  }
  .docs-sidebar-section-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-muted-foreground);
    padding: 0 0.5rem 0.5rem;
    margin: 0;
  }
  .docs-sidebar-item {
    display: block;
    position: relative;
    padding: 0.55rem 0.75rem;
    border-radius: 0.75rem;
    font-size: 0.88rem;
    font-weight: 500;
    color: var(--color-muted-foreground);
    text-decoration: none;
    transition: background 150ms, color 150ms;
    margin-bottom: 0.15rem;
  }
  .docs-sidebar-item:hover {
    background: var(--color-muted);
    color: var(--color-foreground);
  }
  .docs-sidebar-item-active {
    color: var(--color-primary-strong);
    font-weight: 700;
  }
  .docs-sidebar-item-active:hover {
    color: var(--color-primary-strong);
  }
  .docs-sidebar-item-active-bg {
    position: absolute;
    inset: 0;
    border-radius: 0.75rem;
    background: var(--color-primary-soft);
    z-index: 0;
  }

  .docs-sidebar-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-border);
  }
  .docs-sidebar-footer-link {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-primary-strong);
    text-decoration: none;
  }
  .docs-sidebar-footer-link:hover { text-decoration: underline; }

  /* ── Main ── */
  .docs-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  /* ── Topbar ── */
  .docs-topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--header-background);
  }
  @media (min-width: 1024px) {
    .docs-topbar { padding: 0.85rem 2.5rem; }
  }
  .docs-topbar-menu {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.6rem;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-muted-foreground);
    cursor: pointer;
    flex-shrink: 0;
  }
  .docs-topbar-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 800;
    font-size: 0.9rem;
    color: var(--color-foreground);
    text-decoration: none;
    flex-shrink: 0;
  }

  .docs-search-wrap {
    position: relative;
    flex: 1;
    max-width: 36rem;
  }
  .docs-search-icon {
    position: absolute;
    left: 0.85rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted-foreground);
    pointer-events: none;
  }
  .docs-search-input {
    width: 100%;
    padding: 0.6rem 1rem 0.6rem 2.4rem;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-muted);
    color: var(--color-foreground);
    font-size: 0.88rem;
    outline: none;
    transition: border-color 150ms, box-shadow 150ms;
  }
  .docs-search-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-soft);
  }
  .docs-search-results {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    z-index: 50;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    box-shadow: 0 12px 32px rgba(15,23,42,0.12);
    overflow: hidden;
  }
  .docs-search-result-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 1rem;
    font-size: 0.88rem;
    font-weight: 500;
    color: var(--color-foreground);
    text-decoration: none;
    transition: background 120ms;
  }
  .docs-search-result-item:hover { background: var(--color-muted); }
  .docs-search-result-item svg { color: var(--color-muted-foreground); flex-shrink: 0; }

  .docs-topbar-cta {
    display: none;
    @media (min-width: 640px) { display: flex; }
    flex-shrink: 0;
    align-items: center;
    padding: 0.55rem 1.1rem;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 700;
    background: var(--color-primary);
    color: #fff;
    text-decoration: none;
    transition: opacity 150ms, transform 150ms;
  }
  .docs-topbar-cta:hover { opacity: 0.9; transform: translateY(-1px); }
  @media (min-width: 640px) {
    .docs-topbar-cta { display: flex; }
  }

  /* ── Content ── */
  .docs-content-wrap {
    flex: 1;
    padding: 2.5rem 1.5rem 4rem;
    overflow-y: auto;
  }
  @media (min-width: 1024px) {
    .docs-content-wrap { padding: 3rem 3rem 5rem; }
  }
  @media (min-width: 1280px) {
    .docs-content-wrap { padding: 3rem 5rem 5rem; max-width: 860px; }
  }

  .docs-article {
    width: 100%;
  }

  /* ── Loading ── */
  .docs-loading { padding: 3rem 0; }
  .docs-loading-bar {
    height: 4px;
    width: 40%;
    border-radius: 999px;
    background: var(--color-primary-soft);
    animation: docs-pulse 1.4s ease-in-out infinite;
  }
  @keyframes docs-pulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 1; }
  }

  /* ── Not found ── */
  .docs-not-found { padding: 4rem 0; text-align: center; }
  .docs-not-found-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-muted-foreground);
    margin-bottom: 0.75rem;
  }

  /* ── Module nav ── */
  .docs-module-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 3.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
    gap: 1rem;
  }
  .docs-module-nav-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--color-border);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-foreground);
    text-decoration: none;
    background: var(--color-card);
    transition: background 150ms, transform 150ms;
    max-width: 14rem;
  }
  .docs-module-nav-btn:hover { background: var(--color-muted); transform: translateY(-1px); }
  .docs-module-nav-btn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .docs-module-nav-next { flex-direction: row-reverse; margin-left: auto; }

  /* ── Markdown typography ── */
  .docs-h1 {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 1.18;
    color: var(--color-foreground);
    margin: 0 0 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border);
  }
  .docs-h2 {
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: var(--color-foreground);
    margin: 2.5rem 0 0.75rem;
  }
  .docs-h3 {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--color-foreground);
    margin: 1.75rem 0 0.5rem;
  }
  .docs-h4 {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-muted-foreground);
    margin: 1.25rem 0 0.4rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .docs-p {
    font-size: 0.95rem;
    line-height: 1.75;
    color: var(--color-foreground);
    margin: 0 0 1rem;
  }
  .docs-ul, .docs-ol {
    margin: 0 0 1rem 0;
    padding-left: 1.5rem;
  }
  .docs-li {
    font-size: 0.95rem;
    line-height: 1.75;
    color: var(--color-foreground);
    margin-bottom: 0.25rem;
  }
  .docs-hr {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 2rem 0;
  }
  .docs-strong {
    font-weight: 700;
    color: var(--color-foreground);
  }
  .docs-blockquote {
    margin: 1.25rem 0;
    padding: 0.85rem 1.25rem;
    border-left: 3px solid var(--color-primary);
    border-radius: 0 0.75rem 0.75rem 0;
    background: var(--color-primary-soft);
  }
  .docs-blockquote p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-foreground);
  }
  .docs-link {
    color: var(--color-primary-strong);
    text-decoration: underline;
    text-underline-offset: 2px;
    font-weight: 500;
  }
  .docs-link:hover { opacity: 0.8; }
  .docs-link-icon {
    display: inline;
    margin-left: 0.2rem;
    vertical-align: middle;
    opacity: 0.6;
  }
  .docs-code-inline {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.82em;
    padding: 0.15em 0.45em;
    border-radius: 0.35rem;
    background: var(--color-muted);
    color: var(--color-primary-strong);
    border: 1px solid var(--color-border);
  }
  .docs-code-block-wrap {
    margin: 1rem 0;
    border-radius: 1rem;
    overflow: hidden;
    border: 1px solid var(--color-border);
  }
  .docs-code-block {
    margin: 0;
    padding: 1.25rem 1.5rem;
    background: var(--color-panel-deep);
    color: #e2e8f0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.83rem;
    line-height: 1.7;
    overflow-x: auto;
  }
  .docs-table-wrap {
    margin: 1.25rem 0;
    overflow-x: auto;
    border-radius: 1rem;
    border: 1px solid var(--color-border);
  }
  .docs-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  .docs-thead { background: var(--color-muted); }
  .docs-th {
    padding: 0.65rem 1rem;
    text-align: left;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-muted-foreground);
    border-bottom: 1px solid var(--color-border);
  }
  .docs-td {
    padding: 0.65rem 1rem;
    color: var(--color-foreground);
    border-bottom: 1px solid var(--color-border);
    vertical-align: top;
    line-height: 1.6;
  }
  .docs-tr:last-child .docs-td { border-bottom: none; }
  .docs-tr:nth-child(even) { background: color-mix(in srgb, var(--color-muted) 40%, transparent); }
`
