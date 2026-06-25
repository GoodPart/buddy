"use client";

import { usePostStore } from "@/stores";
import { useEffect } from "react";
import { Post, User } from "../../generated/prisma/client";
import Link from "next/link";
import { readPosts } from "@/lib/read-posts";

const Card = ({post}: {post: Post & {author: User}}) => {
    const createdAt = new Date(post.createdAt).toLocaleDateString();
    const createdAtTime = new Date(post.createdAt).toLocaleTimeString();
    const user = post.author.username;
    const isRead = readPosts().includes(post.id);
    return (
        <div className={`border-1 border-gray-600 rounded-md p-4 ${isRead ? "opacity-50" : ""}`}>
            <Link href={`/post/detail/${post.id}`}>
                <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                        <p>{user}</p>
                    </div>
                    <p className="text-sm text-gray-500">{createdAt} {createdAtTime}</p>
                </div>
                <div className="mt-4">
                    <p>{post.title}</p>
                    <p className="text-sm text-gray-500">{post.content}</p>
                </div>
                <div className="mt-2 flex gap-4">
                    <div>
                        like : 4 | unlike : 0
                    </div>
                    <div>
                        comment : 0
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default function PostListPage() {
    const {posts, isLoading, fetchPosts} = usePostStore();

    useEffect(() => {
        fetchPosts();
        
    }, [fetchPosts]);

    if(isLoading) return <div>Loading...</div>;
    if(posts.length === 0) return <div>No posts found</div>;
    
    return (
        <div>
            <h1>Post List Page</h1>

            <ul className="flex flex-col gap-4 mt-4">
                {posts.map((post: Post & {author: User}) => (
                    <li key={post.id}>
                        <Card post={post}/>
                    </li>
                ))}
            </ul>
        </div>
    )
}