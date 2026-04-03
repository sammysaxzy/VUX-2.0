import type { FibreCable, FibreCore } from "@/types";

type BufferGroup = {
  id: string;
  label: string;
  cores: FibreCore[];
  used: number;
  free: number;
  faulty: number;
};

const BUFFER_SIZE = 12;
const BUFFER_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const buildLabel = (index: number) => `Buffer ${BUFFER_LABELS[index] ?? String(index + 1)}`;

export const buildBufferGroups = (cable: FibreCable): BufferGroup[] => {
  const cores = cable.cores ?? [];
  if (cores.length === 0) return [];

  const groups: BufferGroup[] = [];
  for (let i = 0; i < cores.length; i += BUFFER_SIZE) {
    const slice = cores.slice(i, i + BUFFER_SIZE);
    const used = slice.filter((core) => core.status === "used").length;
    const faulty = slice.filter((core) => core.status === "faulty").length;
    const free = slice.length - used - faulty;
    groups.push({
      id: `${cable.id}-buffer-${i / BUFFER_SIZE + 1}`,
      label: buildLabel(i / BUFFER_SIZE),
      cores: slice,
      used,
      free,
      faulty,
    });
  }
  return groups;
};
