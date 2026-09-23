import type { SVGProps } from 'react';
type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size?: number): Record<string,unknown> => ({ width: size||20, height: size||20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' });
export const I_Dashboard = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>);
export const I_Chart = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M3 3v18h18"/><path d="M7 15l3-4 3 2 4-6"/></svg>);
export const I_Strategy = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9" strokeDasharray="3 3"/><path d="M12 3v-2M12 23v-2M3 12H1M23 12h-2"/></svg>);
export const I_Tools = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4L15 12l-3-3 2.7-2.7z"/></svg>);
export const I_Megaphone = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M3 11v2a1 1 0 0 0 1 1h2l3.5 4.5a1 1 0 0 0 1.7-.7V6.2a1 1 0 0 0-1.7-.7L6 10H4a1 1 0 0 0-1 1z"/><path d="M11 9.5a3 3 0 0 1 0 5"/></svg>);
export const I_Whatsapp = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z"/><path d="M8.5 9.5c.5 2.5 3.5 5.5 6 6l1.5-1.5-1.5-1.5-1 .8c-.8-.6-2-1.6-2.6-2.4l.9-1-1.8-1.6-1.5 2.2z"/></svg>);
export const I_Image = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>);
export const I_User = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/></svg>);
export const I_Users = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="9" cy="8" r="3.5"/><path d="M3 21v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a4 4 0 0 1 4 4v3"/></svg>);
export const I_Credit = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>);
export const I_Settings = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>);
export const I_File = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>);
export const I_Search = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>);
export const I_Sun = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>);
export const I_Moon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>);
export const I_Bell = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>);
export const I_ArrowRight = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>);
export const I_ArrowLeft = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>);
export const I_Check = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 12l5 5L20 6"/></svg>);
export const I_Plus = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 5v14M5 12h14"/></svg>);
export const I_Upload = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/></svg>);
export const I_Edit = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>);
export const I_Trash = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>);
export const I_Copy = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>);
export const I_Link = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>);
export const I_Menu = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>);
export const I_X = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>);
export const I_Sparkle = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg>);
export const I_Mail = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>);
export const I_Lock = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>);
export const I_Eye = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>);
export const I_Trend = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M3 17l6-6 4 4 7-7"/><path d="M14 7h6v6"/></svg>);
export const I_Wallet = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M20 7v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7"/><path d="M16 14h2"/></svg>);
export const I_Filter = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 5h16M7 12h10M10 19h4"/></svg>);
export const I_Cal = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
export const I_Star = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>);
export const I_Shield = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/></svg>);
export const I_Doc = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>);
export const I_Home = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>);
export const I_Logout = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>);
export const I_Send = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>);
export const I_Dot = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="3"/></svg>);
export const I_ChevUp = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M18 15l-6-6-6 6"/></svg>);
export const I_ChevDn = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M6 9l6 6 6-6"/></svg>);
export const I_Pause = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="7" y="5" width="3" height="14" rx="1"/><rect x="14" y="5" width="3" height="14" rx="1"/></svg>);
export const I_Play = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/></svg>);
export const I_Target = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>);
export const I_Heart = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 21s-7.5-4.6-9.8-9.2C.6 8.4 2.6 4.5 6.2 4.5c2.2 0 3.8 1.2 4.8 3 1-1.8 2.6-3 4.8-3 3.6 0 5.6 3.9 4 7.3C19.5 16.4 12 21 12 21z"/></svg>);

export const I_Gift = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M5 8h14M12 8v13M12 8s-1-5-3.5-5 1.5 5 3.5 5zm0 0s1-5 3.5-5-1.5 5-3.5 5z"/></svg>);
export const I_Percent = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M19 5L5 19"/><circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="16" r="2.5"/></svg>);
export const I_Thumb = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M7 10v11H4a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1z"/><path d="M7 10l4-7a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1.3 6A2 2 0 0 1 16.7 19H7"/></svg>);
export const I_Globe = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>);
export const I_Rocket = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M16.5 3.5c4 0 4.5 1 4.5 4.5-3.5 2.5-6 4-9 4.5"/><path d="M12 12c0-3 1.5-5.5 4.5-8.5L9 10c0 2-1 4-3 5l-2-2c1-2 3-3 5-3"/></svg>);
export const I_Bank = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 11h18M8 15h4"/></svg>);
export const I_Camera = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>);
export const I_Download = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 3v12M6 9l6 6 6-6"/><path d="M4 21h16"/></svg>);
export const I_Zap = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
export const I_Refresh = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v5h-5"/></svg>);
export const I_Qr = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14h1M14 20h1M18 18h3v3h-3z"/></svg>);

export const SinkrooMark = ({ size = 34, radius = 10 }: { size?: number; radius?: number }) => (
  <img
    src="67.png"
    alt="Sinkroo"
    width={size}
    height={size}
    style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', display: 'block' }}
  />
);

export const I_Checklist = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3.5V2h6v1.5M8 10l1.5 1.5L12 9M8 15l1.5 1.5L12 14"/></svg>);

export const I_Question = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M9.1 9a3 3 0 015.8 1c0 2-3 2.5-3 4.5"/><circle cx="12" cy="18" r=".7" fill="currentColor" stroke="none"/></svg>);
export const I_Clock = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);

export const I_Robot = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="5" y="8" width="14" height="10" rx="2"/><circle cx="9.5" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r="1.2" fill="currentColor" stroke="none"/><path d="M12 8V5M9 18v2M15 18v2"/><circle cx="12" cy="4" r="1.3"/></svg>);
export const I_Chat = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.2A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/></svg>);
export const I_Film = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>);
export const I_Trophy = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M8 21h8M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/></svg>);
export const I_Palette = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.4-2-.6-1 .1-2 1.3-2H18a3 3 0 0 0 3-3c0-5.4-4-11-9-11z"/><circle cx="7.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9.5" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="8" r="1" fill="currentColor" stroke="none"/></svg>);
export const I_Vote = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M9 12l2 2 4-4"/><path d="M5 3h14v18l-7-3-7 3z"/></svg>);
