"use client";
import { usePostStore, useAuthStore } from "@/stores";
import { FormEvent, useEffect, useState } from "react";

export default function PostCreatePage() {
    const createPost = usePostStore((state)=> state.createPost);
    const user = useAuthStore((state)=> state.user);
    const isLoading = usePostStore((state)=> state.isLoading);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    
    useEffect(() => {
        console.log(user);
    }, [user]);
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const res = await createPost(title, content);        
        console.log(res);
    }
    if(isLoading) return <div>Loading...</div>;
    if(!user) return <div>로그인이 필요합니다.</div>;
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