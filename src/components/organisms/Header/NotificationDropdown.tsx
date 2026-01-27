import { useState, useEffect, useRef } from "react";
import Dropdown from "../../molecules/Dropdown";
import { Link, useNavigate } from "react-router";
import notificationService from "../../../api/services/notificationService";
import { Notification } from "../../../api/types/notification";
import { formatDistanceToNow } from "date-fns";
import { MailIcon } from "../../atoms/Icons"; // Assuming ClockIcon exists or use generic SVGs

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
      try {
          setIsLoading(true);
          const res = await notificationService.getNotifications({ limit: 5 });
          setNotifications(res.data.data);
          
          const unreadRes = await notificationService.getNotifications({ status: 'unread', limit: 1 });
          setUnreadCount(unreadRes.data.meta.total);

      } catch (error) {
          console.error("Failed to fetch notifications", error);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      fetchNotifications();
  }, []);

  function toggleDropdown() {
    setIsOpen(!isOpen);
    if (!isOpen) fetchNotifications(); // Refresh on open
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleNotificationClick = async (notification: Notification) => {
      if (!notification.readAt) {
          try {
              await notificationService.markAsRead(notification.id);
              // Optimistic update
              setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n));
              setUnreadCount(prev => Math.max(0, prev - 1));
          } catch (e) {
              console.error(e);
          }
      }
      closeDropdown();
      if (notification.metadata?.link) {
          navigate(notification.metadata.link);
      }
  };

  const handleMarkAllRead = async () => {
      try {
          await notificationService.markAllAsRead();
          setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
          setUnreadCount(0);
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-error-500 ring-2 ring-white dark:ring-gray-900 ${
            unreadCount === 0 ? "hidden" : "flex"
          }`}
        ></span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[70px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[400px] lg:right-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h5 className="text-sm font-semibold text-gray-800 dark:text-white">
            Notifications {unreadCount > 0 && <span className="ml-1 text-xs font-medium text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full dark:bg-brand-500/10 dark:text-brand-400">{unreadCount} new</span>}
          </h5>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
                <button 
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-gray-500 hover:text-brand-600 transition-colors"
                >
                    Mark all read
                </button>
            )}
             <button
                onClick={closeDropdown}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>
        
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
           {isLoading ? (
               <div className="flex justify-center py-10"><div className="animate-spin size-6 border-2 border-brand-500 border-t-transparent rounded-full"></div></div>
           ) : notifications.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="size-12 rounded-full bg-gray-50 flex items-center justify-center mb-3 dark:bg-white/5">
                        <MailIcon className="size-6 text-gray-300" />
                    </div>
                   <p className="text-sm text-gray-500">No new notifications</p>
               </div>
           ) : (
               <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                   {notifications.map((notif) => (
                        <li key={notif.id}>
                            <button
                                onClick={() => handleNotificationClick(notif)}
                                className={`w-full text-left flex items-start gap-4 px-4 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${!notif.readAt ? 'bg-brand-50/30 dark:bg-brand-500/5' : ''}`}
                            >
                                <div className={`shrink-0 relative flex h-10 w-10 items-center justify-center rounded-full ${
                                    !notif.readAt 
                                        ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400' 
                                        : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                                }`}>
                                     <MailIcon className="size-5" />
                                     {!notif.readAt && (
                                        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-error-500 dark:border-gray-950"></span>
                                     )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h6 className={`text-sm truncate pr-2 ${!notif.readAt ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                                            {notif.title}
                                        </h6>
                                        <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap mt-0.5">
                                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                        {notif.message}
                                    </p>
                                </div>
                            </button>
                        </li>
                   ))}
               </ul>
           )}
        </div>
        
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
            <Link
            to="/notifications"
            onClick={closeDropdown}
            className="flex items-center justify-center w-full px-4 py-2 text-xs font-semibold tracking-wide text-brand-600 uppercase transition-colors rounded-lg hover:bg-brand-50 hover:text-brand-700 dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
            See All Notifications
            </Link>
        </div>
      </Dropdown>
    </div>
  );
}
