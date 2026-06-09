"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuthStore } from "@/stores";

import Input from "../ui/Input";
import Button from "../ui/Button";

type LoginBlok = {
  title?: string;
  description?: string;
  id?: string;
  pwd?: string;
  submit?: string;
  footer?: string;
};

export default function LoginForm({ blok }: { blok: LoginBlok }) {
  const signin = useAuthStore((s) => s.signin);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      await signin(username, password);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    }
  };

  return (
    <div>
      <h2>{blok.title}</h2>
      <p>{blok.description}</p>

    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
      <Input
        type="text"
        placeholder={blok.id || ""}
        value={username || ""}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Input
        type="password"
        placeholder={blok.pwd || ""}
        value={password || ""}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-red-500">{error}</p>}
      <Button type="submit">{blok.submit}</Button>
      </div>
    </form>
    </div>
  );
}