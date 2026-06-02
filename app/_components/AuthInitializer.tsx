"use client";

import { useEffect } from "react";
import {useAuthStore} from "@/stores";

export default function AuthInitializer() {
    const fetchMe = useAuthStore((state)=> state.fetchMe);

    useEffect(() => {
        fetchMe();
    }, [fetchMe]);

    return null;
}