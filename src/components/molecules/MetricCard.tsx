import React from "react";
import Badge from "../atoms/Badge";

export type MetricColor = 'brand' | 'blue' | 'green' | 'orange' | 'yellow' | 'red' | 'indigo';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: MetricColor;
    badge?: {
        text: string;
        color: "success" | "warning" | "error" | "info" | "primary" | "light" | "dark";
        icon?: React.ReactNode;
    };
    className?: string;
}

const colorMap: Record<MetricColor, { bg: string, text: string, lightBg: string, glow: string, gradient: string }> = {
    brand: { bg: 'bg-brand-500', text: 'text-brand-500', lightBg: 'bg-brand-50 dark:bg-brand-500/10', glow: 'shadow-brand-500/20', gradient: 'from-brand-500' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-500/10', glow: 'shadow-blue-500/20', gradient: 'from-blue-500' },
    green: { bg: 'bg-green-500', text: 'text-green-500', lightBg: 'bg-green-50 dark:bg-green-500/10', glow: 'shadow-green-500/20', gradient: 'from-green-500' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-500', lightBg: 'bg-orange-50 dark:bg-orange-500/10', glow: 'shadow-orange-500/20', gradient: 'from-orange-500' },
    yellow: { bg: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-500', lightBg: 'bg-yellow-50 dark:bg-yellow-500/10', glow: 'shadow-yellow-500/20', gradient: 'from-yellow-500' },
    red: { bg: 'bg-red-500', text: 'text-red-500', lightBg: 'bg-red-50 dark:bg-red-500/10', glow: 'shadow-red-500/20', gradient: 'from-red-500' },
    indigo: { bg: 'bg-indigo-500', text: 'text-indigo-500', lightBg: 'bg-indigo-50 dark:bg-indigo-500/10', glow: 'shadow-indigo-500/20', gradient: 'from-indigo-500' },
};

const MetricCard: React.FC<MetricCardProps> = ({ 
    title, 
    value, 
    icon, 
    badge, 
    color = 'brand',
    className = ""
}) => {
    const theme = colorMap[color];

    return (
        <div className={`relative overflow-hidden rounded-[12px] border border-gray-100 bg-white p-2 md:p-3 dark:border-white/[0.05] dark:bg-[#111118] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_24px_-8px_rgba(255,255,255,0.05)] transition-all duration-300 group flex items-center gap-3 ${className}`}>
            
            {/* Abstract Background Elements */}
            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br ${theme.gradient} to-transparent opacity-[0.04] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-700 ease-out`} />

            <div className="relative z-10 flex-shrink-0">
                <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl shadow-sm transition-all duration-300 group-hover:scale-[1.12] group-hover:-rotate-3 group-hover:${theme.glow} ${theme.lightBg} ${theme.text}`}>
                    {React.isValidElement(icon)
                        ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `size-4 md:size-5 drop-shadow-sm ${((icon as React.ReactElement).props as { className?: string }).className || ''}` })
                        : icon}
                </div>
            </div>

            <div className="relative z-10 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] md:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block truncate group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        {title}
                    </span>
                    {badge && (
                        <Badge color={badge.color} className="scale-[0.7] md:scale-75 origin-right ml-1">
                            {badge.icon}
                            {badge.text}
                        </Badge>
                    )}
                </div>
                <div className="flex items-baseline mt-0.5">
                   <h4 className="font-black text-gray-900 text-base md:text-xl dark:text-white truncate tracking-tight drop-shadow-sm leading-none">
                       {value}
                   </h4>
                </div>
            </div>
            
            {/* Bottom Animated Glow Line */}
            <div className={`absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-transparent ${theme.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 w-full translate-y-1 group-hover:translate-y-0 blur-[1px]`} />
            <div className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-white dark:via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 w-full translate-y-1 group-hover:translate-y-0 z-20`} />
        </div>
    );
};

export default MetricCard;
