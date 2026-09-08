/**
 * Inline SVG icons.
 *
 * Inline rather than an icon font or a sprite sheet: there are only a handful,
 * they inherit currentColor for free, and it keeps the promise that this app
 * fetches nothing it did not ship.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const DownloadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 4v13" />
    <path d="m6 12 6 6 6-6" />
  </Icon>
);

export const UploadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 20V7" />
    <path d="m6 12 6-6 6 6" />
  </Icon>
);

export const PingIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 12h4l2.5-6 4 12 2.5-6h5" />
  </Icon>
);

export const JitterIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 16h3l2-8 3 12 3-14 2 10h5" />
  </Icon>
);

export const ServerIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="7" rx="2" />
    <rect x="3" y="13" width="18" height="7" rx="2" />
    <path d="M7 7.5h.01M7 16.5h.01" />
  </Icon>
);

export const GlobeIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" />
  </Icon>
);

export const RestartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 12a9 9 0 1 1-3.2-6.9" />
    <path d="M21 4v5h-5" />
  </Icon>
);

export const ShareIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </Icon>
);

export const CopyIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m5 13 4 4L19 7" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const ImageIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m21 16-5-5-4 4-2-2-7 7" />
  </Icon>
);

export const HistoryIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 12a9 9 0 1 0 3.2-6.9" />
    <path d="M3 4v5h5" />
    <path d="M12 8v4l3 2" />
  </Icon>
);
