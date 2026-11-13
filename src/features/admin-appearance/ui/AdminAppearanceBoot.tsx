import "./admin-appearance.css";
import { AdminAppearanceObserver } from "./AdminAppearanceObserver";

// This script runs in the admin layout only, before the first paint. The HTML
// root already suppresses hydration differences introduced by bootstrap scripts.
const boot = `(function(){try{var s=JSON.parse(localStorage.getItem('bi:admin-appearance')||'null'),p=s&&s.state&&s.state.value||{},t=p.theme,d=t==='dark'||t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches,r=document.documentElement;r.dataset.adminTheme=d?'dark':'light';r.dataset.adminSidebar=p.collapsed===true?'collapsed':'expanded'}catch(e){document.documentElement.dataset.adminTheme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}})()`;
export function AdminAppearanceBoot() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <AdminAppearanceObserver />
    </>
  );
}
