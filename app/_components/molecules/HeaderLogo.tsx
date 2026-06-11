import { storyblokEditable } from "@storyblok/react/rsc";
import Image from "next/image";

export default function HeaderLogo({ blok }: { blok: any }) {
  return (
    <div {...storyblokEditable(blok)} className="logo-wrapper">
      {blok.image?.filename && (
        <img 
          src={blok.image.filename} 
          alt={blok.image.alt || "Logo"} 
          className="h-10 w-auto"
        />
      )}
    </div>
  );
}