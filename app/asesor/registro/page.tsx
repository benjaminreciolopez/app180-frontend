"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  ArrowRight,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://app180-backend.onrender.com";

type FormData = {
  nombre: string;
  cif: string;
  email_contacto: string;
  telefono: string;
  direccion: string;
  user_nombre: string;
  user_email: string;
  user_password: string;
};

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Debil", color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Regular", color: "bg-orange-500" };
  if (score <= 3) return { score: 3, label: "Buena", color: "bg-yellow-500" };
  if (score <= 4) return { score: 4, label: "Fuerte", color: "bg-green-500" };
  return { score: 5, label: "Muy fuerte", color: "bg-emerald-500" };
}

export default function AsesorRegistroPage() {
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    cif: "",
    email_contacto: "",
    telefono: "",
    direccion: "",
    user_nombre: "",
    user_email: "",
    user_password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function updateField(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (error) setError("");
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      errors.nombre = "El nombre de la asesoria es obligatorio";
    }
    if (!formData.email_contacto.trim()) {
      errors.email_contacto = "El email de contacto es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_contacto)) {
      errors.email_contacto = "El email de contacto no es valido";
    }
    if (formData.cif && !/^[A-Z]\d{7}[A-Z0-9]$/i.test(formData.cif.trim())) {
      errors.cif = "El CIF no tiene un formato valido (ej: B12345678)";
    }
    if (!formData.user_nombre.trim()) {
      errors.user_nombre = "Tu nombre es obligatorio";
    }
    if (!formData.user_email.trim()) {
      errors.user_email = "Tu email es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.user_email)) {
      errors.user_email = "El email no es valido";
    }
    if (!formData.user_password) {
      errors.user_password = "La contrasena es obligatoria";
    } else if (formData.user_password.length < 6) {
      errors.user_password = "La contrasena debe tener al menos 6 caracteres";
    }
    if (formData.user_password !== confirmPassword) {
      errors.confirmPassword = "Las contrasenas no coinciden";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    setError("");

    try {
      const body: Record<string, string> = {
        nombre: formData.nombre.trim(),
        email_contacto: formData.email_contacto.trim(),
        user_nombre: formData.user_nombre.trim(),
        user_email: formData.user_email.trim(),
        user_password: formData.user_password,
      };
      if (formData.cif.trim()) body.cif = formData.cif.trim().toUpperCase();
      if (formData.telefono.trim()) body.telefono = formData.telefono.trim();
      if (formData.direccion.trim()) body.direccion = formData.direccion.trim();

      const res = await fetch(`${API_BASE}/asesor/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.message || "Error al registrar la asesoria");
        setLoading(false);
        return;
      }

      // Success: store token and user, redirect to dashboard
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/asesor/dashboard";
    } catch (err: any) {
      setError("Error de conexion. Intentalo de nuevo.");
      setLoading(false);
    }
  }

  const passwordStrength = formData.user_password
    ? getPasswordStrength(formData.user_password)
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 p-4">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 bg-card rounded-2xl px-8 py-6 shadow-lg border">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">
              Registrando asesoria...
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg">
        {/* Branding */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            CONTENDO
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro de Asesoria
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-card">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error global */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Section 1: Datos de la asesoria */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Datos de la asesoria
                  </h2>
                </div>

                {/* Nombre */}
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">
                    Nombre de la asesoria <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="nombre"
                      placeholder="Asesoria Fiscal Garcia SL"
                      value={formData.nombre}
                      onChange={(e) => updateField("nombre", e.target.value)}
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                  {fieldErrors.nombre && (
                    <p className="text-xs text-destructive">{fieldErrors.nombre}</p>
                  )}
                </div>

                {/* CIF */}
                <div className="space-y-1.5">
                  <Label htmlFor="cif">CIF</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="cif"
                      placeholder="B12345678"
                      value={formData.cif}
                      onChange={(e) => updateField("cif", e.target.value)}
                      className="pl-9 uppercase"
                      maxLength={9}
                      disabled={loading}
                    />
                  </div>
                  {fieldErrors.cif && (
                    <p className="text-xs text-destructive">{fieldErrors.cif}</p>
                  )}
                </div>

                {/* Email de contacto */}
                <div className="space-y-1.5">
                  <Label htmlFor="email_contacto">
                    Email de contacto <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email_contacto"
                      type="email"
                      placeholder="info@asesoria.com"
                      value={formData.email_contacto}
                      onChange={(e) => updateField("email_contacto", e.target.value)}
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                  {fieldErrors.email_contacto && (
                    <p className="text-xs text-destructive">
                      {fieldErrors.email_contacto}
                    </p>
                  )}
                </div>

                {/* Telefono */}
                <div className="space-y-1.5">
                  <Label htmlFor="telefono">Telefono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="telefono"
                      type="tel"
                      placeholder="912345678"
                      value={formData.telefono}
                      onChange={(e) => updateField("telefono", e.target.value)}
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Direccion */}
                <div className="space-y-1.5">
                  <Label htmlFor="direccion">Direccion</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="direccion"
                      placeholder="Calle Mayor 1, Madrid"
                      value={formData.direccion}
                      onChange={(e) => updateField("direccion", e.target.value)}
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Tu cuenta de usuario */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <User className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Tu cuenta de usuario
                  </h2>
                </div>

                {/* Nombre completo */}
                <div className="space-y-1.5">
                  <Label htmlFor="user_nombre">
                    Nombre completo <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="user_nombre"
                      placeholder="Juan Garcia"
                      value={formData.user_nombre}
                      onChange={(e) => updateField("user_nombre", e.target.value)}
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                  {fieldErrors.user_nombre && (
                    <p className="text-xs text-destructive">
                      {fieldErrors.user_nombre}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="user_email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="user_email"
                      type="email"
                      placeholder="juan@asesoria.com"
                      value={formData.user_email}
                      onChange={(e) => updateField("user_email", e.target.value)}
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                  {fieldErrors.user_email && (
                    <p className="text-xs text-destructive">
                      {fieldErrors.user_email}
                    </p>
                  )}
                </div>

                {/* Contrasena */}
                <div className="space-y-1.5">
                  <Label htmlFor="user_password">
                    Contrasena <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="user_password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimo 6 caracteres"
                      value={formData.user_password}
                      onChange={(e) => updateField("user_password", e.target.value)}
                      className="pl-9 pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.user_password && (
                    <p className="text-xs text-destructive">
                      {fieldErrors.user_password}
                    </p>
                  )}
                  {/* Password strength indicator */}
                  {passwordStrength && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              level <= passwordStrength.score
                                ? passwordStrength.color
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Seguridad: {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirmar contrasena */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">
                    Confirmar contrasena <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repite la contrasena"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.confirmPassword;
                            return next;
                          });
                        }
                      }}
                      className="pl-9 pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                  {/* Match indicator */}
                  {confirmPassword && formData.user_password && !fieldErrors.confirmPassword && (
                    <div className="flex items-center gap-1">
                      {confirmPassword === formData.user_password ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          <p className="text-[11px] text-green-600 dark:text-green-400">
                            Las contrasenas coinciden
                          </p>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                          <p className="text-[11px] text-destructive">
                            Las contrasenas no coinciden
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full py-5 text-base font-bold shadow-md hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    Crear cuenta de asesoria
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              {/* Link to login */}
              <p className="text-sm text-center text-muted-foreground">
                Ya tienes cuenta?{" "}
                <Link
                  href="/login"
                  className="text-primary font-medium hover:underline"
                >
                  Iniciar sesion
                </Link>
              </p>

              {/* Terms */}
              <p className="text-xs text-center text-muted-foreground">
                Al registrarte, aceptas los{" "}
                <a
                  href="/terminos"
                  className="underline hover:text-foreground transition-colors"
                >
                  terminos de servicio
                </a>{" "}
                y la{" "}
                <a
                  href="/privacidad"
                  className="underline hover:text-foreground transition-colors"
                >
                  politica de privacidad
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
