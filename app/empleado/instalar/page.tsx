export const dynamic = "force-dynamic";
export const revalidate = 0; // sin cache

import InstalarCliente from "./InstalarCliente";

export default function Page({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return <InstalarCliente token={searchParams?.token} />;
}
