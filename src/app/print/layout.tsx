import './print.css'

export const dynamic = 'force-dynamic'

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-muted/30 min-h-screen">{children}</div>
}
