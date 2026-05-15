import type { ReactElement } from "react";

export type FlowerVisualProps = {
  x: number;
  y: number;
  size: number;
  active: boolean;
  gid: string;
  c1: string;
  c2: string;
  label?: string | number;
};

export type FlowerRenderer = (props: FlowerVisualProps) => ReactElement;
