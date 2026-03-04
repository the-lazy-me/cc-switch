import { useTranslation } from "react-i18next";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap } from "lucide-react";

interface EndpointOption {
  url: string;
  label?: string;
}

interface EndpointFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string;
  showManageButton?: boolean;
  onManageClick?: () => void;
  manageButtonLabel?: string;
  options?: EndpointOption[];
}

export function EndpointField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  showManageButton = true,
  onManageClick,
  manageButtonLabel,
  options,
}: EndpointFieldProps) {
  const { t } = useTranslation();

  const defaultManageLabel = t("providerForm.manageAndTest", {
    defaultValue: "管理和测速",
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <FormLabel htmlFor={id}>{label}</FormLabel>
        {!options && showManageButton && onManageClick && (
          <button
            type="button"
            onClick={onManageClick}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            {manageButtonLabel || defaultManageLabel}
          </button>
        )}
      </div>
      {options && options.length > 0 ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.url} value={opt.url}>
                {opt.label ? `${opt.label} (${opt.url})` : opt.url}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
      )}
      {hint ? (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
          <p className="text-xs text-amber-600 dark:text-amber-400">{hint}</p>
        </div>
      ) : null}
    </div>
  );
}
