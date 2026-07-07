import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Download,
  Inbox,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

import { StatusBadge } from "@/components/librora/status-badge";
import { TagChip } from "@/components/librora/tag-chip";
import { PremiumBadge } from "@/components/librora/premium-badge";
import { SegmentedControl } from "@/components/librora/segmented-control";
import { SearchInput } from "@/components/librora/search-input";
import { UsageCard } from "@/components/librora/usage-card";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/librora/shared-states";
import { noIndexSeo } from "@/lib/seo";

export const Route = createFileRoute("/design-system")({
  head: () => ({
    meta: noIndexSeo("Design System - Librora", "/design-system"),
  }),
  component: DesignSystemPage,
});

const COLOR_TOKENS: { name: string; varName: string; note?: string }[] = [
  { name: "Background", varName: "--color-background" },
  { name: "Surface (Card)", varName: "--color-card" },
  { name: "Elevated", varName: "--color-popover", note: "Popover / menu surfaces" },
  { name: "Border", varName: "--color-border" },
  { name: "Primary text", varName: "--color-foreground" },
  { name: "Secondary text", varName: "--color-muted-foreground" },
  { name: "Muted", varName: "--color-muted" },
  { name: "Primary action", varName: "--color-primary" },
  { name: "Secondary action", varName: "--color-secondary" },
  { name: "Success", varName: "--color-status-ready" },
  { name: "Warning", varName: "--color-status-partial" },
  { name: "Error", varName: "--color-destructive" },
  { name: "Processing", varName: "--color-status-processing" },
  { name: "AI Surface", varName: "--color-ai" },
  { name: "Premium", varName: "--color-premium" },
  { name: "Focus ring", varName: "--color-ring" },
];

function Section({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-12">
      <div className="mb-6">
        <h2 className="type-page-title text-foreground">{title}</h2>
        {description && <p className="mt-1.5 type-body text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, varName, note }: { name: string; varName: string; note?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div
        className="h-14 w-full rounded-md border border-border"
        style={{ background: `var(${varName})` }}
      />
      <div className="mt-2.5">
        <p className="type-card-title text-foreground">{name}</p>
        <p className="mt-0.5 type-caption font-mono">{varName}</p>
        {note && <p className="mt-1 type-caption">{note}</p>}
      </div>
    </div>
  );
}

function DesignSystemPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [tab, setTab] = useState("buttons");
  const [search, setSearch] = useState("");

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-dvh bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
          <div className="w-page flex h-16 items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="icon" aria-label="Back to home">
                <Link to="/">
                  <ArrowLeft />
                </Link>
              </Button>
              <div>
                <p className="type-label">Librora · Foundation</p>
                <h1 className="type-section-title">Design System</h1>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/library">Open app</Link>
            </Button>
          </div>
        </header>

        <main className="w-page px-5 pb-24">
          {/* Intro */}
          <div className="py-12">
            <p className="type-label">Foundation v1</p>
            <h2 className="type-display mt-3 text-foreground">A calm library, in tokens.</h2>
            <p className="mt-4 max-w-2xl type-body text-muted-foreground">
              The visual language behind Librora — colors, type, spacing and components. Built for
              long-form reading, designed to disappear so the content can speak.
              ออกแบบให้รองรับทั้งภาษาไทยและอังกฤษอย่างเป็นธรรมชาติ
            </p>
          </div>

          {/* Colors */}
          <Section
            id="colors"
            title="Color tokens"
            description="Semantic tokens. Never hardcode hex values in components — reference these instead."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {COLOR_TOKENS.map((t) => (
                <Swatch key={t.varName} {...t} />
              ))}
            </div>
          </Section>

          {/* Typography */}
          <Section
            id="typography"
            title="Typography"
            description="Fraunces for display, Inter Tight for UI, Source Serif 4 for reading. All scales support Thai & English."
          >
            <div className="space-y-6 rounded-xl border border-border bg-card p-6">
              <div>
                <p className="type-label mb-2">Display title · type-display</p>
                <p className="type-display">Collect once. Recall anytime.</p>
                <p className="type-display mt-1">เก็บครั้งเดียว ค้นคืนได้ทุกเวลา</p>
              </div>
              <Divider />
              <div>
                <p className="type-label mb-2">Page title · type-page-title</p>
                <p className="type-page-title">My Library</p>
              </div>
              <Divider />
              <div>
                <p className="type-label mb-2">Section title · type-section-title</p>
                <p className="type-section-title">Recently saved</p>
              </div>
              <Divider />
              <div>
                <p className="type-label mb-2">Card title · type-card-title</p>
                <p className="type-card-title">The Future of Personal Knowledge Bases</p>
              </div>
              <Divider />
              <div>
                <p className="type-label mb-2">Body · type-body</p>
                <p className="type-body max-w-2xl">
                  Librora keeps every link, article, and idea you save in one quiet place.
                  ห้องสมุดส่วนตัวที่เงียบ สงบ พร้อมให้ค้นคืนได้ทุกเวลา
                </p>
              </div>
              <Divider />
              <div>
                <p className="type-label mb-2">Small body · type-body-sm</p>
                <p className="type-body-sm max-w-2xl text-muted-foreground">
                  Helper text used inside cards, list items, and form descriptions.
                </p>
              </div>
              <Divider />
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="type-label mb-2">Caption</p>
                  <p className="type-caption">Saved 3 days ago</p>
                </div>
                <div>
                  <p className="type-label mb-2">Label</p>
                  <p className="type-label">Bookshelf</p>
                </div>
                <div>
                  <p className="type-label mb-2">Metadata</p>
                  <p className="type-metadata">12 min · 3,420 words</p>
                </div>
              </div>
              <Divider />
              <div className="rounded-lg bg-background p-6">
                <p className="type-label mb-3">Reading Room</p>
                <h3 className="type-read-h">A library, kept lightly.</h3>
                <p className="type-read-p mt-3 max-w-[68ch]">
                  The reading layout uses Source Serif 4 at a generous line-height for comfortable
                  long-form reading. ระยะห่างระหว่างบรรทัดถูกปรับให้อ่านสบายตา
                  เหมาะกับการอ่านบทความยาวๆ โดยไม่ล้า
                </p>
              </div>
            </div>
          </Section>

          {/* Spacing */}
          <Section
            id="spacing"
            title="Spacing & layout"
            description="Layout tokens that govern page rhythm."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Page container", "1200 px", "w-page"],
                ["Reading width", "68 ch", "w-reading"],
                ["Sidebar", "260 px", "—"],
                ["Sidebar collapsed", "56 px", "—"],
                ["Header height", "64 px", "h-16"],
                ["Card padding", "16–24 px", "p-4 / p-6"],
                ["Section spacing", "48 px", "py-12"],
                ["Dialog width", "max 512 px", "max-w-lg"],
                ["Mobile padding", "20 px", "px-5"],
              ].map(([name, val, util]) => (
                <div key={name} className="rounded-lg border border-border bg-card p-4">
                  <p className="type-card-title">{name}</p>
                  <p className="mt-1 type-metadata">{val}</p>
                  <p className="mt-2 type-caption font-mono">{util}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Components */}
          <Section
            id="components"
            title="Components"
            description="The reusable surface of Librora."
          >
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="buttons">Actions</TabsTrigger>
                <TabsTrigger value="forms">Forms</TabsTrigger>
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
                <TabsTrigger value="surfaces">Surfaces</TabsTrigger>
                <TabsTrigger value="nav">Navigation</TabsTrigger>
                <TabsTrigger value="library">Library</TabsTrigger>
              </TabsList>

              {/* ── Actions ── */}
              <TabsContent value="buttons" className="mt-6 space-y-8">
                <Subsection title="Button — variants">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                    <Button variant="destructive">Destructive</Button>
                  </div>
                </Subsection>

                <Subsection title="Button — sizes">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button>Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon" aria-label="Add">
                      <Plus />
                    </Button>
                  </div>
                </Subsection>

                <Subsection title="Button — states">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button>Default</Button>
                    <Button className="bg-primary/90">Hover</Button>
                    <Button className="ring-2 ring-ring ring-offset-2 ring-offset-background">
                      Focus
                    </Button>
                    <Button disabled>Disabled</Button>
                    <Button disabled>
                      <Loader2 className="animate-spin" />
                      Loading
                    </Button>
                    <Button variant="destructive">Error action</Button>
                  </div>
                </Subsection>

                <Subsection title="Icon button">
                  <div className="flex flex-wrap items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" aria-label="Save to library">
                          <Bookmark />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Save to library</TooltipContent>
                    </Tooltip>
                    <Button variant="ghost" size="icon" aria-label="Settings">
                      <Settings />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </Subsection>

                <Subsection title="Segmented control">
                  <SegmentedControl
                    value={view}
                    onChange={setView}
                    ariaLabel="View mode"
                    options={[
                      {
                        value: "grid",
                        label: "Grid",
                        icon: <LayoutGrid className="h-3.5 w-3.5" />,
                      },
                      { value: "list", label: "List", icon: <List className="h-3.5 w-3.5" /> },
                    ]}
                  />
                </Subsection>
              </TabsContent>

              {/* ── Forms ── */}
              <TabsContent value="forms" className="mt-6 space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <Subsection title="Input">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="ds-i1">URL</Label>
                        <Input
                          id="ds-i1"
                          placeholder="https://example.com/article"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ds-i2">Disabled</Label>
                        <Input id="ds-i2" disabled defaultValue="Read only" className="mt-1.5" />
                      </div>
                      <div>
                        <Label htmlFor="ds-i3" className="text-destructive">
                          Error
                        </Label>
                        <Input
                          id="ds-i3"
                          defaultValue="not-a-url"
                          aria-invalid
                          className="mt-1.5 border-destructive focus-visible:ring-destructive"
                        />
                        <p className="mt-1 type-caption text-destructive">
                          Please enter a valid URL.
                        </p>
                      </div>
                    </div>
                  </Subsection>

                  <Subsection title="Search input">
                    <SearchInput
                      placeholder="Search your library…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onClear={() => setSearch("")}
                    />
                  </Subsection>

                  <Subsection title="Textarea">
                    <Textarea placeholder="Add a personal note…" rows={4} />
                  </Subsection>

                  <Subsection title="Select">
                    <Select defaultValue="recent">
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Recently saved</SelectItem>
                        <SelectItem value="title">Title A–Z</SelectItem>
                        <SelectItem value="length">Reading length</SelectItem>
                      </SelectContent>
                    </Select>
                  </Subsection>

                  <Subsection title="Checkbox">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 type-body-sm">
                        <Checkbox defaultChecked /> Add to Reading List
                      </label>
                      <label className="flex items-center gap-2 type-body-sm">
                        <Checkbox /> Auto-generate AI Abstract
                      </label>
                      <label className="flex items-center gap-2 type-body-sm text-muted-foreground">
                        <Checkbox disabled /> Smart Bookshelf (Premium)
                      </label>
                    </div>
                  </Subsection>

                  <Subsection title="Switch">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="type-body-sm">Email weekly digest</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="type-body-sm">Show AI Abstract by default</span>
                        <Switch />
                      </div>
                    </div>
                  </Subsection>
                </div>
              </TabsContent>

              {/* ── Feedback ── */}
              <TabsContent value="feedback" className="mt-6 space-y-8">
                <Subsection title="Badge">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <PremiumBadge />
                  </div>
                </Subsection>

                <Subsection title="Status badge">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status="pending" />
                    <StatusBadge status="processing" />
                    <StatusBadge status="ready" />
                    <StatusBadge status="partial" />
                    <StatusBadge status="failed" />
                  </div>
                </Subsection>

                <Subsection title="Tag chip">
                  <div className="flex flex-wrap items-center gap-2">
                    {["product", "design", "ai", "knowledge-base"].map((t) => (
                      <TagChip key={t} tag={t} asLink={false} />
                    ))}
                    <TagChip tag="remove-me" asLink={false} onRemove={() => toast("Removed")} />
                  </div>
                </Subsection>

                <Subsection title="Progress">
                  <div className="space-y-3 max-w-md">
                    <Progress value={32} />
                    <Progress value={72} />
                    <Progress value={100} />
                  </div>
                </Subsection>

                <Subsection title="Skeleton">
                  <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
                    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <LoadingSkeleton rows={3} />
                  </div>
                </Subsection>

                <Subsection title="Toast">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast("Saved to library")}>
                      Default
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success("Item processed")}
                    >
                      Success
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.error("Couldn't reach that URL")}
                    >
                      Error
                    </Button>
                  </div>
                </Subsection>

                <Subsection title="Empty state">
                  <EmptyState
                    icon={<Inbox className="h-5 w-5" />}
                    title="Nothing in your inbox"
                    description="Items you save will appear here while they're being processed."
                    action={
                      <Button size="sm">
                        <Plus /> Add a link
                      </Button>
                    }
                  />
                </Subsection>

                <Subsection title="Error state">
                  <ErrorState
                    title="We couldn't load this shelf"
                    description="Check your connection and try again."
                    action={
                      <Button size="sm" variant="outline">
                        Retry
                      </Button>
                    }
                  />
                </Subsection>
              </TabsContent>

              {/* ── Surfaces ── */}
              <TabsContent value="surfaces" className="mt-6 space-y-8">
                <Subsection title="Card">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Reading List</CardTitle>
                        <CardDescription>Articles you've set aside.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="type-body-sm text-muted-foreground">
                          12 items · roughly 2h 40m of reading.
                        </p>
                      </CardContent>
                    </Card>
                    <UsageCard
                      label="Items saved this month"
                      used={132}
                      limit={200}
                      hint="Free plan resets on the 1st."
                    />
                  </div>
                </Subsection>

                <Subsection title="Dialog">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Open dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add to Library</DialogTitle>
                        <DialogDescription>
                          Save a link. We'll fetch the content and process it in the background.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input placeholder="https://…" />
                        <Textarea placeholder="Personal note (optional)" rows={3} />
                      </div>
                      <DialogFooter>
                        <Button variant="ghost">Cancel</Button>
                        <Button>
                          <Check /> Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </Subsection>

                <Subsection title="Tooltip">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">
                        Hover me
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Calm, brief, never blocks the view.</TooltipContent>
                  </Tooltip>
                </Subsection>
              </TabsContent>

              {/* ── Navigation ── */}
              <TabsContent value="nav" className="mt-6 space-y-8">
                <Subsection title="Tabs">
                  <Tabs defaultValue="all">
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="unread">Unread</TabsTrigger>
                      <TabsTrigger value="ready">Ready</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all" className="type-body-sm text-muted-foreground mt-3">
                      All items in your library.
                    </TabsContent>
                  </Tabs>
                </Subsection>

                <Subsection title="Breadcrumb">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                          <Link to="/library">Library</Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                          <Link to="/bookshelves">Bookshelves</Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Product</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </Subsection>

                <Subsection title="Dropdown menu">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Item</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Bookmark /> Add to Reading List
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download /> Export
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 /> Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Subsection>
              </TabsContent>

              {/* ── Librora-specific ── */}
              <TabsContent value="library" className="mt-6 space-y-8">
                <Subsection title="Premium badge & lock">
                  <div className="flex flex-wrap items-center gap-3">
                    <PremiumBadge />
                    <span className="inline-flex items-center gap-2 rounded-md border border-[color-mix(in_oklab,var(--premium)_30%,var(--border))] bg-[color-mix(in_oklab,var(--premium)_6%,transparent)] px-3 py-1.5 type-body-sm">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--premium)]" />
                      Semantic search · Premium feature
                    </span>
                  </div>
                </Subsection>

                <Subsection title="Usage cards">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <UsageCard label="Items saved" used={132} limit={200} />
                    <UsageCard label="AI Abstracts" used={48} limit={50} hint="Nearing limit" />
                    <UsageCard
                      label="Semantic queries"
                      used={200}
                      limit={200}
                      hint="Limit reached"
                    />
                  </div>
                </Subsection>

                <Subsection title="AI surface">
                  <div className="rounded-xl border border-[color-mix(in_oklab,var(--ai)_30%,var(--border))] bg-[var(--ai-surface)] p-5">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[color-mix(in_oklab,var(--ai)_15%,transparent)] text-[var(--ai)]">
                        <Sparkles className="h-3.5 w-3.5" />
                      </span>
                      <p className="type-label" style={{ color: "var(--ai)" }}>
                        AI Abstract
                      </p>
                    </div>
                    <p className="mt-3 type-body text-foreground/90">
                      AI-generated content lives in its own visual surface — distinct from the
                      original article so the source remains unambiguous.
                    </p>
                  </div>
                </Subsection>
              </TabsContent>
            </Tabs>
          </Section>
        </main>
      </div>
    </TooltipProvider>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="type-label mb-3">{title}</p>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-border" />;
}
