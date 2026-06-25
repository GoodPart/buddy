import { User } from "@/app/generated/prisma/client";
import {create} from "zustand";

type Comment = {
    id : string;
    content : string;
    authorId : string;
    author : User;
    createdAt : Date;
    parentId : string;
    parent : Comment;
    replies : Comment[];
}

type Post = {
    id : string;
    title : string;
    content : string;
    authorId : string;
    author : User;
    createdAt : Date;
}

type PostState = {
    posts : Post[];
    comments : Comment[];
    isLoading : boolean;
    error : string;
    fetchPosts : () => Promise<void>;
    fetchComments : (postId : string) => Promise<void>;
    createPost : (title : string, content : string) => Promise<void>;
    deleteComment : (commentId : string) => Promise<void>;
}

export const usePostStore = create<PostState>((set) => ({
    posts : [],
    comments : [],
    isLoading : false,
    error : "",
    fetchPosts : async () => {
        set({isLoading : true});
        try {

            const res = await fetch("/api/post/product");
            const data = await res.json();
            
            if(!res.ok) {
                throw new Error("Failed to fetch posts");
            }

            set({posts : data.posts, isLoading : false});
        } catch {
            set({posts : [], isLoading : false});
            return ;
        }
    },
    createPost : async (title : string, content : string) => {
        set({isLoading : true});
        try {
            const res = await fetch("/api/post/product", {
                method : "POST",
                body : JSON.stringify({title, content}),
                headers : {
                    "Content-Type" : "application/json",
                },
            })
            const data = await res.json();
            if(!res.ok) {
                set({error : data.message});
                throw new Error("Failed to create post", data.message);
            }

            set((state)=> ({
                posts : [...state.posts, data.post],
                isLoading : false,
            }))
        }catch {
            set({isLoading : false});
            set({error : "Failed to create post"});
            return ;
        }

    },
    fetchComments : async (postId : string) => {
        set({isLoading : true});
        try {
            const res = await fetch(`/api/post/${postId}/comments`);
            const data = await res.json();
            if(!res.ok) {
                throw new Error("Failed to fetch comments");
            }
            set({comments : data.comments, isLoading : false});
        }catch {
            set({comments : [], isLoading : false});
            set({error : "Failed to fetch comments"});
            return ;
        }
    },
    deleteComment : async (commentId : string) => {
        set({isLoading : true});
        try {
            const res = await fetch(`/api/post/${commentId}/comments`, {
                method : "DELETE",
                headers : {
                    "Content-Type" : "application/json",
                },
                body : JSON.stringify({id : commentId}),
            });
            if(!res.ok) {
                throw new Error("Failed to delete comment");
            }
            set((state)=> ({
                comments : state.comments.filter((comment)=> comment.id !== commentId),
                isLoading : false,
            }));
            return ;
        } catch(error) {
            console.error(error);
            alert(error || "댓글 삭제 실패");
            set({isLoading : false});
            return ;
        }
    }
}))