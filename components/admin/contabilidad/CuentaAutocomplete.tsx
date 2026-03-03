"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { authenticatedFetch } from "@/utils/api";

interface Cuenta {
    codigo: string;
    nombre: string;
}

interface CuentaAutocompleteProps {
    codigoValue: string;
    nombreValue: string;
    onSelect: (codigo: string, nombre: string) => void;
    placeholder?: string;
    className?: string;
}

export default function CuentaAutocomplete({
    codigoValue,
    nombreValue,
    onSelect,
    placeholder = "4300",
    className = "",
}: CuentaAutocompleteProps) {
    const [query, setQuery] = useState(codigoValue);
    const [results, setResults] = useState<Cuenta[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searching, setSearching] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const skipSearchRef = useRef(false);

    // Sync external codigoValue changes
    useEffect(() => {
        setQuery(codigoValue);
    }, [codigoValue]);

    // Debounced search
    useEffect(() => {
        if (skipSearchRef.current) {
            skipSearchRef.current = false;
            return;
        }
        if (query.length < 1) {
            setResults([]);
            setShowDropdown(false);
            return;
        }
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await authenticatedFetch(
                    `/api/admin/contabilidad/cuentas?search=${encodeURIComponent(query)}`
                );
                if (res.ok) {
                    const data = await res.json();
                    const list: Cuenta[] = Array.isArray(data) ? data : data.cuentas || [];
                    setResults(list.slice(0, 15));
                    setShowDropdown(list.length > 0);
                }
            } catch {
                // ignore
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSelect = useCallback(
        (cuenta: Cuenta) => {
            skipSearchRef.current = true;
            setQuery(cuenta.codigo);
            setShowDropdown(false);
            onSelect(cuenta.codigo, cuenta.nombre);
        },
        [onSelect]
    );

    // On blur: if code changed and no selection was made, try to resolve name
    const handleBlur = useCallback(async () => {
        // Small delay to allow click events on dropdown items
        setTimeout(async () => {
            setShowDropdown(false);
            if (query && query !== codigoValue) {
                // User typed a code manually without selecting - try to find the account
                try {
                    const res = await authenticatedFetch(
                        `/api/admin/contabilidad/cuentas?search=${encodeURIComponent(query)}`
                    );
                    if (res.ok) {
                        const data = await res.json();
                        const list: Cuenta[] = Array.isArray(data) ? data : data.cuentas || [];
                        const exact = list.find((c) => c.codigo === query);
                        if (exact) {
                            onSelect(exact.codigo, exact.nombre);
                        } else {
                            onSelect(query, nombreValue);
                        }
                    }
                } catch {
                    onSelect(query, nombreValue);
                }
            } else if (query && query === codigoValue) {
                // No change
            } else if (!query) {
                onSelect("", "");
            }
        }, 200);
    }, [query, codigoValue, nombreValue, onSelect]);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="flex gap-1">
                <Input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onSelect(e.target.value, nombreValue);
                    }}
                    onFocus={() => {
                        if (results.length > 0) setShowDropdown(true);
                    }}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    className="h-8 rounded-lg text-xs bg-white w-[90px] font-mono"
                />
                <Input
                    value={nombreValue}
                    onChange={(e) => onSelect(codigoValue, e.target.value)}
                    placeholder="Nombre cuenta"
                    className="h-8 rounded-lg text-xs bg-white flex-1"
                />
            </div>
            {showDropdown && results.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {results.map((cuenta) => (
                        <button
                            key={cuenta.codigo}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex gap-2 items-baseline border-b border-slate-50 last:border-0"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(cuenta);
                            }}
                        >
                            <span className="font-mono font-medium text-slate-700 shrink-0">
                                {cuenta.codigo}
                            </span>
                            <span className="text-slate-500 truncate">{cuenta.nombre}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
