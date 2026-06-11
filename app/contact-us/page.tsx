import { getStoryblokApi } from "@/lib/storyblok";
import { StoryblokStory } from "@storyblok/react/rsc";

export default async function ContactUsPage() {
    const storyblokApi = getStoryblokApi();
    const { data } = await storyblokApi.get("cdn/stories/contact-us", {
        version: "draft",
    });
    console.log(data);
    return (
        <div>
            {/* <h1>Contact Us Page</h1> */}
            <StoryblokStory story={data.story} />
        </div>
    )
}