"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FolderOpen,
  FileText,
  Settings,
  HelpCircle,
  Search,
  Plus,
  Mail,
  TrendingUp,
  TrendingDown,
  ReceiptText,
  Building2,
  ChevronRight,
  MoreHorizontal,
  CircleCheck,
  Clock,
  AlertCircle,
  GripVertical,
  SlidersHorizontal,
  LogOut,
  ChevronsUpDown,
  Check,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { WelcomeScreen } from "@/components/welcome-screen"
import { AppShell } from "@/components/app-sidebar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"
import { CreateOrgDialog } from "@/components/create-org-dialog"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Org {
  slug: string
  name: string
}

interface DashboardClientProps {
  orgSlug: string
  orgName: string
  userName?: string
  userEmail?: string
  orgs: Org[]
  showWelcome: boolean
}

// ── Static mock data ──────────────────────────────────────────────────────────

const revenueData = [
  { month: "Jan", revenue: 186000, expenses: 120000 },
  { month: "Feb", revenue: 205000, expenses: 135000 },
  { month: "Mar", revenue: 237000, expenses: 148000 },
  { month: "Apr", revenue: 273000, expenses: 160000 },
  { month: "May", revenue: 209000, expenses: 142000 },
  { month: "Jun", revenue: 314000, expenses: 175000 },
  { month: "Jul", revenue: 290000, expenses: 168000 },
  { month: "Aug", revenue: 340000, expenses: 182000 },
  { month: "Sep", revenue: 280000, expenses: 159000 },
  { month: "Oct", revenue: 390000, expenses: 210000 },
  { month: "Nov", revenue: 350000, expenses: 195000 },
  { month: "Dec", revenue: 420000, expenses: 225000 },
]

const recentTransactions = [
  { id: "1", description: "INV-0042 — Acme Technologies Ltd",  type: "Sales Invoice",  status: "paid",    amount: "₹1,25,000", date: "12 May 2026", assignee: "Ravi Sharma" },
  { id: "2", description: "INV-0041 — Greenfield Solutions",   type: "Sales Invoice",  status: "pending", amount: "₹87,500",   date: "10 May 2026", assignee: "Priya Nair"  },
  { id: "3", description: "BILL-0031 — AWS India",              type: "Purchase Bill",  status: "paid",    amount: "₹24,300",   date: "09 May 2026", assignee: "Assign"      },
  { id: "4", description: "JV-0018 — Depreciation May 2026",   type: "Journal Entry",  status: "posted",  amount: "₹6,800",    date: "08 May 2026", assignee: "Ravi Sharma" },
  { id: "5", description: "INV-0040 — Nova Retail Pvt Ltd",    type: "Sales Invoice",  status: "overdue", amount: "₹2,40,000", date: "01 May 2026", assignee: "Priya Nair"  },
  { id: "6", description: "BILL-0030 — Office Rent — May",     type: "Purchase Bill",  status: "pending", amount: "₹45,000",   date: "01 May 2026", assignee: "Assign"      },
  { id: "7", description: "PMT-0022 — Received from Acme",     type: "Payment",        status: "posted",  amount: "₹1,25,000", date: "30 Apr 2026", assignee: "Ravi Sharma" },
]

const chartConfig = {
  revenue:  { label: "Revenue",  color: "var(--color-chart-1)" },
  expenses: { label: "Expenses", color: "var(--color-chart-2)" },
}

const navMain = [
  { title: "Dashboard",  icon: LayoutDashboard, href: "dashboard", active: true },
  { title: "Accounting", icon: BookOpen,        href: "accounting"              },
  { title: "Clients",    icon: Users,           href: "clients"                 },
  { title: "Projects",   icon: FolderOpen,      href: "projects"                },
  { title: "Team",       icon: Building2,       href: "team"                    },
]

const navDocuments = [
  { title: "Invoices",  icon: ReceiptText, href: "invoices"  },
  { title: "Reports",   icon: FileText,    href: "reports"   },
  { title: "Documents", icon: FileText,    href: "documents" },
]

const stats = [
  { label: "Total Revenue",           value: "₹34,20,000", change: "+12.5%", up: true,  sub1: "Trending up this month",    sub2: "Based on last 6 months"      },
  { label: "Outstanding Receivables", value: "₹3,27,500",  change: "-8.2%",  up: false, sub1: "Down from last month",      sub2: "2 invoices overdue"          },
  { label: "Total Expenses",          value: "₹22,50,000", change: "+4.5%",  up: false, sub1: "Within budget targets",     sub2: "Operational spend stable"    },
  { label: "Net Profit",              value: "₹11,70,000", change: "+18.1%", up: true,  sub1: "Strong margin growth",      sub2: "Meets quarterly projection"  },
]

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    paid:    { label: "Paid",    className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    posted:  { label: "Posted",  className: "bg-blue-50   text-blue-700   border-blue-200"     },
    pending: { label: "Pending", className: "bg-amber-50  text-amber-700  border-amber-200"    },
    overdue: { label: "Overdue", className: "bg-red-50    text-red-700    border-red-200"      },
    draft:   { label: "Draft",   className: "bg-zinc-100  text-zinc-600   border-zinc-200"     },
  }
  const s = map[status] ?? { label: status, className: "bg-zinc-100 text-zinc-500 border-zinc-200" }
  const Icon = status === "paid" || status === "posted" ? CircleCheck
             : status === "overdue" ? AlertCircle
             : Clock
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", s.className)}>
      <Icon className="size-3" />
      {s.label}
    </span>
  )
}

// ── Org switcher (header dropdown) ───────────────────────────────────────────

function OrgSwitcher({
  currentSlug,
  currentName,
  orgs,
}: {
  currentSlug: string
  currentName: string
  orgs: Org[]
}) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                {/* Logo tile */}
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">
                  {currentName.slice(0, 2).toUpperCase()}
                </div>
                {/* Name + plan — hidden in icon mode */}
                <div className="flex flex-col gap-0.5 leading-none min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold truncate text-sm">{currentName}</span>
                  <span className="text-[0.65rem] text-muted-foreground truncate">Free plan</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-60 group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-64 rounded-xl"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2 pb-1">
                Your organisations
              </DropdownMenuLabel>

              {orgs.map((org) => (
                <DropdownMenuItem
                  key={org.slug}
                  onClick={() => { window.location.href = `/${org.slug}/dashboard` }}
                  className="gap-3 py-2"
                >
                  <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {org.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate text-sm">{org.name}</span>
                  {org.slug === currentSlug && (
                    <Check className="size-3.5 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setDialogOpen(true)
                }}
                className="gap-3 py-2 text-muted-foreground"
              >
                <div className="flex size-7 items-center justify-center rounded-md border border-dashed bg-transparent shrink-0">
                  <Plus className="size-3.5" />
                </div>
                <span className="text-sm">Create new organisation</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateOrgDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}

// ── App sidebar ───────────────────────────────────────────────────────────────

// Kept only as a fallback reference while the dashboard uses the shared org shell.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AppSidebar({
  orgSlug,
  orgName,
  orgs,
  userName,
  userEmail,
}: {
  orgSlug: string
  orgName: string
  orgs: Org[]
  userName?: string
  userEmail?: string
}) {
  const { update } = useSession()

  const initials = (userName ?? userEmail ?? "U")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  async function handleSignOut() {
    await update({ showWelcomeScreen: false, isFirstLogin: false })
    window.location.href = "/api/auth/signout"
  }

  return (
    <Sidebar collapsible="icon">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <SidebarHeader className="gap-2">
        <OrgSwitcher currentSlug={orgSlug} currentName={orgName} orgs={orgs} />

        {/* Quick Create row — full mode */}
        <div className="flex items-center gap-1.5 px-1 group-data-[collapsible=icon]:hidden">
          <Button size="sm" className="flex-1 justify-start gap-1.5 h-8">
            <Plus className="size-3.5 shrink-0" />
            Quick Create
          </Button>
          <Button size="icon" variant="outline" className="size-8 shrink-0" title="Inbox">
            <Mail className="size-3.5" />
          </Button>
        </div>

        {/* Quick Create — icon-only mode */}
        <div className="hidden px-1 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <Button size="icon" variant="outline" className="size-8" title="Quick Create">
            <Plus className="size-3.5" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* ── Main nav ──────────────────────────────────────────────────────── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.active} tooltip={item.title}>
                    <a href={`/${orgSlug}/${item.href}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navDocuments.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={`/${orgSlug}/${item.href}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          {[
            { title: "Settings", icon: Settings,   href: `/${orgSlug}/settings` },
            { title: "Get Help", icon: HelpCircle, href: "/docs"                },
            { title: "Search",   icon: Search,     href: "#"                    },
          ].map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <a href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarSeparator />

        {/* User row */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" tooltip={userName ?? userEmail}>
                  <Avatar className="size-8 rounded-lg shrink-0">
                    <AvatarFallback className="rounded-lg text-xs bg-primary text-primary-foreground font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none min-w-0 group-data-[collapsible=icon]:hidden">
                    <span className="font-medium text-sm truncate">{userName}</span>
                    <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-60 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{userName}</span>
                    <span className="text-xs text-muted-foreground">{userEmail}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={`/${orgSlug}/settings/profile`}>
                    <Settings className="size-4" />
                    Account settings
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

// ── Transaction table ─────────────────────────────────────────────────────────

function TransactionTable({ rows }: { rows: typeof recentTransactions }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-8 pl-0"><Checkbox /></TableHead>
          <TableHead className="w-6 pl-0" />
          <TableHead className="min-w-[240px] font-medium">Description</TableHead>
          <TableHead className="font-medium">Type</TableHead>
          <TableHead className="font-medium">Status</TableHead>
          <TableHead className="font-medium text-right">Amount</TableHead>
          <TableHead className="font-medium">Date</TableHead>
          <TableHead className="font-medium">Assignee</TableHead>
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="h-24 text-center text-muted-foreground text-sm">
              No transactions found.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id} className="group">
              <TableCell className="pl-0"><Checkbox /></TableCell>
              <TableCell className="pl-0">
                <GripVertical className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 cursor-grab" />
              </TableCell>
              <TableCell className="font-medium text-sm">{row.description}</TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">{row.type}</span>
              </TableCell>
              <TableCell><StatusBadge status={row.status} /></TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums">{row.amount}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.date}</TableCell>
              <TableCell>
                {row.assignee === "Assign" ? (
                  <Button variant="outline" size="xs" className="h-6 text-xs text-muted-foreground">
                    Assign reviewer <ChevronRight className="size-3 opacity-50" />
                  </Button>
                ) : (
                  <span className="text-sm">{row.assignee}</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 size-6">
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View</DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export function DashboardClient({
  orgSlug,
  orgName,
  userName,
  userEmail,
  orgs,
  showWelcome: initialShowWelcome,
}: DashboardClientProps) {
  const { update } = useSession()
  const [showWelcome, setShowWelcome] = useState(initialShowWelcome)
  const [chartRange, setChartRange] = useState<"3m" | "6m" | "12m">("12m")

  useEffect(() => {
    if (initialShowWelcome) {
      window.history.replaceState({}, "", `/${orgSlug}/dashboard`)
    }
  }, [initialShowWelcome, orgSlug])

  const handleWelcomeDone = useCallback(async () => {
    setShowWelcome(false)
    await update({ showWelcomeScreen: false, isFirstLogin: false })
  }, [update])

  const duration = Number(process.env.NEXT_PUBLIC_WELCOME_SCREEN_DURATION ?? "3000")

  const chartData =
    chartRange === "3m" ? revenueData.slice(-3)
    : chartRange === "6m" ? revenueData.slice(-6)
    : revenueData

  return (
    <>
      {showWelcome && (
        <WelcomeScreen userName={userName} onComplete={handleWelcomeDone} duration={duration} />
      )}

      <AppShell
          orgSlug={orgSlug}
          orgName={orgName}
          orgs={orgs}
          userName={userName}
          userEmail={userEmail}
          activeHref={`/${orgSlug}/dashboard`}
      >

        <SidebarInset>
          {/* Topbar */}
          <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium">Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Plus className="size-3.5" />
                New transaction
              </Button>
            </div>
          </header>

          <div className="flex flex-col gap-6 p-6">

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((s) => (
                <Card key={s.label} className="gap-3">
                  <CardHeader className="pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {s.label}
                      </CardTitle>
                      <span className={cn(
                        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
                        s.up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                      )}>
                        {s.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {s.change}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-2xl font-bold tracking-tight">{s.value}</div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      {s.up
                        ? <TrendingUp className="size-3 text-emerald-600" />
                        : <TrendingDown className="size-3 text-red-500" />
                      }
                      {s.sub1}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground/70">{s.sub2}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-semibold">Revenue vs Expenses</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {chartRange === "3m" ? "Last 3 months" : chartRange === "6m" ? "Last 6 months" : "Full year"} financial overview
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {(["3m", "6m", "12m"] as const).map((r) => (
                      <Button
                        key={r}
                        variant={chartRange === r ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => setChartRange(r)}
                      >
                        {r === "3m" ? "Last 3 months" : r === "6m" ? "Last 6 months" : "Last 12 months"}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer config={chartConfig} className="h-[240px] w-full">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="revenue"  stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#revGradient)" dot={false} />
                    <Area type="monotone" dataKey="expenses" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#expGradient)" dot={false} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Transactions */}
            <Card>
              <CardHeader>
                <Tabs defaultValue="all" className="w-full">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <TabsList className="h-8">
                      <TabsTrigger value="all"      className="text-xs">All</TabsTrigger>
                      <TabsTrigger value="invoices" className="text-xs">
                        Invoices
                        <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">3</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="bills"    className="text-xs">
                        Bills
                        <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">2</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="journals" className="text-xs">Journals</TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                        <SlidersHorizontal className="size-3" />
                        Customize
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Plus className="size-3" />
                        Add entry
                      </Button>
                    </div>
                  </div>

                  <TabsContent value="all"      className="mt-4 border-0 p-0"><TransactionTable rows={recentTransactions} /></TabsContent>
                  <TabsContent value="invoices" className="mt-4 border-0 p-0"><TransactionTable rows={recentTransactions.filter((r) => r.type === "Sales Invoice")} /></TabsContent>
                  <TabsContent value="bills"    className="mt-4 border-0 p-0"><TransactionTable rows={recentTransactions.filter((r) => r.type === "Purchase Bill")} /></TabsContent>
                  <TabsContent value="journals" className="mt-4 border-0 p-0"><TransactionTable rows={recentTransactions.filter((r) => r.type === "Journal Entry")} /></TabsContent>
                </Tabs>
              </CardHeader>
            </Card>

          </div>
        </SidebarInset>
      </AppShell>
    </>
  )
}
