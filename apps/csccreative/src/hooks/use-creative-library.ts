"use client";

import { useCallback, useEffect, useState } from "react";

import { DEFAULT_BRANDS, DEFAULT_SETTINGS } from "@/lib/catalog";
import {
  getSettings,
  listBrands,
  listReferences,
  listStyleProfiles,
  removeReference as deleteReference,
  saveBrand as persistBrand,
  saveReference as persistReference,
  saveSettings as persistSettings,
  saveStyleProfile as persistStyleProfile,
} from "@/lib/storage";
import type {
  AppSettings,
  BrandProfile,
  CreativeStyleProfile,
  ReferenceAsset,
} from "@/lib/types";

export function useCreativeLibrary() {
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [references, setReferences] = useState<ReferenceAsset[]>([]);
  const [styleProfiles, setStyleProfiles] = useState<CreativeStyleProfile[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    Promise.all([listBrands(), listReferences(), listStyleProfiles(), getSettings()])
      .then(async ([storedBrands, storedReferences, storedProfiles, storedSettings]) => {
        const nextBrands = storedBrands.length ? storedBrands : DEFAULT_BRANDS;
        if (!storedBrands.length) await Promise.all(DEFAULT_BRANDS.map(persistBrand));
        if (!storedSettings) await persistSettings(DEFAULT_SETTINGS);
        if (!active) return;
        setBrands(nextBrands);
        setReferences(storedReferences.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setStyleProfiles(storedProfiles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
        setSettings(storedSettings ?? DEFAULT_SETTINGS);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Creative library could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const saveBrand = useCallback(async (brand: BrandProfile) => {
    await persistBrand(brand);
    setBrands((current) => current.map((item) => item.id === brand.id ? brand : item));
  }, []);

  const saveReference = useCallback(async (reference: ReferenceAsset) => {
    await persistReference(reference);
    setReferences((current) => [reference, ...current.filter((item) => item.id !== reference.id)]);
  }, []);

  const removeReference = useCallback(async (id: string) => {
    await deleteReference(id);
    setReferences((current) => current.filter((item) => item.id !== id));
  }, []);

  const saveStyleProfile = useCallback(async (profile: CreativeStyleProfile) => {
    await persistStyleProfile(profile);
    setStyleProfiles((current) => [profile, ...current.filter((item) => item.id !== profile.id)]);
  }, []);

  const saveSettings = useCallback(async (next: AppSettings) => {
    await persistSettings(next);
    setSettings(next);
  }, []);

  return {
    brands,
    references,
    styleProfiles,
    settings,
    loading,
    error,
    saveBrand,
    saveReference,
    removeReference,
    saveStyleProfile,
    saveSettings,
  };
}
