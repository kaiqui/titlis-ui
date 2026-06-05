import { useState } from 'react'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import Prism from 'prismjs'
import 'prismjs/components/prism-yaml'
import { FileText, FilePlus } from 'lucide-react'

export interface DiffFile {
  path: string
  current: string
  patched: string
  isNew: boolean
}

interface Props {
  file: DiffFile
}

function countChanges(current: string, patched: string): { added: number; removed: number } {
  const a = current.split('\n')
  const b = patched.split('\n')
  const setA = new Set(a)
  const setB = new Set(b)
  const added = b.filter(l => !setA.has(l)).length
  const removed = a.filter(l => !setB.has(l)).length
  return { added, removed }
}

function highlightYaml(source: string) {
  const highlighted = Prism.highlight(source, Prism.languages.yaml, 'yaml')
  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />
}

const darkStyles = {
  variables: {
    dark: {
      diffViewerBackground: 'var(--app-background)',
      diffViewerColor: 'var(--color-foreground)',
      addedBackground: 'rgba(16,185,129,0.12)',
      addedColor: '#34d399',
      removedBackground: 'rgba(239,68,68,0.10)',
      removedColor: '#f87171',
      wordAddedBackground: 'rgba(16,185,129,0.25)',
      wordRemovedBackground: 'rgba(239,68,68,0.22)',
      addedGutterBackground: 'rgba(16,185,129,0.2)',
      removedGutterBackground: 'rgba(239,68,68,0.15)',
      gutterBackground: 'var(--color-card)',
      gutterBackgroundDark: 'var(--color-card)',
      highlightBackground: 'rgba(99,102,241,0.12)',
      highlightGutterBackground: 'rgba(99,102,241,0.18)',
      codeFoldBackground: 'var(--color-muted)',
      emptyLineBackground: 'transparent',
      gutterColor: 'var(--color-muted-foreground)',
      addedGutterColor: '#34d399',
      removedGutterColor: '#f87171',
      codeFoldContentColor: 'var(--color-muted-foreground)',
      diffViewerTitleBackground: 'var(--color-card)',
      diffViewerTitleColor: 'var(--color-foreground)',
      diffViewerTitleBorderColor: 'var(--color-border)',
    },
  },
}

export function CodeDiffView({ file }: Props) {
  const [splitView, setSplitView] = useState(true)
  const { added, removed } = file.isNew
    ? { added: file.patched.split('\n').length, removed: 0 }
    : countChanges(file.current, file.patched)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      {/* ── header ── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 text-xs"
        style={{ backgroundColor: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {file.isNew
            ? <FilePlus size={13} style={{ color: '#10b981', flexShrink: 0 }} />
            : <FileText size={13} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
          }
          <span className="font-mono font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>
            {file.path}
          </span>
          {file.isNew && (
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              novo arquivo
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="font-semibold" style={{ color: '#10b981' }}>+{added}</span>
          <span className="font-semibold" style={{ color: '#f87171' }}>−{removed}</span>
          <button
            onClick={() => setSplitView(v => !v)}
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-opacity hover:opacity-70"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
          >
            {splitView ? 'unified' : 'split'}
          </button>
        </div>
      </div>

      {/* ── diff viewer ── */}
      <div className="overflow-auto" style={{ maxHeight: '440px', fontSize: '12px' }}>
        <ReactDiffViewer
          oldValue={file.current}
          newValue={file.patched}
          splitView={splitView}
          useDarkTheme
          compareMethod={DiffMethod.LINES}
          styles={darkStyles}
          renderContent={highlightYaml}
          hideLineNumbers={false}
          showDiffOnly={!file.isNew}
          extraLinesSurroundingDiff={3}
        />
      </div>
    </div>
  )
}
