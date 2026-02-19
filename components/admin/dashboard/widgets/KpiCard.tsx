
import { Users, Clock, AlertTriangle, Calendar, UserCheck, Euro, ClipboardList, RefreshCw, Briefcase, LayoutGrid, LucideIcon } from "lucide-react";
import Link from "next/link";

interface KpiCardProps {
    label: string;
    value: string | number | React.ReactNode;
    subtext?: string;
    icon: LucideIcon;
    colorClass: string;
    href?: string;
    action?: React.ReactNode;
}

export function KpiCard({ label, value, subtext, icon: Icon, colorClass, href, action }: KpiCardProps) {
    const colorMap: Record<string, { bg: string, text: string }> = {
        blue: { bg: "bg-blue-50", text: "text-blue-600" },
        green: { bg: "bg-green-50", text: "text-green-600" },
        red: { bg: "bg-red-50", text: "text-red-600" },
        purple: { bg: "bg-purple-50", text: "text-purple-600" },
        indigo: { bg: "bg-indigo-50", text: "text-indigo-600" },
        emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
        orange: { bg: "bg-orange-50", text: "text-orange-600" },
        gray: { bg: "bg-gray-50", text: "text-gray-400" },
    };

    const colors = colorMap[colorClass] || colorMap.gray;

    const content = (
        <div className="flex items-center justify-between h-full">
            <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">{label}</p>
                <div className="text-2xl md:text-3xl font-bold mt-1">{value}</div>
                {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-2 md:p-3 rounded-lg ${colors.bg}`}>
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${colors.text}`} />
            </div>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow block h-full">
                {content}
            </Link>
        );
    }

    return (
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow h-full relative">
            {content}
            {action && <div className="absolute top-4 right-14">{action}</div>}
        </div>
    );
}
