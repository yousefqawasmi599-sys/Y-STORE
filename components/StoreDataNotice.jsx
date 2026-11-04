"use client";
import { useStore } from "./Store";

export default function StoreDataNotice() {
  const { catalogError, categoriesError } = useStore();
  const message = catalogError || categoriesError;
  return message ? <div className="store-data-notice" role="alert">{message}</div> : null;
}
