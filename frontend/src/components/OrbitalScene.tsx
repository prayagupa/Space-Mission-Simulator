import Icon from "./Icon";

export default function OrbitalScene() {
  return (
    <div className="orbital-scene" aria-hidden="true">
      <div className="orbital-glow" />
      <svg className="orbit-lines orbit-lines-back" viewBox="0 0 600 400" fill="none">
        <ellipse cx="322" cy="205" rx="257" ry="118" transform="rotate(-29 322 205)" stroke="#7c9ab6" strokeOpacity=".19" />
        <ellipse cx="322" cy="205" rx="280" ry="159" transform="rotate(-29 322 205)" stroke="#7c9ab6" strokeOpacity=".12" strokeDasharray="3 7" />
        <path d="M322 5v12m0 375v-12M24 205h12m553 0h-12" stroke="#a5bfd2" strokeOpacity=".3" />
      </svg>
      <div className="earth-globe">
        <img src="/images/earth.webp" alt="" width="1000" height="1000" decoding="async" />
        <div className="earth-shade" />
      </div>
      <svg className="orbit-lines orbit-lines-front" viewBox="0 0 600 400" fill="none">
        <path d="M77 291C120 365 365 325 536 136" stroke="#afc4d4" strokeOpacity=".35" />
        <circle cx="112" cy="316" r="5" fill="#fb8c67" />
        <circle cx="112" cy="316" r="10" stroke="#fb8c67" strokeOpacity=".3" />
        <path d="m477 86 19-25h57" stroke="#9cb6d3" strokeOpacity=".5" />
        <circle cx="477" cy="86" r="3" fill="#c7d9eb" />
      </svg>
      <div className="planet-label"><span className="status-dot" />EARTH<small>OUR HOME. YOUR LAUNCHPAD.</small></div>
      <div className="orbit-craft"><Icon name="rocket" size={25} /></div>
      <span className="orbit-caption">SOL SYSTEM <span>/</span> SECTOR 01</span>
    </div>
  );
}
