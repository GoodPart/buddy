"use client";

import { useAuthStore } from "@/stores";
import { Post } from "@/app/generated/prisma/client";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useState } from "react";



export default function PostPage() {
    const {slug} = useParams();
    const [post, setPost] = useState<Post | null>(null);
    const user = useAuthStore((state)=> state.user);
    
    const createdAt = new Date(post?.createdAt || new Date()).toLocaleDateString();
    const createdAtTime = new Date(post?.createdAt || new Date()).toLocaleTimeString();

    useEffect(() => {
        const fetchPost = async () => {
            const res = await fetch(`/api/post/${slug}`);
            const data = await res.json();
            setPost(data);
        }
        fetchPost();
    }, []);

    return (
        <div>
            <h1>Post Page</h1>

            <ul>
                {post && (
                    <li key={post.id}>
                        {
                            user?.username
                        }
                        <p>{createdAt} {createdAtTime}</p>
                        <p>{post.title}</p>
                        <p>{post.content}</p>
                    </li>
                )}
            </ul>
        </div>
    )
}