import React, { useRef, useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { HomeIcon, CalenderIcon, DocsIcon, ListIcon, VideoIcon } from "../atoms/Icons";

const BottomNavigationBar: React.FC = () => {
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(375);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const update = () => setW(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { name: "Absen", path: "/attendance/gate-scan", icon: <VideoIcon className="w-5 h-5" /> },
    { name: "Izin", path: "/leaves/requests", icon: <DocsIcon className="w-5 h-5" /> },
    { name: "Beranda", path: "/", icon: <HomeIcon className="w-5 h-5" /> },
    { name: "Jadwal", path: "/student/schedule/weekly", icon: <CalenderIcon className="w-5 h-5" /> },
    { name: "Lainnya", path: "/menu", icon: <ListIcon className="w-5 h-5" /> },
  ];

  let activeIndex = navItems.findIndex((item) => isActive(item.path));
  if (activeIndex === -1) activeIndex = 4; // Defaults to 'Lainnya' if route is not explicitly mapped

  // ── Geometry ──
  const navH = 64;
  const paddingX = 16; // px-4
  const gridW = w - paddingX * 2;
  const colW = gridW / 5;
  const cx = paddingX + colW * activeIndex + colW / 2;

  // The sliding container is very wide (3x screen width)
  const svgW = w * 3;
  const svgCenter = svgW / 2;

  // Container height includes space for the floating circle
  const floatSpace = 24;
  const containerH = navH + floatSpace; // 88
  const navTop = floatSpace; // 24

  // Mathematically perfect tangent points for a 24px circle with a 6px uniform gap
  // Cutout radius (R) = 24 + 6 = 30
  // Top corner radius (r) = 12
  const dx = 40.249;
  const Px = 28.749;
  const Py = 8.571;

  // SVG Path: draws a straight line, dips into a perfect circular cutout, and continues straight
  const path = `
    M 0 ${navTop}
    L ${svgCenter - dx} ${navTop}
    A 12 12 0 0 1 ${svgCenter - Px} ${navTop + Py}
    A 30 30 0 0 0 ${svgCenter + Px} ${navTop + Py}
    A 12 12 0 0 1 ${svgCenter + dx} ${navTop}
    L ${svgW} ${navTop}
    L ${svgW} ${containerH}
    L 0 ${containerH}
    Z
  `;

  // Brand circle exactly shares the center point of the cutout arc
  const circleD = 48;
  const circleR = circleD / 2;
  const circleTop = navTop - circleR; // 24 - 24 = 0

  // Sliding translation: moves the center of the wide SVG exactly to the active tab
  const translateX = cx - svgCenter;

  return (
    <nav ref={navRef} className="fixed bottom-0 left-0 z-[9999] w-full lg:hidden pointer-events-none">
      <div className="relative w-full" style={{ height: containerH }}>

        {/* ── Sliding Layer (Notch Background + Brand Circle) ── */}
        <div
          className="absolute top-0 left-0 h-full pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ width: svgW, transform: `translateX(${translateX}px)` }}
        >
          {/* SVG Background */}
          <svg className="absolute inset-0 w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="notch-shadow" x="-5%" y="-20%" width="110%" height="140%">
                <feDropShadow dx="0" dy="-1" stdDeviation="3" floodColor="rgba(0,0,0,0.06)" />
              </filter>
            </defs>
            <path d={path} className="fill-white dark:fill-gray-900" filter="url(#notch-shadow)" />
          </svg>

          {/* Brand Circle (floats perfectly centered inside the notch) */}
          <div
            className="absolute rounded-full bg-brand-500 flex items-center justify-center border-[3px] border-white dark:border-gray-900"
            style={{
              left: svgCenter - circleR,
              top: circleTop,
              width: circleD,
              height: circleD,
              // Subtle shadow to prevent bleeding into the gap
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          />
        </div>

        {/* ── Static Grid Layer (Icons & Text) ── */}
        <div
          className="absolute bottom-0 left-0 w-full pointer-events-auto px-4"
          style={{ height: navH }}
        >
          <div className="grid h-full max-w-lg mx-auto grid-cols-5">
            {navItems.map((item, index) => {
              const active = index === activeIndex;
              return (
                <Link
                  key={index}
                  to={item.path}
                  className="relative flex items-center justify-center group overflow-visible"
                >
                  {/* Icon moves UP into the brand circle when active */}
                  <div
                    className={`flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                      active ? "text-white" : "text-gray-400 group-hover:text-brand-500"
                    }`}
                    style={{ transform: `translateY(${active ? -32 : -8}px)`, zIndex: 10 }}
                  >
                    {item.icon}
                  </div>
                  {/* Label stays at the bottom */}
                  <span
                    className={`absolute bottom-[14px] text-[10px] transition-all duration-300 ${
                      active
                        ? "text-brand-600 font-bold dark:text-brand-400"
                        : "text-gray-400 font-medium dark:text-gray-500"
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigationBar;
