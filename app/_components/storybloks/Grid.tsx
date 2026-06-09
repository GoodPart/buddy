import { StoryblokServerComponent } from '@storyblok/react/rsc'

export default function Grid({ blok }: { blok: any }) {
  return (
    <div className="grid">
      {blok.columns?.map((nestedBlok: any) => (
        <StoryblokServerComponent blok={nestedBlok} key={nestedBlok._uid} />
      ))}
    </div>
  );
};