import { useMemo, useState, type ReactNode } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export interface GroupTabItem {
  id: string | number;
  name: string;
  count?: number;
}

export interface GroupTabsFilterProps {
  tabs?: GroupTabItem[];
  activeTab?: string | number;
  defaultTab?: string | number;
  onTabChange?: (tabId: string) => void;

  showAllTab?: boolean;
  allTabLabel?: string;
  allTabCount?: number;
  noGroupTabId?: string;

  headerIcon?: ReactNode;
  headerLabel?: ReactNode;
  headerDescription?: ReactNode;
  headerRight?: ReactNode;

  hideEmpty?: boolean;

  wrapClassName?: string;
  listClassName?: string;
  triggerClassName?: string;
  badgeClassName?: string;

  scrollOnMobile?: boolean;
  maxTriggerTextWidthPx?: number;
  triggerTabIndex?: number;
}

export function GroupTabsFilter(props: GroupTabsFilterProps) {
  const { language } = useI18n();
  const {
    tabs = [],
    activeTab,
    defaultTab,
    onTabChange,

    showAllTab = true,
    allTabLabel,
    allTabCount,
    noGroupTabId = "__nogroup__",

    headerIcon,
    headerLabel,
    headerDescription,
    headerRight,

    hideEmpty = true,

    wrapClassName,
    listClassName,
    triggerClassName,
    badgeClassName,

    scrollOnMobile = true,
    maxTriggerTextWidthPx = 180,
    triggerTabIndex = 0,
  } = props;

  const hasTabs = Array.isArray(tabs) && tabs.length > 0;
  if (hideEmpty && !hasTabs && !showAllTab) return null;

  const isControlled = activeTab !== undefined;
  const [internalTab, setInternalTab] = useState<string>(() => {
    const initial = defaultTab !== undefined ? String(defaultTab) : "all";
    return initial;
  });
  const selectedTab = isControlled ? String(activeTab as unknown as string) : internalTab;

  const visibleTabs = useMemo(() => {
    if (!Array.isArray(tabs)) return [] as GroupTabItem[];
    return tabs.filter((t) => t && (typeof t.id === "string" || typeof t.id === "number"));
  }, [tabs]);

  const allCount = useMemo(() => {
    if (allTabCount !== undefined && Number.isFinite(Number(allTabCount))) {
      return Number(allTabCount);
    }
    return visibleTabs.reduce(
      (s, t) => s + (typeof t.count === "number" ? t.count : 0),
      0,
    );
  }, [allTabCount, visibleTabs]);

  const allLabel =
    allTabLabel ?? (language === "vi" ? "Tất cả" : "All");

  const setTab = (v: string) => {
    if (!isControlled) setInternalTab(v);
    onTabChange?.(v);
  };

  const listClasses = cn(
    "flex flex-wrap items-center gap-1 h-auto bg-transparent border border-border rounded-xl p-1 shadow-sm",
    listClassName,
  );
  const triggerClasses = cn(
    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
    triggerClassName,
  );
  const badgedClasses = cn(
    "ml-1.5 h-5 text-[10px] px-1.5 py-0 border-transparent bg-muted/60 data-[state=active]:bg-primary-foreground/15 text-muted-foreground data-[state=active]:text-primary-foreground shrink-0",
    badgeClassName,
  );

  return (
    <div className={cn("space-y-2", wrapClassName)}>
      {(headerIcon || headerLabel || headerDescription || headerRight) ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            {headerIcon ? <span className="flex-shrink-0">{headerIcon}</span> : null}
            {headerLabel ? (
              <span className="font-medium text-foreground truncate">
                {headerLabel}
              </span>
            ) : null}
            {headerDescription ? (
              <span className="truncate hidden sm:inline">
                {headerDescription}
              </span>
            ) : null}
          </div>
          {headerRight ? <div className="flex-shrink-0">{headerRight}</div> : null}
        </div>
      ) : null}

      <Tabs
        value={selectedTab}
        onValueChange={setTab}
        className="w-full"
      >
        {scrollOnMobile ? (
          <div className="w-full overflow-x-auto pb-1 -mx-4 px-4">
            <TabsList className={listClasses}>
              {showAllTab ? (
                <TabsTrigger
                  value="all"
                  className={triggerClasses}
                  tabIndex={triggerTabIndex}
                >
                  {allLabel}
                  <Badge variant="outline" className={badgedClasses}>
                    {allCount}
                  </Badge>
                </TabsTrigger>
              ) : null}
              {visibleTabs.map((g) => {
                const idStr = String(g.id);
                const isNoGroup = idStr === String(noGroupTabId);
                const labelName =
                  (typeof g.name === "string" && g.name.trim()) ||
                  (isNoGroup
                    ? language === "vi"
                      ? "Chưa phân nhóm"
                      : "No group"
                    : idStr);
                return (
                  <TabsTrigger
                    key={idStr}
                    value={idStr}
                    className={triggerClasses}
                    tabIndex={triggerTabIndex}
                  >
                    <span
                      className="truncate"
                      style={{
                        maxWidth: maxTriggerTextWidthPx ? `${maxTriggerTextWidthPx}px` : undefined,
                      }}
                    >
                      {labelName}
                    </span>
                    {typeof g.count === "number" ? (
                      <Badge variant="outline" className={badgedClasses}>
                        {g.count}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        ) : (
          <TabsList className={listClasses}>
            {showAllTab ? (
              <TabsTrigger
                value="all"
                className={triggerClasses}
                tabIndex={triggerTabIndex}
              >
                {allLabel}
                <Badge variant="outline" className={badgedClasses}>
                  {allCount}
                </Badge>
              </TabsTrigger>
            ) : null}
            {visibleTabs.map((g) => {
              const idStr = String(g.id);
              const isNoGroup = idStr === String(noGroupTabId);
              const labelName =
                (typeof g.name === "string" && g.name.trim()) ||
                (isNoGroup
                  ? language === "vi"
                    ? "Chưa phân nhóm"
                    : "No group"
                  : idStr);
              return (
                <TabsTrigger
                  key={idStr}
                  value={idStr}
                  className={triggerClasses}
                  tabIndex={triggerTabIndex}
                >
                  <span
                    className="truncate"
                    style={{
                      maxWidth: maxTriggerTextWidthPx ? `${maxTriggerTextWidthPx}px` : undefined,
                    }}
                  >
                    {labelName}
                  </span>
                  {typeof g.count === "number" ? (
                    <Badge variant="outline" className={badgedClasses}>
                      {g.count}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        )}
      </Tabs>
    </div>
  );
}

export default GroupTabsFilter;
