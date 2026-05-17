"use client"

import React from "react"
import Link from "next/link"
import { 
  Plus, 
  FileText, 
  BookOpen, 
  LayoutGrid, 
  ChevronRight, 
  Building2, 
  ShieldCheck, 
  Settings2,
  PieChart,
  Wallet,
  Receipt,
  Users2,
  Clock,
  History,
  Activity,
  ArrowUpRight,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { AppShell } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

interface AccountingModule {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  color: string
  stats?: string
}

interface AccountingClientProps {
  orgSlug: string
  orgName: string
  orgs: { slug: string; name: string }[]
  userName: string
  userEmail: string
  company: { id: string; name: string; currency: string; taxMode: string } | null
  stats: {
    accountCount: number
    openPeriods: number
    draftJournals: number
  }
  recentJournals: Array<{ id: string; voucherNumber: string; date: Date | string; voucherType: string; totalDebit: number | string; status: string }>
  recentActivity: Array<{ id: string; createdAt: Date | string; action: string; resourceName: string | null; resourceType: string; description: string | null; actor: { displayName: string | null; email: string } | null }>
}

export function AccountingClient({
  orgSlug,
  orgName,
  orgs,
  userName,
  userEmail,
  company,
  stats,
  recentJournals,
  recentActivity
}: AccountingClientProps) {
  const modules: AccountingModule[] = [
    {
      id: "journals",
      title: "Journals",
      description: "Manage general ledger entries, adjustments, and vouchers.",
      icon: BookOpen,
      href: `/supna/${orgSlug}/accounting/journals`,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
      stats: `${stats.draftJournals} Pending`
    },
    {
      id: "chart-of-accounts",
      title: "Chart of Accounts",
      description: "Organize your ledger with customized accounts and codes.",
      icon: LayoutGrid,
      href: `/supna/${orgSlug}/accounting/chart-of-accounts`,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
      stats: `${stats.accountCount} Accounts`
    },
    {
      id: "invoices",
      title: "Sales Invoices",
      description: "Create and track customer invoices and payments.",
      icon: FileText,
      href: `/supna/${orgSlug}/accounting/invoices`,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
    },
    {
      id: "bills",
      title: "Purchase Bills",
      description: "Record vendor bills, expenses, and payments.",
      icon: Receipt,
      href: `/supna/${orgSlug}/accounting/bills`,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
    },
    {
      id: "banking",
      title: "Banking",
      description: "Manage bank accounts and reconcile transactions.",
      icon: Wallet,
      href: `/supna/${orgSlug}/accounting/banking`,
      color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20"
    },
    {
      id: "reports",
      title: "Reports",
      description: "Generate Balance Sheet, P&L, and Trial Balance.",
      icon: PieChart,
      href: `/supna/${orgSlug}/accounting/reports`,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20"
    },
    {
      id: "taxation",
      title: "Taxation",
      description: `Manage ${company?.taxMode || "Tax"} returns and registrations.`,
      icon: ShieldCheck,
      href: `/supna/${orgSlug}/accounting/taxation`,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20"
    },
    {
      id: "entities",
      title: "Entities",
      description: "Manage Customers, Vendors, and Employees.",
      icon: Users2,
      href: `/supna/${orgSlug}/accounting/entities`,
      color: "text-slate-600 bg-slate-50 dark:bg-slate-900/20"
    }
  ]

  return (
    <AppShell
      orgSlug={orgSlug}
      orgName={orgName}
      orgs={orgs}
      userName={userName}
      userEmail={userEmail}
      activeHref={`/${orgSlug}/accounting`}
    >
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">Accounting</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-8 p-6 lg:p-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                  <Building2 className="h-4 w-4" />
                  <span>Accounting</span>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-foreground">{company?.name || orgName}</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Accounting Dashboard</h1>
                <p className="text-muted-foreground max-w-2xl">
                  Welcome back, {userName}. Manage your financial records, generate reports, 
                  and stay compliant with professional accounting tools.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button asChild variant="outline" size="sm" className="hidden sm:flex">
                  <Link href={`/supna/${orgSlug}/settings/company`}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-95">
                  <Link href={`/supna/${orgSlug}/accounting/journals/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Journal Entry
                  </Link>
                </Button>
              </div>
            </div>

            {/* No company banner */}
            {!company && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/10 dark:border-amber-900/50">
                <CardContent className="flex gap-4 p-4 items-start">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Company setup incomplete</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      You haven&apos;t configured your company details. Complete your profile to enable all accounting features.
                    </p>
                    <Button asChild variant="link" size="sm" className="p-0 h-auto text-amber-900 dark:text-amber-200 font-semibold">
                      <Link href={`/supna/${orgSlug}/settings/company`}>
                        Complete your company profile →
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Main Content Area */}
              <div className="lg:col-span-8 space-y-8">
                {/* Snapshot Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background border-blue-100 dark:border-blue-900/50 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-blue-600 dark:text-blue-400 font-medium">Chart of Accounts</CardDescription>
                      <CardTitle className="text-3xl">{stats.accountCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Active ledger accounts
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-emerald-600 dark:text-emerald-400 font-medium">Fiscal Status</CardDescription>
                      <CardTitle className="text-3xl">{stats.openPeriods}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Open accounting periods
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background border-amber-100 dark:border-amber-900/50 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-amber-600 dark:text-amber-400 font-medium">Draft Entries</CardDescription>
                      <CardTitle className="text-3xl">{stats.draftJournals}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Awaiting review & posting
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Module Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {modules.map((module) => (
                    <Link key={module.id} href={module.href}>
                      <Card className="group h-full transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 cursor-pointer overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                          <div className={cn("p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110", module.color)}>
                            <module.icon className="h-6 w-6" />
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-xl group-hover:text-primary transition-colors">
                              {module.title}
                            </CardTitle>
                            {module.stats && (
                              <Badge variant="secondary" className="font-normal text-[10px] uppercase tracking-wider py-0 px-1.5 h-4">
                                {module.stats}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {module.description}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Sidebar / Right Column */}
              <div className="lg:col-span-4 space-y-6">
                {/* Quick Actions */}
                <Card className="shadow-md border-primary/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plus className="h-5 w-5 text-primary" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    <Button variant="ghost" className="justify-start h-auto py-3 px-4 flex-col items-start gap-1 hover:bg-primary/5" asChild>
                      <Link href={`/supna/${orgSlug}/accounting/journals/new`}>
                        <BookOpen className="h-4 w-4 text-blue-600 mb-1" />
                        <span className="text-xs font-semibold">New Journal</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start h-auto py-3 px-4 flex-col items-start gap-1 hover:bg-primary/5" asChild>
                      <Link href={`/supna/${orgSlug}/accounting/invoices/new`}>
                        <FileText className="h-4 w-4 text-emerald-600 mb-1" />
                        <span className="text-xs font-semibold">New Invoice</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start h-auto py-3 px-4 flex-col items-start gap-1 hover:bg-primary/5" asChild>
                      <Link href={`/supna/${orgSlug}/accounting/chart-of-accounts/new`}>
                        <LayoutGrid className="h-4 w-4 text-indigo-600 mb-1" />
                        <span className="text-xs font-semibold">Add Account</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start h-auto py-3 px-4 flex-col items-start gap-1 hover:bg-primary/5" asChild>
                      <Link href={`/supna/${orgSlug}/accounting/entities/new?type=customer`}>
                        <Users2 className="h-4 w-4 text-amber-600 mb-1" />
                        <span className="text-xs font-semibold">New Customer</span>
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Journals */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="h-5 w-5 text-muted-foreground" />
                      Recent Journals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {recentJournals.length > 0 ? (
                        recentJournals.map((journal) => (
                          <Link 
                            key={journal.id} 
                            href={`/supna/${orgSlug}/accounting/journals/${journal.id}`}
                            className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">{journal.voucherNumber}</p>
                              <p className="text-xs text-muted-foreground">
                                {journal.date ? format(new Date(journal.date), "MMM d, yyyy") : "No date"} • {journal.voucherType}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">
                                {company?.currency} {Number(journal.totalDebit).toLocaleString()}
                              </p>
                              <Badge 
                                variant={journal.status === "POSTED" ? "default" : "secondary"}
                                className="text-[10px] h-4 py-0"
                              >
                                {journal.status}
                              </Badge>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="p-8 text-center text-sm text-muted-foreground italic">
                          No recent journal entries
                        </div>
                      )}
                    </div>
                    {recentJournals.length > 0 && (
                      <div className="p-3 bg-muted/30 border-t">
                        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground" asChild>
                          <Link href={`/supna/${orgSlug}/accounting/journals`}>
                            View all journals
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Feed */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-muted-foreground" />
                      Activity Feed
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[300px]">
                      <div className="flex flex-col">
                        {recentActivity.length > 0 ? (
                          recentActivity.map((log, index) => (
                            <div key={log.id} className="relative pl-8 pr-4 py-4 hover:bg-muted/30 transition-colors border-b last:border-0">
                              {/* Timeline Connector */}
                              {index !== recentActivity.length - 1 && (
                                <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                              )}
                              {/* Status Dot */}
                              <div className="absolute left-[10px] top-5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary shadow-sm" />
                              
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(log.createdAt), "MMM d, h:mm a")}
                                </p>
                                <p className="text-sm">
                                  <span className="font-semibold">{log.actor?.displayName || log.actor?.email.split('@')[0] || "System"}</span>{" "}
                                  {log.action.toLowerCase().replace(/_/g, " ")}{" "}
                                  <span className="text-muted-foreground">on</span>{" "}
                                  <span className="font-medium text-foreground">{log.resourceName || log.resourceType}</span>
                                </p>
                                {log.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 italic">
                                    &quot;{log.description}&quot;
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-sm text-muted-foreground italic">
                            No recent activity
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </AppShell>
  )
}
