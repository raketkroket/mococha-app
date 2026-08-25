import type { CSSProperties } from "react";

type IconProps = { size?: number; className?: string; style?: CSSProperties; fill?: boolean };

const make = (path: React.ReactNode, vb = "0 0 24 24") =>
  function Icon({ size = 22, className, style, fill = false }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size} height={size} viewBox={vb}
        fill={fill ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round" strokeLinejoin="round"
        className={className} style={style} aria-hidden="true"
      >{path}</svg>
    );
  };

export const HomeIcon = make(<><path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M5.5 9.5V20h13V9.5"/></>);
export const ShopIcon = make(<><path d="M4.5 7.5h15l-1 3.5H5.5z"/><path d="M5.5 11v8.5h13V11"/><path d="M9 19.5v-4.5h6v4.5"/></>);
export const SparklesIcon = make(<><path d="M12 3.5l1.4 4.1 4.1 1.4-4.1 1.4L12 14.5l-1.4-4.1L6.5 9l4.1-1.4z"/><path d="M18.5 14l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/></>);
export const LayersIcon = make(<><path d="m12 4 8 4-8 4-8-4z"/><path d="m4 12 8 4 8-4"/><path d="m4 16 8 4 8-4"/></>);
export const BuildIcon = make(<><path d="m12 4 8 4-8 4-8-4z"/><path d="m4 12 8 4 8-4"/><path d="m4 16 8 4 8-4"/></>);
export const ConceptIcon = make(<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></>);
export const InspireIcon = make(<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>);
export const HeartIcon = make(<path d="M12 19.5s-6.5-4.2-6.5-9.5A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 6.5 3C18.5 15.3 12 19.5 12 19.5z"/>);
export const UserIcon = make(<><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c0-3.5 3.5-5.5 7-5.5s7 2 7 5.5"/></>);
export const CartIcon = make(<><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M3 4.5h2l2 11h11l1.5-8H6.5"/></>);
export const SearchIcon = make(<><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></>);
export const ChevronLeft = make(<path d="M14.5 6l-6 6 6 6"/>);
export const ChevronRight = make(<path d="M9.5 6l6 6-6 6"/>);
export const ChevronDown = make(<path d="M6 9.5l6 6 6-6"/>);
export const XIcon = make(<><path d="M6.5 6.5l11 11"/><path d="M17.5 6.5l-11 11"/></>);
export const PlusIcon = make(<><path d="M12 5.5v13"/><path d="M5.5 12h13"/></>);
export const MinusIcon = make(<path d="M5.5 12h13"/>);
export const TruckIcon = make(<><path d="M3 6.5h11v9H3z"/><path d="M14 9.5h3.5l3 3v3H14"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></>);
export const CheckIcon = make(<path d="M5 12l4.5 4.5L19 6.5"/>);
export const CheckCircle = make(<><circle cx="12" cy="12" r="8.5"/><path d="M8 12l3 3 5-5.5"/></>);
export const StarIcon = make(<path d="M12 3.5l2.3 6 6.2.5-4.8 4 1.5 6L12 16.5l-4.8 3 1.5-6-4.8-4 6.2-.5z"/>);
export const ShareIcon = make(<><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M8 11l8-4"/><path d="M8 13l8 4"/></>);
export const BellIcon = make(<><path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 4.5 2 5.5 2 5.5H4.5s2-1 2-5.5"/><path d="M10 19a2 2 0 0 0 4 0"/></>);
export const MailIcon = make(<><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 7.5l9 6 9-6"/></>);
export const MapPinIcon = make(<><path d="M12 21s-6.5-5.5-6.5-10.5A6.5 6.5 0 0 1 18.5 10.5C18.5 15.5 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.3"/></>);
export const AlertIcon = make(<><path d="M12 3.5l9.5 17H2.5z"/><path d="M12 10v4"/><circle cx="12" cy="16.5" r="0.5" fill="currentColor"/></>);
export const ImageIcon = make(<><rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 15l-5-4-5 5"/></>);
export const SettingsIcon = make(<><circle cx="12" cy="12" r="2.5"/><path d="M12 3v2.5M12 18.5V21M4.5 4.5l1.8 1.8M17.7 17.7l1.8 1.8M3 12h2.5M18.5 12H21M4.5 19.5l1.8-1.8M17.7 6.3l1.8-1.8"/></>);
export const TrashIcon = make(<><path d="M4.5 7h15"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 12.5h10L18.5 7"/></>);
export const ArrowLeft = make(<path d="M19 12H5.5M11 6.5l-5.5 5.5 5.5 5.5"/>);
export const SlidersIcon = make(<><path d="M4 6h9M17.5 6h2.5"/><path d="M4 12h2.5M9.5 12H20"/><path d="M4 18h11M18.5 18h1.5"/><circle cx="15.5" cy="6" r="1.8"/><circle cx="7.5" cy="12" r="1.8"/><circle cx="16.5" cy="18" r="1.8"/></>);
export const PackageIcon = make(<><path d="M12 3.5l7.5 4v9L12 20.5l-7.5-4v-9z"/><path d="M4.5 7.5l7.5 4 7.5-4"/><path d="M12 11.5v9"/></>);
export const CreditCard = make(<><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18"/></>);
export const ClockIcon = make(<><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></>);
export const PaperclipIcon = make(<path d="M18.5 11.5l-7 7a4 4 0 0 1-5.7-5.7l8-8a2.7 2.7 0 0 1 3.8 3.8l-8 8a1.3 1.3 0 0 1-1.9-1.9l7.1-7.1"/>);
export const SendIcon = make(<path d="M4.5 12L20 5l-4.5 15-3-6.5z"/>);
export const ShieldIcon = make(<path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3z"/>);
export const TrendingIcon = make(<><path d="M3.5 17l5-5 4 4 6-7"/><path d="M14.5 9h4v4"/></>);
export const UploadIcon = make(<><path d="M12 15.5V4.5"/><path d="M8 8.5L12 4.5l4 4"/><path d="M5.5 14.5v4A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5v-4"/></>);
export const EditIcon = make(<><path d="M4.5 19.5l3.5-1L19 7.5 16.5 5 5.5 16l-1 3.5z"/><path d="M14.5 7L17 9.5"/></>);
export const KeyIcon = make(<><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3"/><path d="M16 7l3 3"/><path d="M18.5 4.5L21 7"/></>);
export const CopyIcon = make(<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>);
export const FingerprintIcon = make(<><path d="M12 4.5a7.5 7.5 0 0 0-7.5 7.5v3"/><path d="M12 4.5a7.5 7.5 0 0 1 7.5 7.5v3"/><path d="M7.5 15v-3a4.5 4.5 0 0 1 9 0v3"/><path d="M10.5 15v-3a1.5 1.5 0 0 1 3 0v3"/><path d="M10.5 15v3a1.5 1.5 0 0 0 3 0"/></>);
export const SmartphoneIcon = make(<><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/></>);
export const MonitorIcon = make(<><rect x="3" y="4.5" width="18" height="13" rx="2"/><path d="M9 21h6"/><path d="M12 17.5V21"/></>);
export const LockIcon = make(<><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>);
export const KeySquareIcon = make(<><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 12a2 2 0 1 0 4 0"/><path d="M11 12v3"/><path d="M11 15l3 3"/></>);
