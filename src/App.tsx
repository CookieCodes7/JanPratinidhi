import { type ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Link, Router as WouterRouter, useLocation } from "wouter";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  CircleHelp,
  ClipboardList,
  CloudSun,
  Database,
  ExternalLink,
  Eye,
  FileCheck2,
  Home,
  Info,
  LayoutDashboard,
  Landmark,
  Library,
  ListFilter,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  ThumbsUp,
  UserRound,
  Users,
  X,
  Zap,
  GitCompareArrows,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  attendanceTrend,
  auditEntries,
  feedback,
  issues,
  projects,
  questions,
  representatives,
  sources,
  type Representative,
} from "./data";

const queryClient = new QueryClient();

type IconType = typeof Home;

type PageProps = {
  onPai: () => void;
  onSource: (source: typeof sources[number]) => void;
  onQuestion: (question: typeof questions[number]) => void;
};

type ApiDashboard = {
  mode: string;
  available: boolean;
  last_synced_at: string | null;
  message: string;
  metrics: {
    pai: number | null;
    attendance: number | null;
    questions: number;
    active_issues: number;
    debates: number;
    bills: number;
  };
  sessions: {
    session: string;
    attendance: number | null;
    questions: number;
    participation: number | null;
  }[];
};

const apiGet = async <T,>(path: string): Promise<T> => {
  try {
    const response = await fetch(`/api/${path}`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch {
    if (path.startsWith("dashboard")) {
      return {
        mode: "demo",
        available: true,
        last_synced_at: null,
        message:
          "Demo records are shown for product exploration. They are not verified public facts.",
        metrics: {
          pai: 78,
          attendance: 86,
          questions: 491,
          active_issues: issues.filter(
            (i) => i.status !== "Reported"
          ).length,
          debates: 178,
          bills: 51,
        },
        sessions: attendanceTrend.map((s) => ({
          session: s.session,
          attendance: s.attendance,
          questions: s.questions,
          participation: s.participation,
        })),
      } as T;
    }

    if (path.startsWith("location/resolve")) {
      return {
        status: "unavailable",
        confidence: "not available",
        message:
          "PIN-to-constituency lookup is not connected in the standalone demo yet.",
        location: {
          state: null,
          district: null,
          city: null,
          pincode: path.split("pincode=")[1] ?? null,
        },
        parliamentary_constituencies: [],
        assembly_constituencies: [],
      } as T;
    }

    throw new Error("Local API unavailable");
  }
};

type NavItem = [string, string, IconType];

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Explore",
    items: [
      ["Dashboard", "/dashboard", LayoutDashboard],
      ["Representatives", "/representatives", Users],
      ["Find my representatives", "/find-representatives", MapPin],
      ["Questions", "/questions", CircleHelp],
      ["Constituency issues", "/issues", MapPin],
      ["Development tracker", "/tracker", ClipboardList],
      ["Analytics", "/analytics", BarChart3],
    ],
  },
  {
    label: "Compare & contribute",
    items: [
      ["Compare representatives", "/compare", GitCompareArrows],
      ["Citizen feedback", "/feedback", MessageSquareText],
    ],
  },
  {
    label: "Trust & governance",
    items: [
      ["Data sources", "/sources", Database],
      ["Admin / data management", "/admin", Settings],
      ["Audit log", "/audit", FileCheck2],
      ["About JanPratinidhi", "/about", Info],
      ["Settings", "/settings", Settings],
    ],
  },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      data-testid="link-logo"
      className={`flex items-center gap-3 ${
        compact ? "justify-center" : ""
      }`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground shadow-sm">
        <Landmark size={19} strokeWidth={2.5} />
      </span>

      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[21px] font-semibold tracking-[-.03em]">
            JanPratinidhi
          </span>

          <span className="mt-1 block font-mono-ui text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/60">
            public record / demo
          </span>
        </span>
      )}
    </Link>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "teal" | "saffron" | "red" | "purple";
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    teal: "bg-primary/10 text-primary",
    saffron: "bg-accent/20 text-foreground",
    red: "bg-destructive/10 text-destructive",
    purple:
      "bg-[#6d5b83]/15 text-[#6d5b83] dark:text-[#c4b3d9]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Button({
  children,
  variant = "primary",
  onClick,
  className = "",
  disabled = false,
  testId,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  testId: string;
}) {
  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:brightness-110",
    secondary:
      "bg-accent text-accent-foreground hover:brightness-105",
    ghost:
      "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
    outline:
      "border border-border bg-card text-foreground hover:border-primary hover:text-primary",
    danger:
      "bg-destructive text-destructive-foreground hover:brightness-110",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function SectionHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <div className="mb-2 font-mono-ui text-[10px] font-medium uppercase tracking-[.2em] text-primary">
            {eyebrow}
          </div>
        )}

        <h2 className="font-display text-[30px] leading-none tracking-[-.025em] text-foreground">
          {title}
        </h2>

        {detail && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {detail}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

function Card({
  children,
  className = "",
  testId,
}: {
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      className={`rounded-xl border border-card-border bg-card civic-shadow ${className}`}
    >
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  accent = "teal",
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: "teal" | "saffron" | "red";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}
      className="group min-w-0 text-left"
    >
      <Card className="relative overflow-hidden p-5 transition-transform group-hover:-translate-y-0.5">
        <span
          className={`absolute left-0 top-0 h-full w-1 ${
            accent === "saffron"
              ? "bg-accent"
              : accent === "red"
              ? "bg-destructive"
              : "bg-primary"
          }`}
        />

        <div className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground">
          {label}
        </div>

        <div className="mt-3 font-display text-[34px] leading-none">
          {value}
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          {detail}
        </div>
      </Card>
    </button>
  );
}

function Shell({
  children,
  theme,
  setTheme,
  loggedIn,
  setLoggedIn,
}: {
  children: ReactNode;
  theme: boolean;
  setTheme: (v: boolean) => void;
  loggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
}) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const current =
    navGroups
      .flatMap((g) => g.items)
      .find((item) => item[1] === location)?.[0] ||
    "Dashboard";

  return (
    <div className="app-noise flex min-h-[100dvh] bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[72px] items-center border-b border-sidebar-border px-5">
          <Logo />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-7">
              <div className="mb-2 px-3 font-mono-ui text-[9px] font-bold uppercase tracking-[.18em] text-sidebar-foreground/45">
                {group.label}
              </div>

              <nav className="space-y-1">
                {group.items.map(([label, href, Icon]) => {
                  const active = location === href;

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      data-testid={`nav-${label
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon size={17} />

                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent/50 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-primary" />

              <span className="font-mono-ui text-[9px] font-bold uppercase tracking-[.12em]">
                Data mode
              </span>
            </div>

            <p className="mt-2 text-[11px] leading-5 text-sidebar-foreground/55">
              Demo records are clearly labelled. Source records remain the
              authority.
            </p>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-border lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>

            <div>
              <div className="font-mono-ui text-[9px] uppercase tracking-[.16em] text-muted-foreground">
                JanPratinidhi
              </div>

              <div className="mt-0.5 font-display text-xl">
                {current}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(!theme)}
              data-testid="button-toggle-theme"
              aria-label={
                theme
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              title={
                theme
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              className="relative grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary hover:text-primary"
            >
              {theme ? (
                <Sun size={17} />
              ) : (
                <Moon size={17} />
              )}
            </button>

            <Link
              href="/settings"
              className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary hover:text-primary"
              aria-label="Settings"
            >
              <Settings size={17} />
            </Link>

            <button
              type="button"
              onClick={() => setLoggedIn(!loggedIn)}
              className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold sm:flex"
            >
              {loggedIn ? (
                <>
                  <LogOut size={15} />
                  Sign out
                </>
              ) : (
                <>
                  <LogIn size={15} />
                  Sign in
                </>
              )}
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-4 py-7 md:px-7 lg:px-9">
          {children}
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   LANDING PAGE
   ========================================================= */

function Landing({
  onSource,
  theme,
  setTheme,
}: {
  onSource: (source: typeof sources[number]) => void;
  theme: boolean;
  setTheme: (v: boolean) => void;
}) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-5 md:px-8">
          <Logo />

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setLocation("/about")}
              testId="button-landing-about"
            >
              About
            </Button>

            {/* LANDING PAGE THEME SWITCH */}
            <button
              type="button"
              onClick={() => setTheme(!theme)}
              data-testid="button-landing-toggle-theme"
              aria-label={
                theme
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              title={
                theme
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary hover:text-primary"
            >
              {theme ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <Button
              onClick={() => setLocation("/dashboard")}
              variant="outline"
              testId="button-landing-enter"
            >
              Open workspace <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 opacity-[.05]">
            <div className="absolute inset-0 bg-[url('/parliament.jpg')] bg-cover bg-center" />
          </div>

          <div className="relative mx-auto grid min-h-[680px] max-w-[1400px] items-center px-5 py-20 md:px-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-12">
            <div>
              <Badge tone="saffron">
                Citizen transparency platform
              </Badge>

              <h1 className="mt-6 max-w-4xl font-display text-5xl leading-[.95] tracking-[-.04em] md:text-7xl">
                Understand your
                <span className="block text-primary">
                  representatives.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                JanPratinidhi brings parliamentary activity, constituency
                issues, development projects and public records into one
                citizen-friendly workspace.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  onClick={() => setLocation("/dashboard")}
                  testId="button-hero-dashboard"
                >
                  Explore dashboard
                  <ArrowRight size={16} />
                </Button>

                <Button
                  onClick={() => setLocation("/representatives")}
                  variant="outline"
                  testId="button-hero-representatives"
                >
                  Browse representatives
                  <Users size={16} />
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-primary" />
                  Source-aware records
                </div>

                <div className="flex items-center gap-2">
                  <Eye size={15} className="text-primary" />
                  Transparent indicators
                </div>

                <div className="flex items-center gap-2">
                  <Users size={15} className="text-primary" />
                  Citizen-first design
                </div>
              </div>
            </div>

            <div className="relative">
              <Card className="overflow-hidden">
                <div className="border-b border-border bg-muted/50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono-ui text-[9px] uppercase tracking-[.16em] text-muted-foreground">
                        Demo snapshot
                      </div>

                      <div className="mt-1 font-display text-2xl">
                        Parliamentary activity
                      </div>
                    </div>

                    <Badge tone="teal">Demo</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-border">
                  <div className="bg-card p-5">
                    <div className="text-xs text-muted-foreground">
                      PAI
                    </div>

                    <div className="mt-2 font-display text-4xl text-primary">
                      78
                    </div>

                    <div className="mt-1 text-[11px] text-muted-foreground">
                      transparent composite
                    </div>
                  </div>

                  <div className="bg-card p-5">
                    <div className="text-xs text-muted-foreground">
                      Attendance
                    </div>

                    <div className="mt-2 font-display text-4xl">
                      86%
                    </div>

                    <div className="mt-1 text-[11px] text-muted-foreground">
                      recorded sittings
                    </div>
                  </div>

                  <div className="bg-card p-5">
                    <div className="text-xs text-muted-foreground">
                      Questions
                    </div>

                    <div className="mt-2 font-display text-4xl">
                      491
                    </div>

                    <div className="mt-1 text-[11px] text-muted-foreground">
                      recorded questions
                    </div>
                  </div>

                  <div className="bg-card p-5">
                    <div className="text-xs text-muted-foreground">
                      Issues
                    </div>

                    <div className="mt-2 font-display text-4xl">
                      {issues.filter(
                        (i) => i.status !== "Reported"
                      ).length}
                    </div>

                    <div className="mt-1 text-[11px] text-muted-foreground">
                      active records
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono-ui text-[9px] uppercase tracking-[.16em] text-muted-foreground">
                      Session trend
                    </span>

                    <Activity size={16} className="text-primary" />
                  </div>

                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={attendanceTrend}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          opacity={0.2}
                        />

                        <XAxis
                          dataKey="session"
                          tickLine={false}
                          axisLine={false}
                          fontSize={10}
                        />

                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          fontSize={10}
                          width={30}
                        />

                        <ChartTooltip />

                        <Area
                          type="monotone"
                          dataKey="attendance"
                          fill="currentColor"
                          stroke="currentColor"
                          fillOpacity={0.08}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-5 py-20 md:px-8">
          <SectionHeading
            eyebrow="What you can explore"
            title="One workspace. Multiple public records."
            detail="Move from a representative profile to questions, constituency issues, development work and source records without losing context."
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Representative profiles",
                "Attendance, questions, participation and constituency context.",
                Users,
              ],
              [
                "Constituency issues",
                "Track reported civic problems, status and responsible authorities.",
                MapPin,
              ],
              [
                "Development tracker",
                "Follow public projects, stages and available progress information.",
                ClipboardList,
              ],
              [
                "Data provenance",
                "See where records come from and distinguish demo data from verified sources.",
                Database,
              ],
            ].map(([title, text, Icon]) => (
              <Card
                key={title as string}
                className="p-5 transition-transform hover:-translate-y-1"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  {(() => {
                    const I = Icon as IconType;
                    return <I size={19} />;
                  })()}
                </div>

                <h3 className="mt-5 font-display text-xl">
                  {title as string}
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {text as string}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-20 md:px-8 lg:grid-cols-2">
            <div>
              <Badge tone="teal">Methodology first</Badge>

              <h2 className="mt-5 max-w-xl font-display text-4xl leading-tight md:text-5xl">
                Indicators should explain the record, not replace it.
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                JanPratinidhi presents measurable signals such as attendance,
                questions and participation. Composite indicators are
                descriptive tools and should never be treated as an absolute
                judgment of a representative.
              </p>

              <Button
                onClick={() => setLocation("/about")}
                variant="outline"
                className="mt-6"
                testId="button-landing-methodology"
              >
                Read methodology
                <ArrowRight size={15} />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="p-5">
                <ShieldCheck className="text-primary" size={20} />

                <h3 className="mt-4 font-display text-xl">
                  Source-aware
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Public records should remain traceable to their source.
                </p>
              </Card>

              <Card className="p-5">
                <Eye className="text-primary" size={20} />

                <h3 className="mt-4 font-display text-xl">
                  Transparent
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Indicators show how the record is being summarized.
                </p>
              </Card>

              <Card className="p-5">
                <Users className="text-primary" size={20} />

                <h3 className="mt-4 font-display text-xl">
                  Citizen-focused
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Information is organized around questions citizens
                  actually ask.
                </p>
              </Card>

              <Card className="p-5">
                <Database className="text-primary" size={20} />

                <h3 className="mt-4 font-display text-xl">
                  Data-conscious
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Demo records are explicitly distinguished from verified
                  public data.
                </p>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-5 py-20 md:px-8">
          <SectionHeading
            eyebrow="Data sources"
            title="Follow the record back to its source."
            detail="The source registry makes it clear what a record represents, where it comes from and what coverage is available in the current demo."
            action={
              <Button
                onClick={() => setLocation("/sources")}
                variant="outline"
                testId="button-landing-sources"
              >
                View all sources
                <ArrowRight size={15} />
              </Button>
            }
          />

          <div className="grid gap-4 md:grid-cols-3">
            {sources.slice(0, 3).map((source) => (
              <button
                key={source.name}
                type="button"
                onClick={() => onSource(source)}
                className="text-left"
              >
                <Card className="h-full p-5 transition-transform hover:-translate-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Database size={18} />
                    </div>

                    <Badge
                      tone={
                        source.status === "Verified"
                          ? "teal"
                          : "saffron"
                      }
                    >
                      {source.status}
                    </Badge>
                  </div>

                  <h3 className="mt-5 font-display text-xl">
                    {source.name}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {source.coverage}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-primary">
                    Inspect source
                    <ArrowRight size={14} />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-5 py-7 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            © 2026 JanPratinidhi — public record / demo
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setLocation("/about")}
              className="hover:text-foreground"
            >
              About
            </button>

            <button
              type="button"
              onClick={() => setLocation("/sources")}
              className="hover:text-foreground"
            >
              Sources
            </button>

            <button
              type="button"
              onClick={() => setLocation("/dashboard")}
              className="hover:text-foreground"
            >
              Workspace
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* =========================================================
   MODAL
   ========================================================= */

function Modal({
  title,
  children,
  onClose,
  testId,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  testId: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      data-testid={testId}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function Dashboard({
  onPai,
  onSource,
  onQuestion,
}: PageProps) {
  const dashboard = useQuery<ApiDashboard>({
    queryKey: ["/api/dashboard"],
    queryFn: () => apiGet<ApiDashboard>("dashboard"),
  });

  const data = dashboard.data;

  return (
    <div>
      <SectionHeading
        eyebrow="Citizen overview"
        title="Parliamentary activity dashboard"
        detail="A compact view of representative activity, constituency records and public-data coverage."
        action={
          <Badge tone="saffron">
            {data?.mode === "demo" ? "Demo data" : "Connected"}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="PAI"
          value={data?.metrics.pai != null ? `${data.metrics.pai}` : "—"}
          detail="Transparent composite indicator"
          onClick={onPai}
        />

        <Metric
          label="Attendance"
          value={
            data?.metrics.attendance != null
              ? `${data.metrics.attendance}%`
              : "—"
          }
          detail="Recorded parliamentary sittings"
          accent="saffron"
        />

        <Metric
          label="Questions"
          value={`${data?.metrics.questions ?? "—"}`}
          detail="Questions in the current record"
        />

        <Metric
          label="Active issues"
          value={`${data?.metrics.active_issues ?? "—"}`}
          detail="Constituency issue records"
          accent="red"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.55fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground">
                Session trend
              </div>

              <h3 className="mt-1 font-display text-2xl">
                Attendance & participation
              </h3>
            </div>

            <Activity size={19} className="text-primary" />
          </div>

          <div className="mt-5 h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={
                  data?.sessions ?? attendanceTrend
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.2}
                />

                <XAxis
                  dataKey="session"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />

                <ChartTooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={false}
                  name="Attendance"
                />

                <Line
                  type="monotone"
                  dataKey="participation"
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={false}
                  name="Participation"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground">
            Parliamentary output
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Questions</span>
                <strong>{data?.metrics.questions ?? 491}</strong>
              </div>

              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: "72%" }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Debates</span>
                <strong>{data?.metrics.debates ?? 178}</strong>
              </div>

              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: "54%" }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Bills & committees</span>
                <strong>{data?.metrics.bills ?? 51}</strong>
              </div>

              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-destructive"
                  style={{ width: "31%" }}
                />
              </div>
            </div>
          </div>

          <div className="mt-7 rounded-lg bg-muted p-4 text-xs leading-5 text-muted-foreground">
            These numbers are descriptive indicators. They should be
            interpreted alongside source records and context.
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeading
            eyebrow="Latest questions"
            title="Parliamentary questions"
            detail="Recent records available in the demo dataset."
            action={
              <Link
                href="/questions"
                className="text-xs font-semibold text-primary"
              >
                View all →
              </Link>
            }
          />

          <div className="space-y-2">
            {questions.slice(0, 4).map((question) => (
              <button
                key={question.number}
                type="button"
                onClick={() => onQuestion(question)}
                className="w-full rounded-lg border border-border p-4 text-left transition-colors hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono-ui text-[10px] text-primary">
                      {question.number}
                    </div>

                    <div className="mt-1 font-semibold">
                      {question.title}
                    </div>
                  </div>

                  <Badge
                    tone={
                      question.status === "Answered"
                        ? "teal"
                        : "saffron"
                    }
                  >
                    {question.status}
                  </Badge>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  {question.rep} · {question.constituency}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading
            eyebrow="Constituency"
            title="Issue tracker"
            detail="Current issue records grouped by status."
            action={
              <Link
                href="/issues"
                className="text-xs font-semibold text-primary"
              >
                View all →
              </Link>
            }
          />

          <div className="space-y-3">
            {issues.slice(0, 5).map((issue) => (
              <div
                key={issue.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-sm">
                    {issue.title}
                  </span>

                  <Badge
                    tone={
                      issue.status === "Resolved"
                        ? "teal"
                        : issue.status === "Reported"
                        ? "red"
                        : "saffron"
                    }
                  >
                    {issue.status}
                  </Badge>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  {issue.category} · {issue.constituency}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================
   DIRECTORY
   ========================================================= */

function Directory() {
  const [search, setSearch] = useState("");

  const filtered = representatives.filter((rep) => {
    const q = search.toLowerCase();

    return (
      rep.name.toLowerCase().includes(q) ||
      rep.constituency.toLowerCase().includes(q) ||
      rep.state.toLowerCase().includes(q) ||
      rep.party.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <SectionHeading
        eyebrow="Representatives"
        title="Browse representatives"
        detail="Search the demo directory by representative, constituency, state or party."
      />

      <div className="mb-6">
        <div className="relative max-w-xl">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search representatives..."
            className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No representatives found"
            text="Try a different name, state, constituency or party."
            onReset={() => setSearch("")}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((rep) => (
            <RepresentativeCard
              key={rep.id}
              rep={rep}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RepresentativeCard({
  rep,
}: {
  rep: Representative;
}) {
  const [, setLocation] = useLocation();

  return (
    <button
      type="button"
      onClick={() =>
        setLocation(`/representatives/${rep.id}`)
      }
      className="text-left"
    >
      <Card className="h-full p-5 transition-transform hover:-translate-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
            <UserRound size={22} />
          </div>

          <Badge tone="teal">{rep.house}</Badge>
        </div>

        <h3 className="mt-5 font-display text-2xl">
          {rep.name}
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          {rep.party}
        </p>

        <div className="mt-5 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-primary" />
            {rep.constituency}, {rep.state}
          </div>

          <div className="flex items-center gap-2">
            <Activity size={14} className="text-primary" />
            Attendance: {rep.attendance}%
          </div>

          <div className="flex items-center gap-2">
            <CircleHelp size={14} className="text-primary" />
            Questions: {rep.questions}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-primary">
          View record
          <ArrowRight size={14} />
        </div>
      </Card>
    </button>
  );
}

/* =========================================================
   SETTINGS
   ========================================================= */

function SettingsPage({
  theme,
  setTheme,
  loggedIn,
  setLoggedIn,
}: {
  theme: boolean;
  setTheme: (v: boolean) => void;
  loggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
}) {
  return (
    <div>
      <SectionHeading
        eyebrow="Preferences"
        title="Settings"
        detail="Control your workspace preferences."
      />

      <div className="max-w-3xl space-y-5">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-5">
            <div>
              <h3 className="font-display text-2xl">
                Appearance
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Switch between light and dark mode.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setTheme(!theme)}
              data-testid="button-settings-toggle-theme"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold"
            >
              {theme ? (
                <>
                  <Sun size={16} />
                  Light mode
                </>
              ) : (
                <>
                  <Moon size={16} />
                  Dark mode
                </>
              )}
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-5">
            <div>
              <h3 className="font-display text-2xl">
                Account
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Demo authentication state for the prototype.
              </p>
            </div>

            <Button
              onClick={() => setLoggedIn(!loggedIn)}
              variant={loggedIn ? "danger" : "outline"}
              testId="button-settings-login"
            >
              {loggedIn ? (
                <>
                  <LogOut size={15} />
                  Sign out
                </>
              ) : (
                <>
                  <LogIn size={15} />
                  Sign in
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Database size={18} className="text-primary" />

            <div>
              <h3 className="font-display text-2xl">
                Data mode
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                The current standalone prototype uses clearly labelled
                demonstration records.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-muted p-4 text-xs leading-6 text-muted-foreground">
            Public source integration should be added only when the relevant
            government/public data source is actually connected and verified.
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            variant="primary"
            testId="button-save-settings"
          >
            <Check size={15} />
            Save preferences
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
   ========================================================= */

function EmptyState({
  title,
  text,
  onReset,
  compact = false,
}: {
  title: string;
  text: string;
  onReset?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      data-testid="empty-state"
      className={`grid place-items-center text-center ${
        compact ? "p-12" : "min-h-64 p-10"
      }`}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <ListFilter size={20} />
      </div>

      <h3 className="mt-4 font-display text-2xl">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {text}
      </p>

      {onReset && (
        <Button
          onClick={onReset}
          variant="outline"
          className="mt-5"
          testId="button-empty-reset"
        >
          Reset filters
        </Button>
      )}
    </div>
  );
}

/* =========================================================
   PAI MODAL
   ========================================================= */

function PaiModal({ onClose }: { onClose: () => void }) {
  const parts = [
    [
      "Presence",
      "31 / 40",
      "Attendance across recorded sittings",
    ],
    [
      "Questions",
      "20 / 25",
      "Questions recorded in the session",
    ],
    [
      "Debate participation",
      "15 / 20",
      "Debate interventions recorded",
    ],
    [
      "Bills & committees",
      "12 / 15",
      "Bills and committee activity",
    ],
  ];

  return (
    <Modal
      title="Parliamentary Activity Index"
      onClose={onClose}
      testId="dialog-pai"
    >
      <div className="flex items-end gap-4 rounded-xl bg-primary/5 p-5">
        <div className="font-display text-6xl text-primary">
          78
        </div>

        <div className="pb-2 font-mono-ui text-xs text-muted-foreground">
          / 100
          <br />
          composite signal
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-muted-foreground">
        PAI is a transparent descriptive composite designed to help scan a
        public record. It is not a rating, quality assessment or prediction.
      </p>

      <div className="mt-6 space-y-4">
        {parts.map(([label, score, desc]) => (
          <div key={label}>
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>{label}</span>

              <span className="font-mono-ui text-xs text-primary">
                {score}
              </span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {desc}
            </p>

            <div className="mt-2 h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${
                    (Number(score.split(" / ")[0]) /
                      Number(score.split(" / ")[1])) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
        <Info size={14} className="text-accent" />
        Component scores are rounded. Source records remain the authority.
      </div>
    </Modal>
  );
}

/* =========================================================
   APP ROUTER
   ========================================================= */

function AppRouter({
  theme,
  setTheme,
  loggedIn,
  setLoggedIn,
}: {
  theme: boolean;
  setTheme: (v: boolean) => void;
  loggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
}) {
  const [location, setLocation] = useLocation();

  const [paiOpen, setPaiOpen] = useState(false);

  const [source, setSource] =
    useState<typeof sources[number] | null>(null);

  const [question, setQuestion] =
    useState<typeof questions[number] | null>(null);

  const path = location.split("?")[0];

  let page: ReactNode;

  if (path === "/") {
    page = (
      <Landing
        onSource={setSource}
        theme={theme}
        setTheme={setTheme}
      />
    );
  } else if (path === "/dashboard") {
    page = (
      <Dashboard
        onPai={() => setPaiOpen(true)}
        onSource={setSource}
        onQuestion={setQuestion}
      />
    );
  } else if (path === "/representatives") {
    page = <Directory />;
  } else if (path === "/settings") {
    page = (
      <SettingsPage
        theme={theme}
        setTheme={setTheme}
        loggedIn={loggedIn}
        setLoggedIn={setLoggedIn}
      />
    );
  } else {
    page = (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div>
          <h1 className="font-display text-5xl">
            Record not found
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            This route is not part of the demo workspace.
          </p>

          <Button
            onClick={() => setLocation("/")}
            className="mt-6"
            testId="button-not-found-home"
          >
            Return home
          </Button>
        </div>
      </div>
    );
  }

  const internal = path !== "/";

  const content = internal ? (
    <Shell
      theme={theme}
      setTheme={setTheme}
      loggedIn={loggedIn}
      setLoggedIn={setLoggedIn}
    >
      {page}
    </Shell>
  ) : (
    page
  );

  return (
    <>
      {content}

      {paiOpen && (
        <PaiModal onClose={() => setPaiOpen(false)} />
      )}

      {source && (
        <Modal
          title={source.name}
          onClose={() => setSource(null)}
          testId="dialog-source"
        >
          <div className="flex items-center gap-2">
            <Badge
              tone={
                source.status === "Verified"
                  ? "teal"
                  : "saffron"
              }
            >
              {source.status}
            </Badge>

            <span className="font-mono-ui text-[10px] text-muted-foreground">
              {source.url}
            </span>
          </div>

          <div className="mt-6 space-y-4 text-sm">
            <div>
              <div className="font-mono-ui text-[10px] uppercase text-muted-foreground">
                Record type
              </div>

              <div className="mt-1">{source.type}</div>
            </div>

            <div>
              <div className="font-mono-ui text-[10px] uppercase text-muted-foreground">
                Coverage in this demo
              </div>

              <div className="mt-1">{source.coverage}</div>
            </div>

            <div>
              <div className="font-mono-ui text-[10px] uppercase text-muted-foreground">
                Last accessed
              </div>

              <div className="mt-1">{source.accessed}</div>
            </div>
          </div>

          <Button
            onClick={() => setSource(null)}
            className="mt-5 w-full"
            testId="button-close-source"
          >
            Close source detail
          </Button>
        </Modal>
      )}

      {question && (
        <Modal
          title={question.number}
          onClose={() => setQuestion(null)}
          testId="drawer-question"
        >
          <Badge
            tone={
              question.status === "Answered"
                ? "teal"
                : "saffron"
            }
          >
            {question.status}
          </Badge>

          <h3 className="mt-4 font-display text-3xl leading-tight">
            {question.title}
          </h3>

          <div className="mt-4 grid gap-3 rounded-lg bg-muted p-4 text-xs sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">
                Asked by
              </span>

              <strong className="mt-1 block">
                {question.rep}
              </strong>
            </div>

            <div>
              <span className="text-muted-foreground">
                Constituency
              </span>

              <strong className="mt-1 block">
                {question.constituency}
              </strong>
            </div>

            <div>
              <span className="text-muted-foreground">
                Ministry
              </span>

              <strong className="mt-1 block">
                {question.ministry}
              </strong>
            </div>

            <div>
              <span className="text-muted-foreground">
                Date
              </span>

              <strong className="mt-1 block">
                {question.date}
              </strong>
            </div>
          </div>

          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            {question.summary}
          </p>

          <Button
            onClick={() => setQuestion(null)}
            className="mt-6 w-full"
            testId="button-close-question"
          >
            Close record
          </Button>
        </Modal>
      )}
    </>
  );
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  /*
   * Theme:
   * false = light
   * true  = dark
   *
   * The user's choice is saved in localStorage.
   */

  const [theme, setTheme] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem("janpratinidhi-theme") === "dark";
  });

  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle("dark", theme);

    localStorage.setItem(
      "janpratinidhi-theme",
      theme ? "dark" : "light"
    );
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter
          base={import.meta.env.BASE_URL.replace(/\/$/, "")}
        >
          <ErrorBoundary>
            <AppRouter
              theme={theme}
              setTheme={setTheme}
              loggedIn={loggedIn}
              setLoggedIn={setLoggedIn}
            />
          </ErrorBoundary>
        </WouterRouter>

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;