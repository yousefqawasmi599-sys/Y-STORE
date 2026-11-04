// Thin line icons shared by the header, cards and drawers.
const base = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

export const SearchIcon = () => <svg {...base}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>;
export const HeartIcon = ({ filled }) => <svg {...base} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" /></svg>;
export const UserIcon = () => <svg {...base}><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20.5c1-4.2 4.2-5.8 7.5-5.8s6.5 1.6 7.5 5.8" /></svg>;
export const BagIcon = () => <svg {...base}><path d="M5.5 8h13l-1 12.5h-11Z" /><path d="M9 10V6.8a3 3 0 0 1 6 0V10" /></svg>;
export const CloseIcon = () => <svg {...base} width={18} height={18}><path d="M6 6l12 12M18 6 6 18" /></svg>;
