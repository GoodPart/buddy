import {
    storyblokEditable,
    StoryblokServerComponent,
  } from '@storyblok/react/rsc';
  
  export default function Page({ blok }: { blok: any }) {
    return (
        <div>
            {
                blok.body?.map((nestedBlok: any) => (
                <StoryblokServerComponent blok={nestedBlok} key={nestedBlok._uid} />
                ))
            }
        </div>
    );
  }