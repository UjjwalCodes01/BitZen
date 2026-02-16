"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1A1F2E",
          color: "#fff",
          border: "1px solid rgba(183, 148, 244, 0.2)",
        },
        success: {
          iconTheme: {
            primary: "#B794F4",
            secondary: "#fff",
          },
        },
        error: {
          iconTheme: {
            primary: "#F56565",
            secondary: "#fff",
          },
        },
      }}
    />
  );
}
