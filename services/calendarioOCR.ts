import { api } from "@/services/api";

export async function ocrPreview(files: File[]) {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);

  const res = await api.post("/admin/calendario/ocr/preview", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}

export async function ocrConfirm(items: any[]) {
  const res = await api.post("/admin/calendario/ocr/confirmar", { items });
  return res.data;
}
