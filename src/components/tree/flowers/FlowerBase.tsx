import type { FlowerVisualProps } from "./types";

type FlowerBaseProps = FlowerVisualProps & {
  petals: Array<{ angle: number; rx: number; ry: number; cy: number }>;
  innerR?: number;
  centerColor?: string;
};

export function FlowerBase({
  x,
  y,
  size,
  active,
  gid,
  c1,
  c2,
  petals,
  innerR = 0.11,
  centerColor = "#fff9c4",
}: FlowerBaseProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <defs>
        <radialGradient id={gid} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="55%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </radialGradient>
      </defs>
      {petals.map((petal, idx) => (
        <ellipse
          key={`${gid}-${idx}`}
          transform={`rotate(${petal.angle})`}
          cx="0"
          cy={petal.cy * size}
          rx={petal.rx * size}
          ry={petal.ry * size}
          fill={`url(#${gid})`}
          opacity="0.93"
        />
      ))}
      <circle r={size * innerR} fill={centerColor} />
      <circle r={size * 0.07} fill="#fdd835" opacity="0.95" />
      {active ? (
        <circle
          r={size * 0.45}
          fill="none"
          stroke={c1}
          strokeWidth="1.6"
          opacity="0.72"
        />
      ) : null}
    </g>
  );
}
