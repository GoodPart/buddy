"use client";

import { usePostStore } from "@/stores";
import { useEffect } from "react";
import { Post } from "../../generated/prisma/client";
export default function PostListPage() {
    const {posts, isLoading, fetchPosts} = usePostStore();

    useEffect(() => {
        fetchPosts();
        console.log(posts);
    }, [fetchPosts]);

    if(isLoading) return <div>Loading...</div>;
    if(posts.length === 0) return <div>No posts found</div>;
    
    return (
        <div>
            <h1>Post List Page</h1>
            <ul>
                {posts.map((post: Post) => (
                    <li key={post.id}>{post.title}</li>
                ))}
            </ul>
        </div>
    )
}