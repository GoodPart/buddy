
import { getStoryblokApi } from "@/lib/storyblok";
import { StoryblokStory } from "@storyblok/react/rsc";

export default async function Signin() {

    const storyblokApi = getStoryblokApi();
    const { data } = await storyblokApi.get("cdn/stories/signin", {
        version: "draft",
    });
    
    return (
        <div>
            <h2>signin page</h2>
      
            <StoryblokStory story={data.story} />
        </div>
    )
}