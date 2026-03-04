import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderIcon } from "@/components/ProviderIcon";
import { getIconMetadata } from "@/icons/extracted/metadata";
import type { UseFormReturn } from "react-hook-form";
import type { ProviderFormData } from "@/lib/schemas/provider";

interface WebsiteUrlOption {
  url: string;
  label: string;
}

interface BasicFormFieldsProps {
  form: UseFormReturn<ProviderFormData>;
  /** Slot to render content between icon and name fields */
  beforeNameSlot?: ReactNode;
  /** 当提供时，官方地址字段改为下拉选择 */
  websiteUrlOptions?: WebsiteUrlOption[];
}

export function BasicFormFields({
  form,
  beforeNameSlot,
  websiteUrlOptions,
}: BasicFormFieldsProps) {
  const { t } = useTranslation();
  const currentIcon = form.watch("icon");
  const currentIconColor = form.watch("iconColor");
  const providerName = form.watch("name") || "Provider";
  const effectiveIconColor =
    currentIconColor ||
    (currentIcon ? getIconMetadata(currentIcon)?.defaultColor : undefined);

  return (
    <>
      {/* 图标显示区域 - 顶部居中，固定不可选 */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 p-3 rounded-xl flex items-center justify-center">
          <ProviderIcon
            icon={currentIcon}
            name={providerName}
            color={effectiveIconColor}
            size={48}
          />
        </div>
      </div>

      {/* Slot for additional fields between icon and name */}
      {beforeNameSlot}

      {/* 基础信息 - 网格布局 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("provider.name")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("provider.namePlaceholder")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("provider.notes")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t("provider.notesPlaceholder")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="websiteUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("provider.websiteUrl")}</FormLabel>
            <FormControl>
              {websiteUrlOptions && websiteUrlOptions.length > 0 ? (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={t("providerForm.websiteUrlPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {websiteUrlOptions.map((opt) => (
                      <SelectItem key={opt.url} value={opt.url}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  {...field}
                  placeholder={t("providerForm.websiteUrlPlaceholder")}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
