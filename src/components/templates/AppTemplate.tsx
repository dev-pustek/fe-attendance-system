import { SidebarProvider, useSidebar } from "../../context/SidebarContext";
import { Outlet, useLocation } from "react-router";
import AppHeader from "../organisms/AppHeader";
import Backdrop from "../atoms/Backdrop";
import AppSidebar from "../organisms/AppSidebar";

import BottomNavigationBar from "../organisms/BottomNavigationBar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isMenu = location.pathname === "/menu";
  const noPaddingOnMobile = isHome || isMenu;

  return (
    <div className="min-h-screen xl:flex pb-16 lg:pb-0">
      <div className="hidden lg:block">
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-[margin-left] duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        }`}
      >
        <div className={isHome ? "hidden lg:block" : "block"}>
          <AppHeader />
        </div>
        {/* Spacer to push content below fixed header on desktop */}
        <div className={`hidden lg:block ${isHome ? "hidden" : "h-[72px]"}`} />
        <div className={`mx-auto max-w-(--breakpoint-2xl) ${noPaddingOnMobile ? "p-0 lg:p-6" : "p-4 md:p-6"}`}>
          <Outlet />
        </div>
      </div>
      <BottomNavigationBar />
    </div>
  );
};

const AppTemplate: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppTemplate;
