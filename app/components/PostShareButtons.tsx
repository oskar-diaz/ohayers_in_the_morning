"use client";

import {
  BlueskyIcon,
  BlueskyShareButton,
  FacebookIcon,
  FacebookShareButton,
  ThreadsIcon,
  ThreadsShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton,
} from "react-share";

type PostShareButtonsProps = {
  title: string;
  url: string;
};

const shareButtons = [
  {
    Button: TwitterShareButton,
    Icon: TwitterIcon,
    label: "Twitter",
  },
  {
    Button: WhatsappShareButton,
    Icon: WhatsappIcon,
    label: "WhatsApp",
  },
  {
    Button: FacebookShareButton,
    Icon: FacebookIcon,
    label: "Facebook",
  },
  {
    Button: ThreadsShareButton,
    Icon: ThreadsIcon,
    label: "Threads",
  },
  {
    Button: BlueskyShareButton,
    Icon: BlueskyIcon,
    label: "Bluesky",
  },
] as const;

export default function PostShareButtons({
  title,
  url,
}: PostShareButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {shareButtons.map(({ Button, Icon, label }) => (
        <Button key={label} url={url} title={title} aria-label={`Compartir en ${label}`}>
          <span className="editorial-cta editorial-share-button">
            <Icon size={34} round={false} borderRadius={12} />
          </span>
        </Button>
      ))}
    </div>
  );
}
