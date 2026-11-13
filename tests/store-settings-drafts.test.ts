import { createElement as h, type InputHTMLAttributes } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  daysDraftValue,
  validDaysDraft,
  moneyDraftCents,
  validMoneyDraft,
  storeDraftsValid,
} from "@/features/store-settings/model/numeric-draft";

const captured = vi.hoisted(() => ({
  inputs: [] as InputHTMLAttributes<HTMLInputElement>[],
}));
vi.mock("@/shared/ui/input", async () => {
  const { createElement } = await import("react");
  return {
    Input: (props: InputHTMLAttributes<HTMLInputElement>) => {
      captured.inputs.push(props);
      return createElement("input", props);
    },
  };
});
import { StoreSettingsFields } from "@/features/store-settings";
import { DEFAULT_STORE_PREFERENCES } from "@/entities/store-settings";
beforeEach(() => {
  captured.inputs.length = 0;
});

describe("store numeric draft validation", () => {
  it("rejects empty/out-of-range days and money while allowing explicit zero only where supported", () => {
    for (const text of ["", "99", "61", "1.5", "-1"])
      expect(validDaysDraft(text, 0)).toBe(false);
    expect(daysDraftValue("")).toBeNull();
    expect(validDaysDraft("0", 0)).toBe(true);
    expect(validDaysDraft("0", 1)).toBe(false);
    expect(validDaysDraft("60", 1)).toBe(true);
    for (const text of ["", "10.000.000,01", "1,,2", ".", "-1"])
      expect(validMoneyDraft(text)).toBe(false);
    expect(moneyDraftCents("")).toBeNull();
    expect(validMoneyDraft("0")).toBe(true);
    expect(moneyDraftCents("1.234,56")).toBe(123456);
    expect(validMoneyDraft("10.000.000,00")).toBe(true);
    expect(
      storeDraftsValid({ preparationDays: false, freeShippingFromCents: true }),
    ).toBe(false);
  });

  it("reports invalidity immediately when days become 99 or blank, so the submit guard rejects the previous valid 9", () => {
    const changed = vi.fn();
    const validity = vi.fn();
    renderToStaticMarkup(
      h(StoreSettingsFields, {
        value: DEFAULT_STORE_PREFERENCES,
        onChange: changed,
        onValidityChange: validity,
      }),
    );
    const input = captured.inputs.find(
      (input) => input.inputMode === "numeric",
    )!;
    input.onChange!({ target: { value: "9" } } as never);
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ preparationDays: 9 }),
    );
    input.onChange!({ target: { value: "99" } } as never);
    expect(validity).toHaveBeenLastCalledWith(false);
    expect(changed).toHaveBeenCalledTimes(1);
    input.onChange!({ target: { value: "" } } as never);
    expect(validity).toHaveBeenLastCalledWith(false);
    expect(changed).toHaveBeenCalledTimes(1);
    input.onChange!({ target: { value: "60" } } as never);
    expect(validity).toHaveBeenLastCalledWith(true);
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ preparationDays: 60 }),
    );
  });

  it("keeps excessive or blank money invalid and never replaces it with an invented zero", () => {
    const changed = vi.fn();
    const validity = vi.fn();
    renderToStaticMarkup(
      h(StoreSettingsFields, {
        value: DEFAULT_STORE_PREFERENCES,
        onChange: changed,
        onValidityChange: validity,
      }),
    );
    const input = captured.inputs.find(
      (input) => input.inputMode === "decimal",
    )!;
    input.onChange!({ target: { value: "10000000,01" } } as never);
    expect(validity).toHaveBeenLastCalledWith(false);
    input.onChange!({ target: { value: "" } } as never);
    expect(validity).toHaveBeenLastCalledWith(false);
    expect(changed).not.toHaveBeenCalled();
    input.onChange!({ target: { value: "0" } } as never);
    expect(validity).toHaveBeenLastCalledWith(true);
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ freeShippingFromCents: 0 }),
    );
  });
});
