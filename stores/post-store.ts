import { User } from "@/app/generated/prisma/client";
import {create} from "zustand";

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
    isLoading : boolean;
    error : string;
    fetchPosts : () => Promise<void>;
    createPost : (title : string, content : string) => Promise<void>;
}

export const usePostStore = create<PostState>((set) => ({
    posts : [],
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

    }
}))