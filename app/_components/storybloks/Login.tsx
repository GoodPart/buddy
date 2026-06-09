import type { Login as LoginType } from '@/.storyblok/types/293042638864865/storyblok-components';

import { SbBlokData, storyblokEditable } from "@storyblok/react/rsc";
import LoginForm from "../auth/LoginForm";
export default function Login({ blok }: { blok: LoginType }) {

    return (
        <div className={`login flex flex-col gap-2`} {...storyblokEditable(blok as SbBlokData)}>

            <LoginForm blok={blok} />
        </div>
    )
}