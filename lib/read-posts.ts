const KEY = "BUDDY_READ_POSTS";

export function readPosts() {
    if( typeof window === "undefined") return [];

    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
}

export function makePostAsRead(postId : string) {
    const ids = new Set(readPosts());

    ids.add(postId);
    localStorage.setItem(KEY, JSON.stringify([...ids]));
}