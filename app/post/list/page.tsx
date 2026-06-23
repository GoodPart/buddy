"use client";

import { usePostStore, useAuthStore } from "@/stores";
import { useEffect } from "react";
import { Post, User } from "../../generated/prisma/client";
import Link from "next/link";

const Card = ({post, user}: {post: Post, user: User}) => {
    const createdAt = new Date(post.createdAt).toLocaleDateString();
    const createdAtTime = new Date(post.createdAt).toLocaleTimeString();
    return (
        <div className="border-1 border-gray-600 rounded-md p-4">
            <Link href={`/post/detail/${post.id}`}>
                <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                        <p>{user.username}</p>
                    </div>
                    <p className="text-sm text-gray-500">{createdAt} {createdAtTime}</p>
                </div>
                <div className="mt-2">
                    like : 4 | unlike : 0
                </div>
                <div className="mt-4">
                    <p>{post.title}</p>
                    <p className="text-sm text-gray-500">{post.content}</p>
                </div>
            </Link>
        </div>
    )
}

export default function PostListPage() {
    const {posts, isLoading, fetchPosts} = usePostStore();
    const user = useAuthStore((state)=> state.user);
    useEffect(() => {
        fetchPosts();
        console.log(posts);
    }, [fetchPosts]);

    if(isLoading) return <div>Loading...</div>;
    if(posts.length === 0) return <div>No posts found</div>;
    
    return (
        <div>
            <h1>Post List Page</h1>

            <ul className="flex flex-col gap-4 mt-4">
                {posts.map((post: Post) => (
                    <li key={post.id}>
                        <Card post={post} user={user as User} />
                    </li>
                ))}
            </ul>
        </div>
    )
}