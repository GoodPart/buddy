import { storyblokEditable, StoryblokServerComponent } from "@storyblok/react/rsc";
import LatestContentsTabs from "../tabs/TabContent";

export default function LatestContents({ blok }: { blok: any }) {
    const tabData = blok.story.content.body;

    const tabs = tabData.map((section: any) => ({
        sectionTitle: section.sectionTitle,
        items: section.lendingItem.map((lending: any) => ({
          title: lending.title,
          link: lending.link,
          img: lending.img.filename,
          _uid: lending._uid,
        })),
      }));


    return (
        <div className="latest-contents bg-[#f2f2f2] py-8" {...storyblokEditable(blok)}>
            <LatestContentsTabs tabs={tabs} />
        </div>
    );
}