import { storyblokEditable } from "@storyblok/react/rsc";
import SignupForm from "../auth/SignupForm";
export default function Signup({blok}: {blok: any}) {

    return (
        <div className={`signup flex flex-col gap-2`} {...storyblokEditable(blok)}>
            <SignupForm blok={blok} />
        </div>
    )
}