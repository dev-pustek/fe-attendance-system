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
        <div className={`relative overflow-hidden rounded-[20px] border border-gray-100 bg-white p-4 md:p-5 dark:border-white/[0.05] dark:bg-[#111118] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_24px_-8px_rgba(255,255,255,0.05)] transition-all duration-300 group flex flex-col justify-between ${className}`}>
            
            {/* Abstract Background Elements */}
            <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full bg-gradient-to-br ${theme.gradient} to-transparent opacity-[0.04] dark:opacity-[0.08] group-hover:scale-125 transition-transform duration-700 ease-out`} />
            <div className={`absolute right-4 bottom-4 w-12 h-12 rounded-full bg-gradient-to-tl ${theme.gradient} to-transparent opacity-0 group-hover:opacity-[0.03] dark:group-hover:opacity-[0.06] transition-opacity duration-500`} />

            <div className="relative z-10 flex items-start justify-between">
                <div className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-2xl shadow-sm transition-all duration-300 group-hover:scale-[1.12] group-hover:-rotate-3 group-hover:${theme.glow} ${theme.lightBg} ${theme.text}`}>
                    {React.isValidElement(icon)
                        ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `size-5 md:size-6 drop-shadow-sm ${((icon as React.ReactElement).props as { className?: string }).className || ''}` })
                        : icon}
                </div>
                
                {badge && (
                    <Badge color={badge.color} className="flex items-center gap-1 scale-90 md:scale-100 origin-top-right shadow-sm backdrop-blur-md bg-white/80 dark:bg-black/20 relative z-20">
                        {badge.icon}
                        {badge.text}
                    </Badge>
                )}
            </div>

            <div className="relative z-10 mt-4 md:mt-5 min-w-0">
                <span className="text-[11px] md:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block truncate group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                    {title}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                   <h4 className="font-black text-gray-900 text-xl md:text-3xl dark:text-white truncate tracking-tight drop-shadow-sm">
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
