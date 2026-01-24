import { redirect } from "next/navigation";

async function getStatus() {
  const res = await fetch("https://app180-backend.onrender.com/system/status", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Error consultando estado del sistema");
  }

  return res.json();
}

export default async function LoginPage() {
  const status = await getStatus();

  // 👉 Si NO está inicializado → setup
  if (status.bootstrap === true) {
    redirect("/setup");
  }

  // 👉 Si está OK → cargar login client
  const LoginClient = (await import("./LoginClient")).default;

  return <LoginClient />;
}
