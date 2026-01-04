"use client";

import { useEffect } from "react";
import { setAuthToken } from "@/services/api";

export default function AuthInit() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setAuthToken(token);
    }
  }, []);

  return null;
}
