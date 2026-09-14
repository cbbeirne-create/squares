import SiteFooter from '@/components/marketing/SiteFooter'
import SiteHeader from '@/components/marketing/SiteHeader'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-white text-slate-950">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
