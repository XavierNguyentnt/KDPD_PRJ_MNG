"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatNumberAccounting } from "@/lib/utils";

export interface NumberInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  /** Value as number or string (will be parsed). */
  value: string | number | null | undefined;
  /** Called with string value (numeric, may include decimals). */
  onChange: (value: string) => void;
  /** Number of decimal places (default: 2 for money, 0 for integers). */
  decimals?: number;
  /** Show formatted value below input. */
  showFormatted?: boolean;
}

/**
 * Number input that formats numbers according to accounting standards:
 * - Displays with dot (.) separator every 1000 units
 * - Supports decimal places
 * - Shows formatted value below input if showFormatted is true
 */
export function NumberInput({
  value,
  onChange,
  decimals = 2,
  showFormatted = false,
  className,
  onBlur,
  ...props
}: NumberInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>("");
  const [isFocused, setIsFocused] = React.useState(false);

  // Parse value to number
  const numValue = React.useMemo(() => {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "string" ? parseFloat(value) : value;
    return Number.isNaN(n) ? null : n;
  }, [value]);

  // Format number theo chuẩn kế toán Việt Nam: dấu chấm (.) phân tách hàng nghìn, dấu phẩy (,) phân tách phần thập phân
  const formatWithDots = React.useCallback((val: number): string => {
    if (decimals === 0) {
      return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    const fixed = val.toFixed(decimals);
    const [intPart, decPart] = fixed.split(".");
    const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return decPart != null ? `${withDots},${decPart}` : withDots;
  }, [decimals]);

  // Get plain numeric string (no thousand separators, but keep decimal point for input)
  const getPlainValue = React.useCallback((val: number | null): string => {
    if (val === null) return "";
    if (decimals === 0) {
      return Math.round(val).toString();
    }
    const fixed = val.toFixed(decimals);
    return fixed.replace(/\.?0+$/, "");
  }, [decimals]);

  // Initialize display value
  React.useEffect(() => {
    if (isFocused) {
      // When focused, show plain number (no thousand separators)
      if (numValue === null) {
        setDisplayValue("");
      } else {
        setDisplayValue(getPlainValue(numValue));
      }
    } else {
      // When not focused, show formatted with thousand separators
      if (numValue === null) {
        setDisplayValue("");
      } else {
        setDisplayValue(formatWithDots(numValue));
      }
    }
  }, [numValue, decimals, isFocused, formatWithDots, getPlainValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Allow empty, numbers, and single decimal point or comma (no thousand separators when typing)
    // Convert comma to dot for parsing, but allow both for user input
    if (input === "" || /^-?\d*[.,]?\d*$/.test(input)) {
      setDisplayValue(input);
      // Store with dot (.) for internal use, but allow comma (,) in display
      const normalized = input.replace(",", ".");
      onChange(normalized);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    // Parse and format on blur - convert comma to dot for parsing
    const normalized = displayValue.replace(",", ".");
    const parsed = parseFloat(normalized);
    if (!Number.isNaN(parsed)) {
      const formatted = formatWithDots(parsed);
      setDisplayValue(formatted);
      // Store numeric value (with decimal point, no thousand separators)
      const numericValue = parsed.toFixed(decimals);
      const finalValue = decimals > 0 ? numericValue.replace(/\.?0+$/, "") : numericValue;
      onChange(finalValue);
    } else if (displayValue.trim() === "") {
      setDisplayValue("");
      onChange("");
    }
    onBlur?.(e);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const formattedDisplay = numValue !== null ? formatNumberAccounting(numValue, decimals) : "—";

  return (
    <div className="grid gap-1">
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className={className}
      />
      {showFormatted && numValue !== null && (
        <p className="text-xs text-muted-foreground">{formattedDisplay}</p>
      )}
    </div>
  );
}
