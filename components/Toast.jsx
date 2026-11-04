"use client";
import { useStore } from "./Store";

export default function Toast() {
  const { toastMsg } = useStore();
  return <div className={"toast" + (toastMsg ? " on" : "")} role="status">{toastMsg}</div>;
}
