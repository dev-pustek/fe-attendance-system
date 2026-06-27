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
    <div className="flex h-screen pb-16 lg:pb-0">
      {/* Sidebar placeholder – sidebar itself is position:fixed inside AppSidebar */}
      <div
        className={`hidden lg:block shrink-0 transition-[width] duration-300 ease-in-out ${
          isExpanded || isHovered ? "w-[290px]" : "w-[90px]"
        }`}
      >
        <AppSidebar />
        <Backdrop />
      </div>

      {/* Scrollable content column — this is the scroll root so sticky works inside it */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className={`${isHome ? "hidden lg:block" : "block"} sticky top-0 z-30`}>
          <AppHeader />
        </div>
        <div className={`flex-1 mx-auto w-full max-w-(--breakpoint-2xl) ${noPaddingOnMobile ? "p-0 lg:p-6" : "p-4 md:p-6"}`}>
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
