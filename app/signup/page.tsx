// "use client";


import { getStoryblokApi } from "@/lib/storyblok";
import { StoryblokStory } from "@storyblok/react/rsc";
// import { FormEvent, useEffect, useState } from "react";

export default async function Signup() {
    const storyblokApi = getStoryblokApi();
    const { data } = await storyblokApi.get("cdn/stories/signup", {
        version: "draft",
    });
    // const [username, setUsername] = useState("");
    // const [password, setPassword] = useState("");

    // useEffect(() => {
    //     console.log(username, password);
    // }, [username, password]);

    // const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    //     e.preventDefault();
    //     const response = await fetch("/api/auth/register", {
    //         method: "POST",
    //         body: JSON.stringify({ username, password }),
    //         headers: {
    //             "Content-Type": "application/json",
    //         },
    //     });
    //     const data = await response.json();
    //     console.log('signup response -->',data);
    // }

    return (
        <div>
            <h2>signup page</h2>
            <StoryblokStory story={data.story} />
        </div>
    )
}