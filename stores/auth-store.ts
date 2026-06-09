"use client";

import { ca } from "zod/locales";
import { create } from "zustand";

type User = {
    id : string;
    username : string;
};

type AuthState = {
    user : User | null;
    isAuthed : boolean;
    isLoading : boolean;
    fetchMe : () => Promise<void>;
    signin : (username : string, password : string) => Promise<void>;
    signup : (username : string, password : string) => Promise<void>;
    signout : () => Promise<void>;
    reset : () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
    user : null,
    isAuthed : false,
    isLoading : true,
    fetchMe : async () => {
        set({isLoading : true});
        try {
            const res = await fetch("/api/auth/me");
            if(!res.ok) {
                set({
                    user : null,
                    isAuthed : false,
                    isLoading : false
                });
                return ;
            }
            const data = await res.json();
            set({
                user : data.user,
                isAuthed : true,
                isLoading : false
            });
        } catch {
            set({
                user : null,
                isAuthed : false,
                isLoading : false
            })
        }
    },
    signin : async(username : string, password : string) => {
        set({isLoading : true});
        try {
            const res = await fetch("/api/auth/signin", {
                method : "POST", 
                body : JSON.stringify({username, password}),
                headers : {
                    "Content-Type" : "application/json",
                },
            })
            const data = await res.json();

            if(!res.ok) {
                throw new Error(data.message || "로그인 실패");
            }

            set({
                user : data.user,
                isAuthed : true,
                isLoading : false,
            });
        } catch {
            set({isLoading : false});
            return ;
        }
    },
    signup : async(username : string, password : string) => {
        set({isLoading : true});
        try {
            const res = await fetch("/api/auth/register", {
                method : "POST",
                body : JSON.stringify({username, password}),
            });

            const data = await res.json();
            if(!res.ok) {
                throw new Error(data.message || "회원가입 실패");
            }
            set({
                user : data.user,
                isAuthed : true,
                isLoading : false,
            });
        } catch {
            set({isLoading : false});
            return ;
        }
    },
    signout : async () => {
        await fetch("/api/auth/signout", {method : "POST"});
        set({user : null, isAuthed : false});
    },
    reset : () => {
        set({user : null, isAuthed : false, isLoading : false});
    },
}))

