"use client";

import { useAuthStore } from "@/stores";
import { Post, User } from "@/app/generated/prisma/client";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

import {usePostStore} from "@/stores/post-store";
import { useRouter } from "next/navigation";
import { makePostAsRead } from "@/lib/read-posts";



export default function PostPage() {
    const {slug} = useParams();
    const [post, setPost] = useState<Post & {author: User} | null>(null);
    const {isLoading} = usePostStore();
    const {isLoading: isAuthLoading, user, isAuthed} = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const originalRef = useRef<{ title: string; content: string } | null>(null);
    const router = useRouter();


    const createdAt = new Date(post?.createdAt || new Date()).toLocaleDateString();
    const createdAtTime = new Date(post?.createdAt || new Date()).toLocaleTimeString();
    
    // 글 작성자인지 확인
    const isAuthor = isAuthed && user?.id === post?.authorId;
    
    useEffect(() => {
        if(slug) {
            makePostAsRead(slug as string);
        }
    }, [slug]);

    useEffect(() => {
        const fetchPost = async () => {
            const res = await fetch(`/api/post/${slug}`);
            const data = await res.json();
            setPost(data);
        }
        fetchPost();
    }, [slug]);

    const handleEdit = () => {
        if(!post) return;
        originalRef.current = { title: post.title, content: post.content };
        setIsEditing(true);
    }
    // "저장" 클릭 → 변경 있을 때만 API
    const handleSave = async () => {
        if (!post || !originalRef.current) return;

        const { title, content } = post;
        const { title: origTitle, content: origContent } = originalRef.current;

        // 변경 없음 api 스킵
        if (title === origTitle && content === origContent) {
            setIsEditing(false);
            return; // API 호출 안 함
        }
        
        setIsSaving(true);
        try {
            const res = await fetch(`/api/post/${slug}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content }),
            });
            const data = await res.json();
            
            if(!res.ok) {
                throw new Error(data.message || "게시글 수정 실패");
            }

            setPost({...post, title, content});
            originalRef.current = { title, content };
            setIsEditing(false);
        }catch(error) {
            console.error(error);
            alert(error || "게시글 수정 실패");
        }finally {
            setIsSaving(false);
        }
    };

    // "취소" → 스냅샷으로 복원
    const handleCancel = () => {
        if (originalRef.current && post) {
        setPost({ ...post, ...originalRef.current });
        }
        originalRef.current = null;
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if(!post) return;
        if(!confirm("정말 삭제하시겠습니까?")) return;
        try {
            const res = await fetch(`/api/post/${slug}`, {
                method : "DELETE",
            });

            const data = await res.json();

            if(!res.ok) {
                throw new Error(data.message || "게시글 삭제 실패");
            }
            setPost(null);
            router.push("/post/list");
        } catch(error) {
            console.error(error);
            alert(error || "게시글 삭제 실패");
        }
    }
    if(isLoading) return <div>Loading...</div>;
    if(isAuthLoading) return <div>Loading...</div>;


    return (
        <div className="w-full">
          
            <ul>
                {post && (
                    <li key={post.id}>
                        <p>{post.author.username}</p>
                       
                        {isAuthor && (
                            <div className="absolute right-0 top-0 flex gap-2">
                                <button
                                    type="button"
                                    className="bg-red-500 text-white rounded-md p-2"
                                    onClick={handleDelete}
                                >
                                    삭제
                                </button>
                                {!isEditing ? (
                                <button
                                    type="button"
                                    className="bg-blue-500 text-white rounded-md p-2"
                                    onClick={handleEdit}
                                >
                                    수정
                                </button>
                                ) : (
                                <>
                                    <button
                                    type="button"
                                    className="bg-green-500 text-white rounded-md p-2"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    >
                                    {isSaving ? "저장 중..." : "저장"}
                                    </button>
                                    <button
                                    type="button"
                                    className="bg-gray-500 text-white rounded-md p-2"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    >
                                    취소
                                    </button>
                                </>
                                )}
                            </div>
                        )}
                        <p>{createdAt} {createdAtTime}</p>
                        <div className="relative w-[50%] ">
                            <input className={`w-full border-1 border-gray-600 rounded-md p-2`} type="text"
                             value={post.title}
                             onChange={(e) => setPost({...post, title: e.target.value})}
                             disabled={!isEditing}
                            />
                        </div>
                        <div>
                            <textarea className={`w-full border-1 border-gray-600 rounded-md p-2`}
                             value={post.content}
                             onChange={(e) => setPost({...post, content: e.target.value})}
                             disabled={!isEditing}
                            />
                        </div>
                    </li>
                )}
            </ul>
        </div>
    )
}