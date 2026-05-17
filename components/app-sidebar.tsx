"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
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
  ReceiptText,
  Building2,
  ChevronsUpDown,
  Check,
  LogOut,
  ListTree,
  ScrollText,
  ChevronRight,
  UserRound,
  Truck,
  ClipboardList,
  Landmark,
  CreditCard,
  RefreshCcw,
  Receipt,
  FileCheck,
  BarChart2,
  CalendarCheck,
  ShieldCheck,
  FileUp,
  KeyRound,
  Webhook,
  Package,
  Boxes,
  Tags,
  Warehouse,
  ScanBarcode,
  Factory,
  ArrowRightLeft,
  Wrench,
  FileCog,
  Component,
  Target,
  Calculator,
  FileDigit,
  GitMerge,
  Store,
  Bell,
  Bot,
  DatabaseZap,
  PackageSearch,
  Settings2,
  Layers,
  ShoppingBag,
  UserCheck,
  CalendarDays,
  PlayCircle,
  FileSpreadsheet,
  ShieldAlert,
  BarChart3,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  useOptionalSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateOrgDialog } from "@/components/create-org-dialog"
import { CopilotButton } from "@/components/ai/copilot-button"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrgItem {
  slug: string
  name: string
}

// ── Nav definitions ───────────────────────────────────────────────────────────

function navMain(orgSlug: string, activeHref: string) {
  return [
    { title: "Dashboard", icon: LayoutDashboard, href: `/${orgSlug}/dashboard` },
    { title: "Clients",   icon: Users,           href: `/${orgSlug}/clients`   },
    { title: "Projects",  icon: FolderOpen,      href: `/${orgSlug}/projects`  },
    { title: "Team",      icon: Building2,       href: `/${orgSlug}/team`      },
  ].map((item) => ({ ...item, active: activeHref.startsWith(item.href) }))
}

const ACCOUNTING_ROOTS = ["accounts", "journals", "sales-invoices", "customers", "vendors", "purchase-bills", "payments", "bank-accounts", "reconciliation", "tax", "reports", "period-close", "audit", "imports", "settings/api-keys", "settings/webhooks", "settings/voucher-types", "tds", "tcs"]
const INVENTORY_ROOTS = ["inventory"]
const PAYROLL_ROOTS = ["payroll"]

function isOnAccountingRoute(orgSlug: string, href: string) {
  return ACCOUNTING_ROOTS.some((r) => href.startsWith(`/${orgSlug}/${r}`)) ||
    href.startsWith(`/${orgSlug}/accounting`)
}

function navAccountingSub(orgSlug: string, activeHref: string) {
  return [
    { title: "Journals",          icon: ScrollText,    href: `/${orgSlug}/journals`        },
    { title: "Chart of Accounts", icon: ListTree,      href: `/${orgSlug}/accounts`        },
    { title: "Sales Invoices",    icon: ReceiptText,   href: `/${orgSlug}/sales-invoices`  },
    { title: "Customers",         icon: UserRound,     href: `/${orgSlug}/customers`       },
    { title: "Purchase Bills",    icon: ClipboardList, href: `/${orgSlug}/purchase-bills`  },
    { title: "Vendors",           icon: Truck,         href: `/${orgSlug}/vendors`         },
    { title: "Payments",          icon: CreditCard,    href: `/${orgSlug}/payments`        },
    { title: "Bank Accounts",     icon: Landmark,      href: `/${orgSlug}/bank-accounts`   },
    { title: "Reconciliation",    icon: RefreshCcw,    href: `/${orgSlug}/reconciliation`  },
    { title: "Tax Settings",      icon: Receipt,       href: `/${orgSlug}/tax/settings`            },
    { title: "Tax Returns",       icon: FileCheck,     href: `/${orgSlug}/tax/returns`             },
    { title: "TDS",               icon: FileDigit,     href: `/${orgSlug}/tds`                     },
    { title: "TCS",               icon: FileDigit,     href: `/${orgSlug}/tcs/entries`             },
    { title: "GSTR Recon",        icon: GitMerge,      href: `/${orgSlug}/tax/gstr-reconciliation` },
    { title: "MSME",              icon: Store,         href: `/${orgSlug}/tax/msme`                },
    { title: "Reports",            icon: BarChart2,     href: `/${orgSlug}/reports`         },
    { title: "Period Close",       icon: CalendarCheck, href: `/${orgSlug}/period-close`        },
    { title: "Audit Log",          icon: ShieldCheck,   href: `/${orgSlug}/audit`               },
    { title: "Imports",            icon: FileUp,        href: `/${orgSlug}/imports`             },
    { title: "Voucher Types",      icon: Layers,        href: `/${orgSlug}/settings/voucher-types` },
    { title: "API Keys",           icon: KeyRound,      href: `/${orgSlug}/settings/api-keys`   },
    { title: "Webhooks",           icon: Webhook,       href: `/${orgSlug}/settings/webhooks`   },
  ].map((item) => ({ ...item, active: activeHref.startsWith(item.href) }))
}

function isOnInventoryRoute(orgSlug: string, href: string) {
  return INVENTORY_ROOTS.some((r) => href.startsWith(`/${orgSlug}/${r}`))
}

function isOnPayrollRoute(orgSlug: string, href: string) {
  return PAYROLL_ROOTS.some((r) => href.startsWith(`/${orgSlug}/${r}`))
}

function navPayrollSub(orgSlug: string, activeHref: string) {
  return [
    { title: "Overview",        icon: LayoutDashboard,  href: `/${orgSlug}/payroll`                   },
    { title: "Employees",       icon: UserCheck,        href: `/${orgSlug}/payroll/employees`         },
    { title: "Attendance",      icon: CalendarDays,     href: `/${orgSlug}/payroll/attendance`        },
    { title: "Payroll Runs",    icon: PlayCircle,       href: `/${orgSlug}/payroll/runs`              },
    { title: "Payslip Register",icon: FileSpreadsheet,  href: `/${orgSlug}/payroll/payslips`          },
    { title: "Statutory (PF)",  icon: ShieldAlert,      href: `/${orgSlug}/payroll/statutory/pf`      },
    { title: "Statutory (ESI)", icon: ShieldAlert,      href: `/${orgSlug}/payroll/statutory/esi`     },
    { title: "Reports",         icon: BarChart3,        href: `/${orgSlug}/payroll/reports`           },
  ].map((item) => ({ ...item, active: activeHref === item.href || activeHref.startsWith(`${item.href}/`) }))
}

function navPhase5(orgSlug: string, activeHref: string) {
  return [
    { title: "Fixed Assets", icon: Building2, href: `/${orgSlug}/fixed-assets` },
    { title: "POS",          icon: Store,     href: `/${orgSlug}/pos`          },
  ].map((item) => ({ ...item, active: activeHref === item.href || activeHref.startsWith(`${item.href}/`) }))
}

const PHASE6_ROOTS = ["beyond-tally", "analytics", "bulk-operations", "settings/custom-fields", "settings/notifications", "settings/consolidation", "settings/exports/tally-xml", "documents/ocr", "integrations/ecommerce"]

function isOnPhase6Route(orgSlug: string, href: string) {
  return PHASE6_ROOTS.some((r) => href.startsWith(`/${orgSlug}/${r}`)) || href.startsWith(`/${orgSlug}/inventory/forecasts`)
}

function navPhase6Sub(orgSlug: string, activeHref: string) {
  return [
    { title: "Overview",      icon: LayoutDashboard, href: `/${orgSlug}/beyond-tally` },
    { title: "Forecasting",   icon: PackageSearch,   href: `/${orgSlug}/inventory/forecasts` },
    { title: "eCommerce",     icon: ShoppingBag,     href: `/${orgSlug}/integrations/ecommerce` },
    { title: "Document AI",   icon: Bot,             href: `/${orgSlug}/documents/ocr` },
    { title: "Notifications", icon: Bell,            href: `/${orgSlug}/settings/notifications` },
    { title: "Consolidation", icon: GitMerge,        href: `/${orgSlug}/settings/consolidation` },
    { title: "Tally XML",     icon: FileText,        href: `/${orgSlug}/settings/exports/tally-xml` },
    { title: "Analytics",     icon: BarChart2,       href: `/${orgSlug}/analytics` },
    { title: "Custom Fields", icon: Settings2,       href: `/${orgSlug}/settings/custom-fields` },
    { title: "Bulk Ops",      icon: DatabaseZap,     href: `/${orgSlug}/bulk-operations` },
  ].map((item) => ({ ...item, active: activeHref === item.href || activeHref.startsWith(`${item.href}/`) }))
}

function navInventorySub(orgSlug: string, activeHref: string) {
  return [
    { title: "Dashboard",      icon: LayoutDashboard, href: `/${orgSlug}/inventory`                },
    { title: "Stock Items",    icon: Package,         href: `/${orgSlug}/inventory/stock-items`    },
    { title: "Stock Groups",   icon: Boxes,           href: `/${orgSlug}/inventory/stock-groups`   },
    { title: "Stock Units",    icon: Tags,            href: `/${orgSlug}/inventory/stock-units`    },
    { title: "Categories",     icon: Tags,            href: `/${orgSlug}/inventory/stock-categories` },
    { title: "Godowns",        icon: Warehouse,       href: `/${orgSlug}/inventory/godowns`        },
    { title: "Batches",        icon: ScanBarcode,     href: `/${orgSlug}/inventory/batches`        },
    { title: "Price Lists",    icon: Tags,            href: `/${orgSlug}/inventory/price-lists`    },
    { title: "Stock Vouchers", icon: ReceiptText,     href: `/${orgSlug}/inventory/stock-vouchers` },
    { title: "BOM",            icon: FileCog,         href: `/${orgSlug}/inventory/bom`            },
    { title: "Manufacturing",  icon: Factory,         href: `/${orgSlug}/inventory/manufacturing`  },
    { title: "Job Work",       icon: Wrench,          href: `/${orgSlug}/inventory/job-work`       },
    { title: "Transfers",      icon: ArrowRightLeft,  href: `/${orgSlug}/inventory/inter-company-transfers` },
    { title: "Forecasts",      icon: PackageSearch,   href: `/${orgSlug}/inventory/forecasts`      },
    { title: "Reports",        icon: BarChart2,       href: `/${orgSlug}/inventory/reports`        },
  ].map((item) => ({ ...item, active: activeHref === item.href || activeHref.startsWith(`${item.href}/`) }))
}

function navDocuments(orgSlug: string) {
  return [
    { title: "Reports",   icon: FileText, href: `/${orgSlug}/reports`   },
    { title: "Documents", icon: FileText, href: `/${orgSlug}/documents` },
  ]
}

// ── Org switcher ──────────────────────────────────────────────────────────────

const FINANCE_ROOTS = ["cost-centres", "budgets", "cheques", "interest"]

function isOnFinanceRoute(orgSlug: string, href: string) {
  return FINANCE_ROOTS.some((r) => href.startsWith(`/${orgSlug}/${r}`)) || href.startsWith(`/${orgSlug}/finance`)
}

function navFinanceSub(orgSlug: string, activeHref: string) {
  return [
    { title: "Cost Centres",    icon: Component,       href: `/${orgSlug}/cost-centres` },
    { title: "Budgets",         icon: Target,          href: `/${orgSlug}/budgets` },
    { title: "Cheque Register", icon: Landmark,        href: `/${orgSlug}/cheques` },
    { title: "Interest Rules",  icon: Calculator,      href: `/${orgSlug}/interest` },
  ].map((item) => ({ ...item, active: activeHref === item.href || activeHref.startsWith(`${item.href}/`) }))
}

function OrgSwitcher({
  currentSlug,
  currentName,
  orgs,
}: {
  currentSlug: string
  currentName: string
  orgs: OrgItem[]
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
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">
                  {currentName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col gap-0.5 leading-none min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold truncate text-sm">{currentName}</span>
                  <span className="text-[0.65rem] text-muted-foreground truncate">Free plan</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-60 group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 rounded-xl" align="start" side="bottom" sideOffset={4}>
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
                  {org.slug === currentSlug && <Check className="size-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); setDialogOpen(true) }}
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

export function AppSidebar({
  orgSlug,
  orgName,
  orgs,
  userName,
  userEmail,
  activeHref,
}: {
  orgSlug: string
  orgName: string
  orgs: OrgItem[]
  userName?: string
  userEmail?: string
  activeHref?: string
}) {
  const { update } = useSession()
  const pathname = usePathname()
  const currentHref = activeHref ?? pathname ?? ""

  const onAccounting = isOnAccountingRoute(orgSlug, currentHref)
  const onInventory  = isOnInventoryRoute(orgSlug, currentHref)
  const onPayroll    = isOnPayrollRoute(orgSlug, currentHref)
  const onPhase6     = isOnPhase6Route(orgSlug, currentHref)
  const [accountingOpen, setAccountingOpen] = useState(onAccounting)
  const [inventoryOpen, setInventoryOpen] = useState(onInventory)
  const [payrollOpen, setPayrollOpen] = useState(onPayroll)
  const [phase6Open, setPhase6Open] = useState(onPhase6)

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

  const mainNav      = navMain(orgSlug, currentHref)
  const subNav       = navAccountingSub(orgSlug, currentHref)
  const inventoryNav = navInventorySub(orgSlug, currentHref)
  const payrollNav   = navPayrollSub(orgSlug, currentHref)
  const phase5Nav    = navPhase5(orgSlug, currentHref)
  const phase6Nav    = navPhase6Sub(orgSlug, currentHref)
  const docsNav      = navDocuments(orgSlug)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-2">
        <OrgSwitcher currentSlug={orgSlug} currentName={orgName} orgs={orgs} />

        <div className="flex items-center gap-1.5 px-1 group-data-[collapsible=icon]:hidden">
          <Button size="sm" className="flex-1 justify-start gap-1.5 h-8">
            <Plus className="size-3.5 shrink-0" />
            Quick Create
          </Button>
          <Button size="icon" variant="outline" className="size-8 shrink-0" title="Inbox">
            <Mail className="size-3.5" />
          </Button>
        </div>

        <div className="hidden px-1 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <Button size="icon" variant="outline" className="size-8" title="Quick Create">
            <Plus className="size-3.5" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.active} tooltip={item.title}>
                    <a href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Accounting — collapsible with sub-links */}
              <Collapsible
                open={accountingOpen}
                onOpenChange={setAccountingOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Accounting"
                      isActive={onAccounting && !accountingOpen}
                    >
                      <BookOpen />
                      <span>Accounting</span>
                      <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {subNav.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={item.active}>
                            <a href={item.href}>
                              <item.icon className="size-3.5" />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Inventory — collapsible with sub-links */}
              <Collapsible
                open={inventoryOpen}
                onOpenChange={setInventoryOpen}
                className="group/inventory-collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Inventory"
                      isActive={onInventory && !inventoryOpen}
                    >
                      <Package />
                      <span>Inventory</span>
                      <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/inventory-collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {inventoryNav.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={item.active}>
                            <a href={item.href}>
                              <item.icon className="size-3.5" />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Payroll — collapsible with sub-links */}
              <Collapsible open={payrollOpen} onOpenChange={setPayrollOpen} className="group/payroll-collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Payroll" isActive={onPayroll && !payrollOpen}>
                      <Users />
                      <span>Payroll</span>
                      <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/payroll-collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {payrollNav.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={item.active}>
                            <a href={item.href}>
                              <item.icon className="size-3.5" />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {phase5Nav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.active} tooltip={item.title}>
                    <a href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <Collapsible open={phase6Open} onOpenChange={setPhase6Open} className="group/phase6-collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Beyond Tally" isActive={onPhase6 && !phase6Open}>
                      <DatabaseZap />
                      <span>Beyond Tally</span>
                      <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/phase6-collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {phase6Nav.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={item.active}>
                            <a href={item.href}>
                              <item.icon className="size-3.5" />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Finance */}
        <SidebarGroup>
          <SidebarGroupLabel>Finance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen={isOnFinanceRoute(orgSlug, pathname)} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Finance">
                      <Landmark />
                      <span>Finance</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {navFinanceSub(orgSlug, pathname).map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={item.active}>
                            <a href={item.href}>
                              <item.icon />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Documents */}
        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {docsNav.map((item) => (
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          {[
            { title: "Settings", icon: Settings,   href: `/${orgSlug}/settings/company` },
            { title: "Get Help", icon: HelpCircle, href: "/docs"                        },
            { title: "Search",   icon: Search,     href: "#"                            },
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
                  <a href={`/${orgSlug}/settings/company`}>
                    <Settings className="size-4" />
                    Organisation settings
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
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

// ── AppShell — wraps any org page with sidebar + inset ────────────────────────

export function AppShell({
  orgSlug,
  orgName,
  orgs,
  userName,
  userEmail,
  activeHref,
  defaultOpen,
  children,
}: {
  orgSlug: string
  orgName: string
  orgs: OrgItem[]
  userName?: string
  userEmail?: string
  activeHref?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const existingSidebar = useOptionalSidebar()

  if (existingSidebar) {
    return <>{children}</>
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        orgSlug={orgSlug}
        orgName={orgName}
        orgs={orgs}
        userName={userName}
        userEmail={userEmail}
        activeHref={activeHref}
      />
      {children}
      <CopilotButton orgSlug={orgSlug} />
    </SidebarProvider>
  )
}
