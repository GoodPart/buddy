import { storyblokEditable } from "@storyblok/react/rsc";
export default function Feature({ blok }: { blok: any }) {
    return (
      <div className="feature" {...storyblokEditable(blok)}>
        <span>{blok.name}</span>
      </div>
    );
  }