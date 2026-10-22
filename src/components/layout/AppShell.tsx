import { Boxes, ChevronRight, FlaskConical, HistoryIcon, PanelLeft, UserRound, Users, Wallet } from 'lucide-react'
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Badge } from '../ui/Badge'

export interface BreadcrumbItem {
  label: ReactNode
  to?: string
}

export interface PageMeta {
  title: ReactNode
  breadcrumb?: BreadcrumbItem[]
  meta?: ReactNode
  actions?: ReactNode
}

interface PageMetaContextValue {
  meta: PageMeta | null
  setMeta: (meta: PageMeta | null) => void
}

const PageMetaContext = createContext<PageMetaContextValue | null>(null)

/** Pages call this to populate the shell header. */
export function usePageMeta(meta: PageMeta): void {
  const ctx = useContext(PageMetaContext)
  const { title, breadcrumb, meta: metaNode, actions } = meta
  useLayoutEffect(() => {
    if (!ctx) return
    ctx.setMeta({ title, breadcrumb, meta: metaNode, actions })
    return () => ctx.setMeta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.setMeta, title, breadcrumb, metaNode, actions])
}

export const NAV_ITEMS: { code: string; label: string; to: string; icon: ReactNode }[] = [
  { code: 'P-01', label: '고객 AI 사용 현황', to: '/customers', icon: <Users aria-hidden="true" /> },
  { code: 'P-02', label: '내부 AI 예산 관리', to: '/internal', icon: <Wallet aria-hidden="true" /> },
  { code: 'P-03', label: 'AI 모델 관리', to: '/models', icon: <Boxes aria-hidden="true" /> },
  { code: 'P-04', label: 'Multi-LLM Simulator', to: '/simulator', icon: <FlaskConical aria-hidden="true" /> },
  { code: 'P-05', label: '시뮬레이션 결과 이력', to: '/simulations', icon: <HistoryIcon aria-hidden="true" /> },
]

function useIsNarrow(breakpoint = 1024): boolean {
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < breakpoint : false))
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpoint])
  return narrow
}

export interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  footer?: ReactNode
}

export function Sidebar({ collapsed, onToggle, footer }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col bg-sidebar text-ink-inverse transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
      aria-label="주 메뉴"
    >
      <div className={cn('flex h-14 items-center border-b border-white/10', collapsed ? 'justify-center px-0' : 'justify-between px-4')}>
        {!collapsed && (
          <Link to="/" className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-bold tracking-tight">LOGBASE Patron</span>
            <span className="text-[11px] text-white/60">Super Admin</span>
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          aria-expanded={!collapsed}
          className="inline-flex size-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
        >
          <PanelLeft className="size-4" aria-hidden="true" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                title={collapsed ? `${item.code} ${item.label}` : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors [&>svg]:size-[18px] [&>svg]:shrink-0',
                    collapsed && 'justify-center px-0',
                    isActive ? 'bg-sidebar-active font-semibold text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                {item.icon}
                {!collapsed && (
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate">{item.label}</span>
                    <span className="text-[10px] font-normal text-white/50">{item.code}</span>
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className={cn('flex flex-col gap-2 border-t border-white/10 p-3', collapsed && 'items-center')}>
        {collapsed ? (
          <span className="size-2 rounded-pill bg-warning" title="Mock 데이터 환경" aria-label="Mock 데이터 환경" />
        ) : (
          <Badge tone="warning" size="sm" dot>
            Mock 데이터 환경
          </Badge>
        )}
        {!collapsed && footer}
      </div>
    </aside>
  )
}

export interface HeaderProps {
  title: ReactNode
  breadcrumb?: BreadcrumbItem[]
  meta?: ReactNode
  actions?: ReactNode
}

export function Header({ title, breadcrumb, meta, actions }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          {breadcrumb && breadcrumb.length > 0 && (
            <nav aria-label="현재 위치" className="flex items-center gap-1 text-[11px] text-ink-muted">
              {breadcrumb.map((b, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="size-3" aria-hidden="true" />}
                  {b.to ? (
                    <Link to={b.to} className="hover:text-ink hover:underline">
                      {b.label}
                    </Link>
                  ) : (
                    <span>{b.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <h1 className="truncate text-base font-bold leading-5 text-ink">{title}</h1>
        </div>
        {meta && <div className="hidden text-xs text-ink-muted md:block">{meta}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {actions}
        <div className="flex items-center gap-2 rounded-pill border border-border bg-subtle py-1 pl-1 pr-3 text-xs text-ink-secondary">
          <span className="inline-flex size-6 items-center justify-center rounded-pill bg-primary-soft text-primary">
            <UserRound className="size-3.5" aria-hidden="true" />
          </span>
          관리자
        </div>
      </div>
    </header>
  )
}

export interface AppShellProps {
  children?: ReactNode
  sidebarFooter?: ReactNode
}

export function AppShell({ children, sidebarFooter }: AppShellProps) {
  const narrow = useIsNarrow()
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null)
  const collapsed = userCollapsed ?? narrow
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const ctx = useMemo(() => ({ meta, setMeta }), [meta])

  return (
    <PageMetaContext.Provider value={ctx}>
      <div className="flex h-screen w-full overflow-hidden bg-canvas">
        <Sidebar collapsed={collapsed} onToggle={() => setUserCollapsed(!collapsed)} footer={sidebarFooter} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header title={meta?.title ?? 'Patron'} breadcrumb={meta?.breadcrumb} meta={meta?.meta} actions={meta?.actions} />
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-6">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">{children ?? <Outlet />}</div>
          </main>
        </div>
      </div>
    </PageMetaContext.Provider>
  )
}
