"use client";
import { useEffect } from "react";
import { connectAdminAppearance } from "../model/store";
export function AdminAppearanceObserver() {
  useEffect(connectAdminAppearance, []);
  return null;
}
