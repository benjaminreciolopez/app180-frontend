import React from 'react';

interface LoadingSpinnerProps {
    className?: string;
    fullPage?: boolean;
    showText?: boolean;
    size?: "sm" | "md" | "lg";
}

export const LoadingSpinner = ({
    className = "",
    fullPage = false,
    showText = true,
    size = "md"
}: LoadingSpinnerProps) => {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-10 w-10 border-2",
        lg: "h-16 w-16 border-4"
    };

    const spinner = (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <div className={`animate-spin rounded-full border-b-primary ${sizeClasses[size]}`}></div>
            {showText && <p className="text-sm font-medium text-gray-500 animate-pulse">Cargando datos...</p>}
        </div>
    );

    if (fullPage) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] w-full">
                {spinner}
            </div>
        );
    }

    return spinner;
};
