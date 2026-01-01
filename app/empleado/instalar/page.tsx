import InstalarCliente from "./InstalarCliente";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return <InstalarCliente token={params.token} />;
}
