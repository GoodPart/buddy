"use client";

import { usePostStore } from "@/stores";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function PostCreatePage() {
    const createPost = usePostStore((state)=> state.createPost);
    const isLoading = usePostStore((state)=> state.isLoading);
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const res = await createPost(title, content);        
        console.log(res);
            // router.push("/post/list");
            // router.refresh();
        
    }
    if(isLoading) return <div>Loading...</div>;
    return (
        <div>
            <h1>Post Create Page</h1>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <br />
                <textarea placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
                <button type="submit">Create</button>
            </form>
        </div>
    )
}